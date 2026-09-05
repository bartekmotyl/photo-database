from __future__ import annotations

from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
VENDOR_DIR = PROJECT_DIR / "vendor" / "ArtiMuse"
CHECKPOINT_DIR = PROJECT_DIR / "checkpoints" / "ArtiMuse"
LOCAL_DIR = PROJECT_DIR / "local"

ARTIMUSE_REPO = "https://github.com/thunderbolt215/ArtiMuse.git"
ARTIMUSE_HF_MODEL = "Thunderbolt215215/ArtiMuse"
