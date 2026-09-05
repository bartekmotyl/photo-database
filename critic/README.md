# PhotoDB Critic (ArtiMuse)

Writes an expert-level aesthetic critique into **aesthetic slot 1** for
photos that the fast predictor (slot 0) rated above a threshold: an
ArtiMuse score on a **0-100 scale** plus a textual analysis stored in
`AestheticScoreDescription1` (prefixed `artimuse`, which doubles as the
resume marker).

This is a separate uv project from `labeler/` because ArtiMuse pins old
dependencies (`transformers==4.37.2`, `numpy==1.26.4`) that would conflict
with the labeler's environment.

## Setup

```bash
cd critic
uv sync
uv run photo-critic-setup   # clones the ArtiMuse repo + downloads the ~16GB checkpoint
```

Model: [ArtiMuse](https://github.com/thunderbolt215/ArtiMuse) (CVPR 2026),
an InternVL3-8B fine-tune; weights are Apache-2.0 on
[Hugging Face](https://huggingface.co/Thunderbolt215215/ArtiMuse). Runs
locally on CUDA or Apple Silicon (MPS, ~17GB memory in bf16; FlashAttention
is only used on CUDA).

## Usage

```bash
# dry run without the model - check the selection numbers
uv run photo-critic --stub --date-from 2026-01-01 --date-to 2026-12-31 --limit 3

# real critique, dry run (cached to local/critiques.jsonl, DB untouched)
uv run photo-critic --date-from 2026-01-01 --date-to 2026-12-31 --limit 5

# write critiques (cached + newly computed) to the database, slot 1
uv run photo-critic --date-from 2026-01-01 --date-to 2026-12-31 --write
```

- Selection: slot-0 score ≥ `--min-score` (default from [config.yaml](config.yaml),
  1-10 scale) within the date range, minus photos already critiqued
  (slot-1 marker in the DB) or already in the local cache. Processed
  best-slot-0-score first.
- Critiques accumulate in `local/critiques.jsonl` (resumable) and a
  browsable `local/report.html`; `--write` pushes them to the database.
- `config.yaml` also selects which of ArtiMuse's 8 aesthetic aspects to
  generate; default is `Comprehensive Evaluation` only (each extra aspect
  costs another generation round per photo - significant on MPS).

## Development

```bash
uv run mypy
```
