from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .api_client import PhotoDbClient
from .config import load_config
from .models import ImageInput, LabelingError
from .prompting import build_output_schema, build_prompt, parse_label_result
from .providers import create_provider


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
    parser.add_argument("--date-from", default="", help="only photos taken on/after this date (yyyy-mm-dd)")
    parser.add_argument("--date-to", default="", help="only photos taken on/before this date (yyyy-mm-dd)")
    parser.add_argument("--limit", type=int, default=None, help="max photos to process (overrides config)")
    parser.add_argument("--relabel", action="store_true", help="also process photos that already have a description")
    parser.add_argument("--dry-run", action="store_true", help="query the model but do not write back to the database")
    args = parser.parse_args()

    config = load_config(args.config)
    limit = args.limit if args.limit is not None else config.labeling.limit
    skip_labelled = config.labeling.skip_labelled and not args.relabel

    prompt = build_prompt(config.prompt, config.tags)
    schema = build_output_schema(config.tags)
    provider = create_provider(config.provider)
    client = PhotoDbClient(config.api.base_url)

    photos = client.search(date_from=args.date_from, date_to=args.date_to)
    photos.sort(key=lambda p: (p["referenceDate"], p["id"]))
    if skip_labelled:
        unlabelled = [p for p in photos if not (p.get("contentDescription") or "").strip()]
        print(f"{len(photos)} photos in scope, {len(unlabelled)} not yet labelled")
        photos = unlabelled
    else:
        print(f"{len(photos)} photos in scope")
    if limit > 0:
        photos = photos[:limit]

    print(f"labeling {len(photos)} photos with {config.provider.type}/{config.provider.model}"
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
            if result.tags:
                client.add_tags(photo_id, result.tags)

    print(f"done: {len(photos) - failed} labelled, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
