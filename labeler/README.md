# PhotoDB AI Labeler

Labels photos in PhotoDB with a vision LLM: for each photo it generates a
short content description and assigns tags from a predefined list, then
saves both back through the PhotoDB Web API.

## How it works

1. Fetches photos via `GET /Photos/Search` (optionally scoped by date range),
   ordered by reference date.
2. Skips photos that already have a content description (this is what makes
   runs resumable; use `--relabel` to re-process).
3. Downloads each photo's thumbnail, sends it to the configured vision model
   together with the prompt and tag list, and expects a JSON object
   `{"description": ..., "tags": [...]}` back.
4. Validates the tags against the predefined list (unknown tags are dropped)
   and writes the results back via `PATCH /Photos/UpdateDescriptions` and
   `PATCH /Photos/AddTags`.

## Setup

The labeler is a [uv](https://docs.astral.sh/uv/) project (dependencies are
pinned in `uv.lock`):

```bash
cd labeler
uv sync
```

API keys go in the environment, never in config:

```bash
export ANTHROPIC_API_KEY=...   # for provider type: anthropic
export OPENAI_API_KEY=...      # for provider type: openai
# ollama needs no key, just a running ollama with a vision model pulled
```

## Usage

```bash
# experiment on a small sample first, without writing anything
uv run photo-labeler --limit 5 --dry-run

# label everything not yet labelled
uv run photo-labeler

# scope by date, re-label even already-described photos
uv run photo-labeler --date-from 2024-07-01 --date-to 2024-07-31 --relabel
```

## Development

The code is fully type-annotated and checked with mypy in strict mode:

```bash
uv run mypy
```

## Configuration

Everything lives in [config.yaml](config.yaml) (pass a different file with
`--config`; the prompt and tags files are resolved relative to it):

- `api.base_url` - the PhotoDB Web API.
- `provider` - `anthropic`, `openai` or `ollama` plus the model name
  (`ollama` also takes `base_url`). Providers are behind a small interface
  ([providers/base.py](photo_labeler/providers/base.py)), so adding another
  backend means implementing one method.
- `prompt_file` - the free-form part of the prompt
  ([prompt.md](prompt.md)). The JSON output-format instructions are fixed in
  code ([prompting.py](photo_labeler/prompting.py)) and must stay in sync
  with the parser, so they are deliberately not configurable.
- `tags_file` - the predefined tags ([tags.yaml](tags.yaml)), each with a
  short description that goes into the prompt. The model may return any
  subset of them. Tag names must not contain commas.

Local models via Ollama example:

```yaml
provider:
  type: ollama
  model: qwen2.5vl
  base_url: http://localhost:11434
```

## Future ideas

- Reference images in the prompt (e.g. faces of known people, to fill the
  `People` field). The provider interface already accepts multiple images
  with per-image notes.
- Batch API for the big cloud providers (50% cheaper, not latency-sensitive).
