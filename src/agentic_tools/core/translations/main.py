"""Shared translation helpers for the new scaffold package."""

from pathlib import Path

import i18n

_TRANSLATION_DIRECTORIES = (
    Path(__file__).resolve().parents[2] / "main" / "translations",
    Path(__file__).resolve().parents[2] / "features" / "skills" / "translations",
)


def _configure_i18n() -> None:
    load_paths = [str(path) for path in _TRANSLATION_DIRECTORIES]
    i18n.set("load_path", load_paths)
    i18n.set("file_format", "json")
    i18n.set("filename_format", "{locale}.{format}")
    i18n.set("fallback", "en")
    i18n.set("locale", "en")
    i18n.set("skip_locale_root_data", False)


_configure_i18n()


def translate(key: str) -> str:
    return str(i18n.t(key))
