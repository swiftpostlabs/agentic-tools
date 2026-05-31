import json
from pathlib import Path

import pytest

from i18n.catalog import load_translation_catalog, lookup
from i18n.errors import I18nError
from i18n.types import TranslationTree


def write_translations(path: Path, name: str, data: object) -> None:
    path.mkdir(parents=True, exist_ok=True)
    (path / name).write_text(json.dumps(data), encoding="utf-8")


def test_load_translation_catalog_merges_files_and_normalizes_locale_tags(
    tmp_path: Path,
) -> None:
    first_path = tmp_path / "first"
    second_path = tmp_path / "second"
    write_translations(first_path, "app.json", {"EN-gb": {"app": {"name": "App"}}})
    write_translations(
        second_path,
        "feature.json",
        {"en-GB": {"feature": {"save": "Save"}}},
    )

    catalog = load_translation_catalog((first_path, second_path))

    assert catalog == {"en-GB": {"app": {"name": "App"}, "feature": {"save": "Save"}}}


def test_load_translation_catalog_requires_existing_directories(tmp_path: Path) -> None:
    missing_path = tmp_path / "missing"

    with pytest.raises(I18nError, match="Translation directory does not exist"):
        load_translation_catalog((missing_path,))


def test_load_translation_catalog_requires_locale_objects(tmp_path: Path) -> None:
    translations_path = tmp_path / "translations"
    write_translations(translations_path, "en.json", {"en": "not an object"})

    with pytest.raises(I18nError, match="must contain a JSON object"):
        load_translation_catalog((translations_path,))


def test_lookup_resolves_dotted_and_namespace_keys() -> None:
    tree: TranslationTree = {"common": {"save": "Save"}}

    assert lookup(tree, "common.save") == "Save"
    assert lookup(tree, "common:save") == "Save"
    assert lookup(tree, "common.cancel") is None
