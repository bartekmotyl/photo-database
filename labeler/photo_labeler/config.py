from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .models import TagDefinition


@dataclass
class ApiConfig:
    base_url: str = "http://localhost:5284"


@dataclass
class ProviderConfig:
    type: str = "anthropic"
    model: str = "claude-opus-5"
    base_url: str | None = None


@dataclass
class LabelingConfig:
    skip_labelled: bool = True
    limit: int = 0


@dataclass
class Config:
    api: ApiConfig = field(default_factory=ApiConfig)
    provider: ProviderConfig = field(default_factory=ProviderConfig)
    labeling: LabelingConfig = field(default_factory=LabelingConfig)
    prompt: str = ""
    tags: list[TagDefinition] = field(default_factory=list)


def load_config(config_path: Path) -> Config:
    with open(config_path, encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    config = Config()

    for key, value in (raw.get("api") or {}).items():
        setattr(config.api, key, value)
    for key, value in (raw.get("provider") or {}).items():
        setattr(config.provider, key, value)
    for key, value in (raw.get("labeling") or {}).items():
        setattr(config.labeling, key, value)

    # prompt_file / tags_file are resolved relative to the config file,
    # so a custom config can live anywhere and bring its own prompt/tags.
    base_dir = config_path.parent
    prompt_file = base_dir / raw.get("prompt_file", "prompt.md")
    tags_file = base_dir / raw.get("tags_file", "tags.yaml")

    config.prompt = prompt_file.read_text(encoding="utf-8").strip()
    config.tags = _load_tags(tags_file)

    return config


def _load_tags(tags_file: Path) -> list[TagDefinition]:
    with open(tags_file, encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    tags = []
    for entry in raw.get("tags") or []:
        name = (entry.get("name") or "").strip()
        description = (entry.get("description") or "").strip()
        if not name:
            raise ValueError(f"tag without a name in {tags_file}")
        if "," in name:
            raise ValueError(f"tag name may not contain a comma: {name!r}")
        tags.append(TagDefinition(name=name, description=description))

    if not tags:
        raise ValueError(f"no tags defined in {tags_file}")
    return tags
