from __future__ import annotations

import base64
from typing import Any

from openai import OpenAI
from openai.types.chat import ChatCompletionContentPartParam

from ..models import ImageInput, LabelingError
from .base import VisionProvider


class OpenAiProvider(VisionProvider):
    def __init__(self, model: str):
        # Reads OPENAI_API_KEY from the environment.
        self.client = OpenAI()
        self.model = model

    def label(self, images: list[ImageInput], prompt: str, schema: dict[str, Any]) -> str:
        content: list[ChatCompletionContentPartParam] = []
        for image in images:
            if image.note:
                content.append({"type": "text", "text": image.note})
            data_url = (
                f"data:{image.media_type};base64,"
                f"{base64.standard_b64encode(image.data).decode('utf-8')}"
            )
            content.append({"type": "image_url", "image_url": {"url": data_url}})
        content.append({"type": "text", "text": prompt})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": content}],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "photo_label", "schema": schema, "strict": True},
            },
        )

        text = response.choices[0].message.content
        if not text:
            raise LabelingError("empty response from model")
        return text
