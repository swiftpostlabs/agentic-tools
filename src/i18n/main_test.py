import json
from pathlib import Path

from i18n.main import I18n


def write_translations(path: Path, data: object) -> None:
    path.mkdir(parents=True, exist_ok=True)
    (path / "translations.json").write_text(json.dumps(data), encoding="utf-8")


def test_translate_reads_nested_json_by_context_locale(tmp_path: Path) -> None:
    translations_path = tmp_path / "translations"
    write_translations(
        translations_path,
        {
            "en": {"billing": {"invoice": "Invoice {{id}}"}},
            "it": {"billing": {"invoice": "Fattura {{id}}"}},
        },
    )
    i18n = I18n((translations_path,))

    assert i18n.translate("billing.invoice", id=42) == "Invoice 42"

    with i18n.use_locale("it"):
        assert i18n.translate("billing:invoice", id=42) == "Fattura 42"

    assert i18n.translate("billing.invoice", id=42) == "Invoice 42"


def test_translate_falls_back_to_default_locale(tmp_path: Path) -> None:
    translations_path = tmp_path / "translations"
    write_translations(
        translations_path,
        {
            "en": {"common": {"save": "Save"}},
            "it": {"common": {}},
        },
    )
    i18n = I18n((translations_path,))

    with i18n.use_locale("it"):
        assert i18n.translate("common.save") == "Save"


def test_translate_returns_missing_key(tmp_path: Path) -> None:
    translations_path = tmp_path / "translations"
    write_translations(translations_path, {"en": {"common": {}}})
    i18n = I18n((translations_path,))

    assert i18n.translate("common.missing") == "common.missing"
