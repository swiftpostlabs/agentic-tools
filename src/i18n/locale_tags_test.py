from i18n.locale_tags import locale_candidates, normalize_locale_tag


def test_normalize_locale_tag_uses_conventional_bcp47_casing() -> None:
    assert normalize_locale_tag("EN-gb") == "en-GB"
    assert normalize_locale_tag("zh-hant-tw") == "zh-Hant-TW"
    assert normalize_locale_tag("es-419") == "es-419"


def test_locale_candidates_include_exact_base_and_configured_fallback() -> None:
    assert locale_candidates("pt-BR", "en") == ("pt-BR", "pt", "en")


def test_locale_candidates_do_not_repeat_fallback() -> None:
    assert locale_candidates("en-GB", "en") == ("en-GB", "en")
