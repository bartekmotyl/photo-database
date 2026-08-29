from __future__ import annotations

from ..config import ProviderConfig
from .base import VisionProvider


def create_provider(config: ProviderConfig) -> VisionProvider:
    # All providers currently go through LiteLLM (routed by the model name
    # prefix). The VisionProvider interface stays, so a native SDK
    # implementation can be added alongside if a provider-specific feature
    # is ever needed (e.g. a batch API).
    from .litellm_provider import LiteLlmProvider

    return LiteLlmProvider(model=config.model, base_url=config.base_url)
