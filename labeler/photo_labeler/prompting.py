"""Prompt and output-schema assembly.

The free-form explanation comes from the configured prompt file; the tag
list is rendered from the configured tags file. The output-format contract
below is fixed in code - it must stay compatible with parse_label_result().
"""

from __future__ import annotations

import json
from typing import Any

from .models import LabelingError, LabelResult, TagDefinition

# Fixed part of the prompt. Kept even for providers that enforce the JSON
# schema server-side - it costs little and keeps weaker models on track.
OUTPUT_FORMAT_INSTRUCTIONS = """\
Respond with a single JSON object and nothing else, in this exact structure:

{"description": "<short description of the photo>", "tags": ["<tag>", ...]}

The "tags" array may only contain tag names from the tag list above,
and may be empty if no tag applies."""


def build_prompt(configured_prompt: str, tags: list[TagDefinition]) -> str:
    tag_lines = "\n".join(f"- {t.name}: {t.description}" for t in tags)
    return (
        f"{configured_prompt}\n\n"
        f"Available tags:\n{tag_lines}\n\n"
        f"{OUTPUT_FORMAT_INSTRUCTIONS}"
    )


def build_output_schema(tags: list[TagDefinition]) -> dict[str, Any]:
    """JSON schema for the model output, for providers with structured output."""
    return {
        "type": "object",
        "properties": {
            "description": {"type": "string"},
            "tags": {
                "type": "array",
                "items": {"type": "string", "enum": [t.name for t in tags]},
            },
        },
        "required": ["description", "tags"],
        "additionalProperties": False,
    }


def parse_label_result(raw_text: str, tags: list[TagDefinition]) -> LabelResult:
    """Parse and validate model output; unknown tags are dropped with a note."""
    text = raw_text.strip()
    # Tolerate models that wrap the JSON in a markdown code fence.
    if text.startswith("```"):
        text = text.strip("`\n")
        if text.startswith("json"):
            text = text[len("json"):]

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise LabelingError(f"model did not return valid JSON: {e}\noutput: {raw_text!r}")

    if not isinstance(data, dict):
        raise LabelingError(f"model returned {type(data).__name__}, expected an object")

    description = data.get("description")
    if not isinstance(description, str) or not description.strip():
        raise LabelingError(f"missing or empty 'description' in model output: {data!r}")

    raw_tags = data.get("tags")
    if not isinstance(raw_tags, list):
        raise LabelingError(f"missing or invalid 'tags' in model output: {data!r}")

    known = {t.name for t in tags}
    valid_tags = []
    for tag in raw_tags:
        if isinstance(tag, str) and tag in known:
            if tag not in valid_tags:
                valid_tags.append(tag)
        else:
            print(f"    warning: dropping unknown tag from model output: {tag!r}")

    return LabelResult(description=description.strip(), tags=valid_tags)
