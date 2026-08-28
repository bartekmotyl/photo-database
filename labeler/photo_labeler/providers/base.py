from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from ..models import ImageInput


class VisionProvider(ABC):
    """A vision-capable LLM backend.

    Implementations take one or more images plus the assembled prompt and
    return the model's raw text output (expected to be the JSON object
    described by `schema`). Parsing/validation happens in the caller so all
    providers share it. Multiple images are accepted so that reference
    images (e.g. faces of known people) can be added later.
    """

    @abstractmethod
    def label(self, images: list[ImageInput], prompt: str, schema: dict[str, Any]) -> str: ...
