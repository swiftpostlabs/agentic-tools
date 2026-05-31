"""String interpolation for translated values."""

from collections.abc import Mapping
import re

INTERPOLATION_PATTERN = re.compile(r"\{\{\s*(?P<key>[A-Za-z_][A-Za-z0-9_]*)\s*\}\}")


def interpolate(text: str, values: Mapping[str, object]) -> str:
    """Replace `{{name}}` placeholders with matching interpolation values."""

    def replace_match(match: re.Match[str]) -> str:
        key = match.group("key")
        value = values.get(key)
        return match.group(0) if value is None else str(value)

    return INTERPOLATION_PATTERN.sub(replace_match, text)
