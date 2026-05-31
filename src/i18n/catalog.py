"""Translation catalog loading, merging, and key lookup."""

from collections.abc import Iterable, Mapping
import json
from json import JSONDecodeError
from pathlib import Path
from typing import cast

from i18n.errors import I18nError
from i18n.locale_tags import normalize_locale_tag
from i18n.types import JsonValue, TranslationCatalog, TranslationTree


def read_json_object(path: Path) -> dict[str, JsonValue]:
    """Read a translation JSON file and require a top-level object."""

    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except JSONDecodeError as error:
        raise I18nError(f"Translation file is not valid JSON: {path}") from error

    if not isinstance(parsed, dict):
        raise I18nError(f"Translation file must contain a JSON object: {path}")

    return cast(dict[str, JsonValue], parsed)


def merge_translation_tree(
    target: TranslationTree, source: Mapping[str, JsonValue]
) -> None:
    """Deep-merge source translation keys into target in place."""

    for key, value in source.items():
        existing = target.get(key)
        if isinstance(existing, dict) and isinstance(value, dict):
            merge_translation_tree(existing, value)
            continue

        target[key] = value


def load_translation_catalog(directories: Iterable[Path]) -> TranslationCatalog:
    """Load and merge locale-rooted JSON files from translation directories."""

    catalog: TranslationCatalog = {}
    for directory in directories:
        if not directory.is_dir():
            raise I18nError(f"Translation directory does not exist: {directory}")

        for translation_file in sorted(directory.glob("*.json")):
            locale_map = read_json_object(translation_file)
            for locale, translations in locale_map.items():
                if not isinstance(translations, dict):
                    raise I18nError(
                        f"Locale '{locale}' in {translation_file} must contain a JSON object."
                    )

                merge_translation_tree(
                    catalog.setdefault(normalize_locale_tag(locale), {}),
                    translations,
                )

    return catalog


def lookup(tree: Mapping[str, JsonValue], key: str) -> JsonValue:
    """Resolve a dotted key or `namespace:key` path within a translation tree."""

    normalized_key = key.replace(":", ".", 1)
    current: JsonValue = cast(JsonValue, tree)
    for segment in normalized_key.split("."):
        if not isinstance(current, dict) or segment not in current:
            return None
        current = current[segment]

    return current
