"""Aesthetic scoring of PhotoDB photos with Aesthetic Predictor V2.5 (SigLIP).

Report-only for now: scores are written to a CSV (resumable) and rendered
into a self-contained HTML review page; nothing is written to the database.
Requires the optional dependencies: uv sync --group scoring
"""

from __future__ import annotations

import argparse
import csv
import html
import io
import json
import sys
from pathlib import Path
from typing import Any

from .api_client import PhotoDbClient
from .config import load_config
from .main import date_arg

BATCH_DEFAULT = 16

# Written into AestheticScoreDescription0 - marks a photo as scored by this
# model (the DB-side resume marker, like the labeler's ai-labeled tag).
MARKER = "aesthetic-predictor-v2-5"
SLOT = 0
WRITE_CHUNK = 200


def pick_device() -> str:
    import torch

    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_scores(csv_path: Path) -> dict[int, float]:
    scores: dict[int, float] = {}
    if csv_path.exists():
        with open(csv_path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                scores[int(row["id"])] = float(row["score"])
    return scores


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Score PhotoDB photos with Aesthetic Predictor V2.5 and build an HTML review page."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "config.yaml",
        help="labeler config.yaml (only api.base_url is used)",
    )
    parser.add_argument("--date-from", type=date_arg, default="", help="only photos taken on/after this date (yyyy-mm-dd)")
    parser.add_argument("--date-to", type=date_arg, default="", help="only photos taken on/before this date (yyyy-mm-dd)")
    parser.add_argument("--limit", type=int, default=0, help="max photos to score this run (0 = no limit)")
    parser.add_argument("--batch-size", type=int, default=BATCH_DEFAULT)
    parser.add_argument("--device", default="", help="torch device (default: auto - cuda/mps/cpu)")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "local" / "score-report",
        help="output directory for scores.csv and report.html",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help=f"write scores to the database (slot {SLOT}, score x10 as integer)",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    client = PhotoDbClient(config.api.base_url)
    args.out.mkdir(parents=True, exist_ok=True)
    csv_path = args.out / "scores.csv"

    photos = client.search(date_from=args.date_from, date_to=args.date_to, extended=True)
    photos.sort(key=lambda p: (p["referenceDate"], p["id"]))
    by_id = {p["id"]: p for p in photos}

    scores = load_scores(csv_path)
    # Photos already scored in the database (e.g. from a run on another
    # machine) count as done; their scores also backfill the report.
    in_db = set()
    for p in photos:
        if (p.get("aestheticScoreDescription0") or "") == MARKER and p.get("aestheticScore0") is not None:
            in_db.add(p["id"])
            scores.setdefault(p["id"], p["aestheticScore0"] / 10)

    todo = [p for p in photos if p["id"] not in scores]
    already = sum(1 for p in photos if p["id"] in scores)
    print(f"{len(photos)} photos in scope, {already} already scored, {len(todo)} to score")
    if args.limit > 0:
        todo = todo[: args.limit]

    if todo:
        score_photos(todo, client, csv_path, args.batch_size, args.device or pick_device())
        scores = load_scores(csv_path)
        for pid in in_db:
            scores.setdefault(pid, by_id[pid]["aestheticScore0"] / 10)

    scored_in_scope = {pid: s for pid, s in scores.items() if pid in by_id}

    if args.write:
        to_write = [
            {"photoId": pid, "slot": SLOT, "score": round(s * 10), "scoreDescription": MARKER}
            for pid, s in scored_in_scope.items()
            if pid not in in_db
        ]
        print(f"writing {len(to_write)} scores to the database (slot {SLOT})")
        for start in range(0, len(to_write), WRITE_CHUNK):
            client.update_aesthetic_scores(to_write[start : start + WRITE_CHUNK])
            print(f"  written {min(start + WRITE_CHUNK, len(to_write))}/{len(to_write)}")
    report_path = args.out / "report.html"
    write_report(report_path, scored_in_scope, by_id, config.api.base_url, args.date_from, args.date_to)
    print(f"report: {report_path} ({len(scored_in_scope)} photos)")
    return 0


def score_photos(
    todo: list[dict[str, Any]],
    client: PhotoDbClient,
    csv_path: Path,
    batch_size: int,
    device: str,
) -> None:
    import torch
    from aesthetic_predictor_v2_5 import convert_v2_5_from_siglip
    from PIL import Image

    print(f"loading model (device={device})...")
    model, preprocessor = convert_v2_5_from_siglip(low_cpu_mem_usage=True, trust_remote_code=True)
    dtype = torch.bfloat16 if device == "cuda" else torch.float32
    model = model.to(device=device, dtype=dtype)
    model.eval()

    new_file = not csv_path.exists()
    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if new_file:
            writer.writerow(["id", "fileName", "referenceDate", "score"])

        for start in range(0, len(todo), batch_size):
            batch = todo[start : start + batch_size]
            images = []
            for photo in batch:
                thumbnail = client.thumbnail(photo["id"])
                images.append(Image.open(io.BytesIO(thumbnail)).convert("RGB"))

            pixel_values = preprocessor(images=images, return_tensors="pt").pixel_values
            pixel_values = pixel_values.to(device=device, dtype=dtype)
            with torch.inference_mode():
                logits = model(pixel_values).logits.squeeze(-1).float().cpu()

            for photo, score in zip(batch, logits.tolist()):
                writer.writerow([photo["id"], photo["fileName"], photo["referenceDate"], f"{score:.3f}"])
            f.flush()
            done = min(start + batch_size, len(todo))
            print(f"  scored {done}/{len(todo)} (last batch avg {sum(logits.tolist()) / len(batch):.2f})")


def write_report(
    report_path: Path,
    scores: dict[int, float],
    by_id: dict[int, dict[str, Any]],
    base_url: str,
    date_from: str,
    date_to: str,
) -> None:
    entries = sorted(
        (
            {
                "id": pid,
                "score": round(score, 2),
                "file": by_id[pid]["fileName"],
                "date": by_id[pid]["referenceDate"][:10],
            }
            for pid, score in scores.items()
        ),
        key=lambda e: float(str(e["score"])),
        reverse=True,
    )
    scope = f"{date_from or 'beginning'} to {date_to or 'now'}"
    page = (
        REPORT_TEMPLATE.replace("__TITLE__", html.escape(f"Aesthetic scores {scope}"))
        .replace("__BASE_URL__", base_url)
        .replace("__DATA__", json.dumps(entries))
    )
    report_path.write_text(page, encoding="utf-8")


REPORT_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>__TITLE__</title>
<style>
  body { margin: 0; font-family: -apple-system, system-ui, sans-serif; background: #111; color: #ddd; }
  header { position: sticky; top: 0; background: #1b1b1b; padding: 12px 20px; display: flex;
           align-items: center; gap: 16px; border-bottom: 1px solid #333; z-index: 10; flex-wrap: wrap; }
  header h1 { font-size: 15px; margin: 0; font-weight: 600; }
  header label { font-size: 13px; color: #aaa; display: flex; align-items: center; gap: 8px; }
  input[type=range] { width: 240px; }
  #count { font-size: 13px; color: #aaa; }
  #grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; padding: 16px; }
  .card { background: #1c1c1c; border-radius: 8px; overflow: hidden; }
  .card img { width: 100%; height: 200px; object-fit: cover; display: block; }
  .meta { display: flex; justify-content: space-between; padding: 6px 9px; font-size: 12px; color: #999; }
  .score { font-weight: 700; color: #fff; }
  .score.high { color: #6ee76e; }
</style>
</head>
<body>
<header>
  <h1>__TITLE__</h1>
  <label>min score <input type="range" id="minScore" min="1" max="10" step="0.1" value="1">
    <span id="minScoreValue">1.0</span></label>
  <span id="count"></span>
</header>
<div id="grid"></div>
<script>
const BASE_URL = "__BASE_URL__";
const DATA = __DATA__;  // sorted by score, descending

const grid = document.getElementById("grid");
for (const e of DATA) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.score = e.score;
  card.innerHTML = `
    <a href="${BASE_URL}/photos/full/${e.id}" target="_blank">
      <img loading="lazy" src="${BASE_URL}/photos/thumbnail/${e.id}"></a>
    <div class="meta">
      <span class="score${e.score >= 5.5 ? " high" : ""}">${e.score.toFixed(2)}</span>
      <span>${e.date} · #${e.id}</span>
    </div>`;
  grid.appendChild(card);
}

const slider = document.getElementById("minScore");
const sliderValue = document.getElementById("minScoreValue");
const count = document.getElementById("count");
function applyFilter() {
  const min = parseFloat(slider.value);
  sliderValue.textContent = min.toFixed(1);
  let visible = 0;
  for (const card of grid.children) {
    const show = parseFloat(card.dataset.score) >= min;
    card.style.display = show ? "" : "none";
    if (show) visible++;
  }
  count.textContent = `${visible} of ${DATA.length} photos`;
}
slider.addEventListener("input", applyFilter);
applyFilter();
</script>
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(main())
