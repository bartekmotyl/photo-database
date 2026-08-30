"""Wrapper around the vendored ArtiMuse model (InternVL3-8B fine-tune).

The inference code lives in the cloned ArtiMuse repo (photo-critic-setup);
this module puts it on sys.path and adapts it for local devices (MPS/CPU:
no FlashAttention). Image preprocessing mirrors the upstream eval script:
resize to 448x448 + ImageNet normalization, so PhotoDB thumbnails are
plenty of resolution.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from typing import Any

from PIL import Image

from .paths import CHECKPOINT_DIR, VENDOR_DIR

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


@dataclass
class Critique:
    score: float  # 0-100
    analysis: dict[str, str]  # aspect -> text


class ArtiMuseCritic:
    def __init__(self, device: str, max_new_tokens: int):
        if not (VENDOR_DIR / "src").exists() or not (CHECKPOINT_DIR / "config.json").exists():
            raise RuntimeError(
                "ArtiMuse repo/checkpoint missing - run photo-critic-setup first"
            )
        sys.path.insert(0, str(VENDOR_DIR / "src"))
        sys.path.insert(0, str(VENDOR_DIR / "src" / "artimuse"))

        import torch
        from artimuse.internvl.model.internvl_chat.modeling_artimuse import (
            InternVLChatModel,
        )
        from transformers import AutoTokenizer

        self._torch = torch
        self.device = device
        # bfloat16 matches upstream; works on CUDA and current MPS/CPU torch.
        self.dtype = torch.bfloat16
        print(f"loading ArtiMuse from {CHECKPOINT_DIR} (device={device})...")
        self.model = (
            InternVLChatModel.from_pretrained(
                str(CHECKPOINT_DIR),
                torch_dtype=self.dtype,
                low_cpu_mem_usage=True,
                use_flash_attn=device.startswith("cuda"),
            )
            .eval()
            .to(device)
        )
        self.tokenizer = AutoTokenizer.from_pretrained(
            str(CHECKPOINT_DIR), trust_remote_code=True, use_fast=False
        )
        self.generation_config: dict[str, Any] = dict(
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=self.tokenizer.eos_token_id,
        )

    def _pixel_values(self, image: Image.Image) -> Any:
        import torchvision.transforms as T
        from torchvision.transforms.functional import InterpolationMode

        transform = T.Compose(
            [
                T.Lambda(lambda img: img.convert("RGB") if img.mode != "RGB" else img),
                T.Resize((448, 448), interpolation=InterpolationMode.BICUBIC),
                T.ToTensor(),
                T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
            ]
        )
        return transform(image).unsqueeze(0).to(self.dtype).to(self.device)

    def critique(self, image: Image.Image, attributes: list[str]) -> Critique:
        pixel_values = self._pixel_values(image)
        with self._torch.inference_mode():
            score = float(
                self.model.score(self.device, self.tokenizer, pixel_values, self.generation_config)
            )
            analysis = {}
            for aspect in attributes:
                prompt = f"Please evaluate the aesthetic quality of this image from the aspect of {aspect}."
                analysis[aspect] = self.model.chat(
                    self.device, self.tokenizer, pixel_values, prompt, self.generation_config
                )
        return Critique(score=score, analysis=analysis)


class StubCritic:
    """Pipeline testing without the model (no repo/checkpoint/GPU needed)."""

    def critique(self, image: Image.Image, attributes: list[str]) -> Critique:
        return Critique(
            score=50.0,
            analysis={a: f"(stub critique for {image.size[0]}x{image.size[1]} image)" for a in attributes},
        )
