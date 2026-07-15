"""Context-local translation catalog."""

from collections.abc import Generator, Iterable
from contextlib import contextmanager
from contextvars import ContextVar, Token
from pathlib import Path

from i18n.catalog import load_translation_catalog, lookup
from i18n.interpolation import interpolate
from i18n.locale_tags import DEFAULT_LOCALE, locale_candidates, normalize_locale_tag
from i18n.types import JsonValue, LocaleTag


class I18n:
    """Translation catalog with context-local BCP 47 locale selection."""

    def __init__(
        self,
        translation_directories: Iterable[Path],
        *,
        fallback_locale: LocaleTag = DEFAULT_LOCALE,
    ) -> None:
        """Load translation directories and set the default fallback locale tag."""

        self._catalog = load_translation_catalog(translation_directories)
        self._fallback_locale = normalize_locale_tag(fallback_locale)
        self._active_locale = ContextVar("i18n_locale", default=self._fallback_locale)

    @property
    def locale(self) -> LocaleTag:
        """Return the normalized active locale tag for the current context."""

        return self._active_locale.get()

    def set_locale(self, locale: LocaleTag) -> Token[LocaleTag]:
        """Set the active locale tag for the current context and return a reset token."""

        return self._active_locale.set(normalize_locale_tag(locale))

    def reset_locale(self, token: Token[LocaleTag]) -> None:
        """Restore a previous locale context returned by `set_locale`."""

        self._active_locale.reset(token)

    @contextmanager
    def use_locale(self, locale: LocaleTag) -> Generator[None]:
        """Temporarily use a locale tag inside a context manager."""

        token = self.set_locale(locale)
        try:
            yield
        finally:
            self.reset_locale(token)

    def translate(self, key: str, **values: object) -> str:
        """Translate a key and interpolate `{{name}}` placeholders.

        Missing keys return the original key, matching i18next-style key
        fallback behavior.
        """

        translated = self._find_translation(key)
        if translated is None:
            return key
        if not isinstance(translated, str):
            return str(translated)

        return interpolate(translated, values)

    def _find_translation(self, key: str) -> JsonValue:
        for locale in locale_candidates(self.locale, self._fallback_locale):
            translated = lookup(self._catalog.get(locale, {}), key)
            if translated is not None:
                return translated

        return None
