from __future__ import annotations

import base64
from typing import Any

import anthropic
from anthropic.types import ImageBlockParam, TextBlockParam

from ..models import ImageInput, LabelingError
from .base import VisionProvider


class AnthropicProvider(VisionProvider):
    def __init__(self, model: str):
        # Reads ANTHROPIC_API_KEY (or an `ant auth login` profile) from the environment.
        self.client = anthropic.Anthropic()
        self.model = model

    def label(self, images: list[ImageInput], prompt: str, schema: dict[str, Any]) -> str:
        content: list[TextBlockParam | ImageBlockParam] = []
        for image in images:
            if image.note:
                content.append({"type": "text", "text": image.note})
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": image.media_type,
                        "data": base64.standard_b64encode(image.data).decode("utf-8"),
                    },
                }
            )
        content.append({"type": "text", "text": prompt})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[{"role": "user", "content": content}],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )

        if response.stop_reason == "refusal":
            explanation = ""
            if response.stop_details:
                explanation = f": {response.stop_details.explanation}"
            raise LabelingError(f"model refused to label this photo{explanation}")

        text = next((b.text for b in response.content if b.type == "text"), None)
        if text is None:
            raise LabelingError(f"no text in model response (stop_reason={response.stop_reason})")
        return text
