"""Critique PhotoDB photos with ArtiMuse into aesthetic slot 1.

Selection: photos in the date range whose slot-0 score (fast predictor)
is at least --min-score, not yet critiqued (slot-1 description marker).
Critiques are cached in a JSONL file (resumable); the database is only
touched with --write.
"""

from __future__ import annotations

import argparse
import html
import io
import json
import sys
from datetime import date
from pathlib import Path
from typing import Any

import yaml
from PIL import Image

from .api_client import PhotoDbClient
from .paths import LOCAL_DIR

# Slot-1 description prefix: provenance + DB-side resume marker.
MARKER = "artimuse"
SLOT = 1
WRITE_CHUNK = 50


def date_arg(value: str) -> str:
    if value == "":
        return value
    try:
        date.fromisoformat(value)
    except ValueError as e:
        raise argparse.ArgumentTypeError(f"not a valid date (expected yyyy-mm-dd): {value!r}") from e
    return value


def pick_device() -> str:
    import torch

    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_cache(path: Path) -> dict[int, dict[str, Any]]:
    cache: dict[int, dict[str, Any]] = {}
    if path.exists():
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    entry = json.loads(line)
                    cache[int(entry["id"])] = entry
    return cache


def format_description(entry: dict[str, Any]) -> str:
    parts = [f"{MARKER}: score {entry['score']:.0f}/100"]
    for aspect, text in entry["analysis"].items():
        parts.append(f"[{aspect}] {text}")
    return "\n".join(parts)


def make_update(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "photoId": entry["id"],
        "slot": SLOT,
        "score": round(entry["score"]),
        "scoreDescription": format_description(entry),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Critique high-scoring PhotoDB photos with ArtiMuse (slot 1)."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "config.yaml",
    )
    parser.add_argument("--date-from", type=date_arg, default="", help="yyyy-mm-dd")
    parser.add_argument("--date-to", type=date_arg, default="", help="yyyy-mm-dd")
    parser.add_argument("--min-score", type=float, default=None,
                        help="slot-0 threshold on the 1-10 scale (default from config)")
    parser.add_argument("--limit", type=int, default=0, help="max photos to critique this run (0 = no limit)")
    parser.add_argument("--device", default="", help="torch device (default: auto)")
    parser.add_argument("--write", action="store_true",
                        help=f"write critiques to the database (slot {SLOT}); off = dry run")
    parser.add_argument("--stub", action="store_true",
                        help="use a stub instead of the real model (pipeline test; implies no writes)")
    parser.add_argument("--push-only", action="store_true",
                        help="skip critiquing; only push already-cached critiques (with --write)")
    args = parser.parse_args()

    with open(args.config, encoding="utf-8") as f:
        config = yaml.safe_load(f)
    base_url: str = config["api"]["base_url"]
    min_score: float = args.min_score if args.min_score is not None else config["critique"]["min_score"]
    attributes: list[str] = config["critique"]["attributes"]
    max_new_tokens: int = config["critique"]["max_new_tokens"]
    if args.stub and args.write:
        print("error: --stub cannot be combined with --write")
        return 1

    client = PhotoDbClient(base_url)
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    # Stub results must never mix with real critiques (--write pushes the cache).
    cache_path = LOCAL_DIR / ("critiques-stub.jsonl" if args.stub else "critiques.jsonl")
    cache = load_cache(cache_path)

    photos = client.search(date_from=args.date_from, date_to=args.date_to)
    eligible = [
        p for p in photos
        if p.get("aestheticScore0") is not None and p["aestheticScore0"] >= min_score * 10
    ]
    # Best first - the most promising critiques arrive earliest.
    eligible.sort(key=lambda p: (-p["aestheticScore0"], p["id"]))

    in_db = {
        p["id"] for p in eligible
        if (p.get("aestheticScoreDescription1") or "").startswith(MARKER)
    }
    todo = [p for p in eligible if p["id"] not in in_db and p["id"] not in cache]
    print(
        f"{len(photos)} photos in range, {len(eligible)} with slot-0 score >= {min_score:.1f}, "
        f"{len(in_db)} already critiqued in DB, {len(cache)} cached locally, {len(todo)} to critique"
    )
    if args.limit > 0:
        todo = todo[: args.limit]
    if args.push_only:
        todo = []

    if todo:
        if args.stub:
            from .artimuse import StubCritic

            critic: Any = StubCritic()
        else:
            from .artimuse import ArtiMuseCritic

            critic = ArtiMuseCritic(device=args.device or pick_device(), max_new_tokens=max_new_tokens)

        with open(cache_path, "a", encoding="utf-8") as cache_file:
            for index, photo in enumerate(todo, start=1):
                image = Image.open(io.BytesIO(client.thumbnail(photo["id"])))
                result = critic.critique(image, attributes)
                entry = {
                    "id": photo["id"],
                    "fileName": photo["fileName"],
                    "referenceDate": photo["referenceDate"],
                    "slot0": photo["aestheticScore0"],
                    "score": result.score,
                    "analysis": result.analysis,
                }
                cache_file.write(json.dumps(entry, ensure_ascii=False) + "\n")
                cache_file.flush()
                cache[photo["id"]] = entry
                if args.write:
                    # Write immediately - long runs are routinely interrupted,
                    # and a deferred bulk write would lose nothing but would
                    # leave the DB empty until the very end.
                    client.update_aesthetic_scores([make_update(entry)])
                    in_db.add(photo["id"])
                print(f"[{index}/{len(todo)}] photo {photo['id']} ({photo['fileName']}): "
                      f"artimuse {result.score:.0f}/100 (slot0 {photo['aestheticScore0'] / 10:.1f})")
                for aspect, text in result.analysis.items():
                    print(f"    [{aspect}] {text}")

    if args.write:
        # Catch-up push: cached critiques from earlier runs that never
        # reached the database (e.g. interrupted runs without --write).
        eligible_ids = {p["id"] for p in eligible}
        to_write = [
            make_update(entry)
            for pid, entry in cache.items()
            if pid in eligible_ids and pid not in in_db
        ]
        print(f"writing {len(to_write)} critiques to the database (slot {SLOT})")
        for start in range(0, len(to_write), WRITE_CHUNK):
            client.update_aesthetic_scores(to_write[start : start + WRITE_CHUNK])
            print(f"  written {min(start + WRITE_CHUNK, len(to_write))}/{len(to_write)}")
    else:
        print("dry run - nothing written to the database (use --write to persist)")

    write_report(LOCAL_DIR / "report.html", cache, base_url)
    return 0


def write_report(report_path: Path, cache: dict[int, dict[str, Any]], base_url: str) -> None:
    if not cache:
        return
    entries = sorted(cache.values(), key=lambda e: float(e["score"]), reverse=True)
    cards = []
    for e in entries:
        analysis_html = "".join(
            f"<p><b>{html.escape(aspect)}</b>: {html.escape(text)}</p>"
            for aspect, text in e["analysis"].items()
        )
        cards.append(f"""
        <div class="card">
          <a href="{base_url}/photos/full/{e['id']}" target="_blank">
            <img loading="lazy" src="{base_url}/photos/thumbnail/{e['id']}"></a>
          <div class="body">
            <div class="meta"><span class="score">{e['score']:.0f}/100</span>
              <span>slot0 {e['slot0'] / 10:.1f} · {e['referenceDate'][:10]} · #{e['id']}</span></div>
            {analysis_html}
          </div>
        </div>""")
    page = REPORT_TEMPLATE.replace("__COUNT__", str(len(entries))).replace("__CARDS__", "\n".join(cards))
    report_path.write_text(page, encoding="utf-8")
    print(f"report: {report_path} ({len(entries)} critiques)")


REPORT_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ArtiMuse critiques</title>
<style>
  body { margin: 0; font-family: -apple-system, system-ui, sans-serif; background: #111; color: #ddd; }
  header { padding: 14px 20px; background: #1b1b1b; border-bottom: 1px solid #333; font-size: 15px; font-weight: 600; }
  .card { display: flex; gap: 16px; margin: 14px 20px; background: #1c1c1c; border-radius: 10px; overflow: hidden; }
  .card img { width: 320px; height: 240px; object-fit: cover; display: block; flex-shrink: 0; }
  .body { padding: 10px 16px 10px 0; font-size: 13px; line-height: 1.5; color: #bbb; }
  .meta { font-size: 12px; color: #888; margin-bottom: 6px; }
  .score { font-weight: 700; color: #6ee76e; font-size: 14px; margin-right: 8px; }
  p { margin: 6px 0; }
  b { color: #ddd; }
</style>
</head>
<body>
<header>ArtiMuse critiques (__COUNT__)</header>
__CARDS__
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(main())
