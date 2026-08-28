from __future__ import annotations

import base64
from typing import Any

import requests

from ..models import ImageInput, LabelingError
from .base import VisionProvider


class OllamaProvider(VisionProvider):
    """Local models via Ollama (needs a vision model, e.g. qwen2.5vl or llava)."""

    def __init__(self, model: str, base_url: str | None):
        self.base_url = (base_url or "http://localhost:11434").rstrip("/")
        self.model = model

    def label(self, images: list[ImageInput], prompt: str, schema: dict[str, Any]) -> str:
        # Ollama takes images as a flat list per message, so per-image notes
        # are folded into the prompt text instead.
        notes = [img.note for img in images if img.note]
        full_prompt = "\n".join(notes + [prompt])

        response = requests.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "stream": False,
                "format": schema,  # Ollama structured outputs (>= 0.5)
                "messages": [
                    {
                        "role": "user",
                        "content": full_prompt,
                        "images": [
                            base64.standard_b64encode(img.data).decode("utf-8")
                            for img in images
                        ],
                    }
                ],
            },
            timeout=600,  # local models can be slow
        )
        response.raise_for_status()

        payload: dict[str, Any] = response.json()
        text: str = (payload.get("message") or {}).get("content", "")
        if not text:
            raise LabelingError("empty response from model")
        return text
