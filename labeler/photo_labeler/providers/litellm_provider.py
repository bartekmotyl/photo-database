from __future__ import annotations

import base64
from typing import Any

import litellm

from ..models import ImageInput, LabelingError
from .base import VisionProvider


class LiteLlmProvider(VisionProvider):
    """Any vision model supported by LiteLLM.

    The provider is selected by the model name prefix, e.g.
    "anthropic/claude-opus-5", "openai/gpt-5.2", "ollama/qwen2.5vl",
    "gemini/gemini-2.5-pro". API keys come from the usual environment
    variables (ANTHROPIC_API_KEY, OPENAI_API_KEY, ...); `base_url` is only
    needed for self-hosted endpoints (e.g. a non-default Ollama address).
    """

    def __init__(self, model: str, base_url: str | None = None):
        self.model = model
        self.base_url = base_url

    def label(self, images: list[ImageInput], prompt: str, schema: dict[str, Any]) -> str:
        content: list[dict[str, Any]] = []
        for image in images:
            if image.note:
                content.append({"type": "text", "text": image.note})
            data_url = (
                f"data:{image.media_type};base64,"
                f"{base64.standard_b64encode(image.data).decode('utf-8')}"
            )
            content.append({"type": "image_url", "image_url": {"url": data_url}})
        content.append({"type": "text", "text": prompt})

        response = litellm.completion(
            model=self.model,
            api_base=self.base_url,
            messages=[{"role": "user", "content": content}],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "photo_label", "schema": schema, "strict": True},
            },
        )

        text: str | None = response.choices[0].message.content
        if not text:
            finish_reason = response.choices[0].finish_reason
            raise LabelingError(f"empty response from model (finish_reason={finish_reason})")
        return text
