from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path
from typing import Any

from .api_client import PhotoDbClient
from .config import load_config
from .models import ImageInput, LabelingError
from .prompting import build_output_schema, build_prompt, parse_label_result
from .providers import create_provider


def date_arg(value: str) -> str:
    """Validate a yyyy-mm-dd argument. The API silently ignores unparseable
    date params (e.g. 2021-02-31), which would make the run process far more
    photos than intended - so fail fast here instead."""
    if value == "":
        return value
    try:
        date.fromisoformat(value)
    except ValueError as e:
        raise argparse.ArgumentTypeError(f"not a valid date (expected yyyy-mm-dd): {value!r}") from e
    return value


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Label PhotoDB photos with a vision LLM (description + tags)."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "config.yaml",
        help="path to config.yaml (prompt/tags files are resolved relative to it)",
    )
    parser.add_argument("--date-from", type=date_arg, default="", help="only photos taken on/after this date (yyyy-mm-dd)")
    parser.add_argument("--date-to", type=date_arg, default="", help="only photos taken on/before this date (yyyy-mm-dd)")
    parser.add_argument("--limit", type=int, default=None, help="max photos to process (overrides config)")
    parser.add_argument("--relabel", action="store_true", help="also process photos already marked as labelled")
    parser.add_argument("--dry-run", action="store_true", help="query the model but do not write back to the database")
    args = parser.parse_args()

    config = load_config(args.config)
    limit = args.limit if args.limit is not None else config.labeling.limit
    skip_labelled = config.labeling.skip_labelled and not args.relabel

    prompt = build_prompt(config.prompt, config.tags)
    schema = build_output_schema(config.tags)
    provider = create_provider(config.provider)
    client = PhotoDbClient(config.api.base_url)

    marker_tag = config.labeling.marker_tag.strip()
    if marker_tag and any(t.name == marker_tag for t in config.tags):
        print(f"error: marker tag {marker_tag!r} must not appear in the tags file")
        return 1

    def is_labelled(photo: dict[str, Any]) -> bool:
        if marker_tag:
            tags = [t.strip() for t in (photo.get("tags") or "").split(",")]
            return marker_tag in tags
        return bool((photo.get("contentDescription") or "").strip())

    photos = client.search(date_from=args.date_from, date_to=args.date_to)
    photos.sort(key=lambda p: (p["referenceDate"], p["id"]))
    if skip_labelled:
        unlabelled = [p for p in photos if not is_labelled(p)]
        print(f"{len(photos)} photos in scope, {len(unlabelled)} not yet labelled")
        photos = unlabelled
    else:
        print(f"{len(photos)} photos in scope")
    if limit > 0:
        photos = photos[:limit]

    print(f"labeling {len(photos)} photos with {config.provider.model}"
          + (" (dry run)" if args.dry_run else ""))

    failed = 0
    for index, photo in enumerate(photos, start=1):
        photo_id = photo["id"]
        print(f"[{index}/{len(photos)}] photo {photo_id} ({photo['fileName']}, {photo['referenceDate']})")
        try:
            thumbnail = client.thumbnail(photo_id)
            raw = provider.label([ImageInput(data=thumbnail)], prompt, schema)
            result = parse_label_result(raw, config.tags)
        except LabelingError as e:
            failed += 1
            print(f"    SKIPPED: {e}")
            continue

        print(f"    description: {result.description}")
        print(f"    tags: {', '.join(result.tags) if result.tags else '(none)'}")

        if not args.dry_run:
            client.update_description(photo_id, result.description)
            # The marker tag goes last so a crash in between never leaves a
            # photo marked as labelled without its labels saved.
            tags_to_add = result.tags + ([marker_tag] if marker_tag else [])
            if tags_to_add:
                client.add_tags(photo_id, tags_to_add)

    print(f"done: {len(photos) - failed} labelled, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
