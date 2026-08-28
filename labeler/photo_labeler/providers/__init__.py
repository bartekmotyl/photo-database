from __future__ import annotations

from ..config import ProviderConfig
from .base import VisionProvider


def create_provider(config: ProviderConfig) -> VisionProvider:
    if config.type == "anthropic":
        from .anthropic_provider import AnthropicProvider

        return AnthropicProvider(model=config.model)
    if config.type == "openai":
        from .openai_provider import OpenAiProvider

        return OpenAiProvider(model=config.model)
    if config.type == "ollama":
        from .ollama_provider import OllamaProvider

        return OllamaProvider(model=config.model, base_url=config.base_url)
    raise ValueError(f"unknown provider type: {config.type!r} (expected anthropic, openai or ollama)")
