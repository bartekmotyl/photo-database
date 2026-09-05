"""One-time setup: clone the ArtiMuse repo (inference code) and download the
checkpoint (~16GB) from Hugging Face. Both land in gitignored directories."""

from __future__ import annotations

import subprocess
import sys

from .paths import ARTIMUSE_HF_MODEL, ARTIMUSE_REPO, CHECKPOINT_DIR, VENDOR_DIR


def main() -> int:
    if (VENDOR_DIR / "src").exists():
        print(f"repo already present: {VENDOR_DIR}")
    else:
        VENDOR_DIR.parent.mkdir(parents=True, exist_ok=True)
        print(f"cloning {ARTIMUSE_REPO} ...")
        subprocess.run(["git", "clone", "--depth", "1", ARTIMUSE_REPO, str(VENDOR_DIR)], check=True)

    if (CHECKPOINT_DIR / "config.json").exists():
        print(f"checkpoint already present: {CHECKPOINT_DIR}")
    else:
        from huggingface_hub import snapshot_download

        print(f"downloading {ARTIMUSE_HF_MODEL} (~16GB) ...")
        snapshot_download(
            ARTIMUSE_HF_MODEL,
            local_dir=CHECKPOINT_DIR,
        )
        print(f"checkpoint downloaded to {CHECKPOINT_DIR}")

    print("setup complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
