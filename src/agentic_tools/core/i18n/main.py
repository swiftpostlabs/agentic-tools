"""Application i18n configuration for agentic-tools."""

from pathlib import Path

from i18n.main import I18n

_PACKAGE_ROOT = Path(__file__).resolve().parents[2]
_TRANSLATION_DIRECTORIES = (
    _PACKAGE_ROOT / "main" / "translations",
    _PACKAGE_ROOT / "features" / "skills" / "translations",
    _PACKAGE_ROOT / "features" / "plugin" / "translations",
)


i18n = I18n(_TRANSLATION_DIRECTORIES)
translate = i18n.translate
set_locale = i18n.set_locale
reset_locale = i18n.reset_locale
use_locale = i18n.use_locale
