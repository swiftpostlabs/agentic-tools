from i18n.interpolation import interpolate


def test_interpolate_replaces_matching_placeholders() -> None:
    assert interpolate("Hello {{ name }}", {"name": "Francesco"}) == "Hello Francesco"


def test_interpolate_leaves_missing_placeholders_unchanged() -> None:
    assert interpolate("Hello {{ name }}", {}) == "Hello {{ name }}"


def test_interpolate_stringifies_values() -> None:
    assert interpolate("Invoice {{id}}", {"id": 42}) == "Invoice 42"
