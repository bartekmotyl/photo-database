from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

# The formats accepted by all supported vision providers.
ImageMediaType = Literal["image/jpeg", "image/png", "image/gif", "image/webp"]


@dataclass
class TagDefinition:
    name: str
    description: str


@dataclass
class ImageInput:
    """An image sent to the vision model.

    `note` is an optional short text shown to the model next to the image.
    The photo being labeled needs no note; future reference images
    (e.g. faces of known people) will use it ("this is Anna").
    """

    data: bytes
    media_type: ImageMediaType = "image/jpeg"
    note: str | None = None


@dataclass
class LabelResult:
    description: str
    tags: list[str] = field(default_factory=list)


class LabelingError(Exception):
    """A single photo could not be labeled (bad model output, refusal, ...)."""
