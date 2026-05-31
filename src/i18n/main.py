"""Small JSON-backed i18n helper with context-local locale selection."""

from collections.abc import Iterable, Iterator, Mapping
from contextlib import contextmanager
from contextvars import ContextVar, Token
import json
from json import JSONDecodeError
from pathlib import Path
import re
from typing import cast

type JsonValue = None | bool | int | float | str | list[JsonValue] | dict[
    str, JsonValue
]
type TranslationTree = dict[str, JsonValue]
type LocaleTag = str
type TranslationCatalog = dict[LocaleTag, TranslationTree]

INTERPOLATION_PATTERN = re.compile(r"\{\{\s*(?P<key>[A-Za-z_][A-Za-z0-9_]*)\s*\}\}")
DEFAULT_LOCALE: LocaleTag = "en"


class I18nError(Exception):
    """Raised when translation resources cannot be loaded safely."""


def _read_json_object(path: Path) -> dict[str, JsonValue]:
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except JSONDecodeError as error:
        raise I18nError(f"Translation file is not valid JSON: {path}") from error

    if not isinstance(parsed, dict):
        raise I18nError(f"Translation file must contain a JSON object: {path}")

    return cast(dict[str, JsonValue], parsed)


def _normalize_locale_tag(locale: LocaleTag) -> LocaleTag:
    parts = locale.split("-")
    normalized_parts = [parts[0].lower()]
    for part in parts[1:]:
        if len(part) == 4 and part.isalpha():
            normalized_parts.append(part.title())
        elif (len(part) == 2 and part.isalpha()) or (len(part) == 3 and part.isdigit()):
            normalized_parts.append(part.upper())
        else:
            normalized_parts.append(part.lower())

    return "-".join(normalized_parts)


def _merge_translation_tree(
    target: TranslationTree, source: Mapping[str, JsonValue]
) -> None:
    for key, value in source.items():
        existing = target.get(key)
        if isinstance(existing, dict) and isinstance(value, dict):
            _merge_translation_tree(existing, value)
            continue

        target[key] = value


def _load_translation_catalog(directories: Iterable[Path]) -> TranslationCatalog:
    catalog: TranslationCatalog = {}
    for directory in directories:
        if not directory.is_dir():
            raise I18nError(f"Translation directory does not exist: {directory}")

        for translation_file in sorted(directory.glob("*.json")):
            locale_map = _read_json_object(translation_file)
            for locale, translations in locale_map.items():
                if not isinstance(translations, dict):
                    raise I18nError(
                        f"Locale '{locale}' in {translation_file} must contain a JSON object."
                    )

                _merge_translation_tree(
                    catalog.setdefault(_normalize_locale_tag(locale), {}),
                    translations,
                )

    return catalog


def _lookup(tree: Mapping[str, JsonValue], key: str) -> JsonValue:
    normalized_key = key.replace(":", ".", 1)
    current: JsonValue = cast(JsonValue, tree)
    for segment in normalized_key.split("."):
        if not isinstance(current, dict) or segment not in current:
            return None
        current = current[segment]

    return current


def _interpolate(text: str, values: Mapping[str, object]) -> str:
    def replace_match(match: re.Match[str]) -> str:
        key = match.group("key")
        value = values.get(key)
        return match.group(0) if value is None else str(value)

    return INTERPOLATION_PATTERN.sub(replace_match, text)


def _locale_candidates(
    locale: LocaleTag,
    fallback_locale: LocaleTag,
) -> tuple[LocaleTag, ...]:
    normalized_locale = _normalize_locale_tag(locale)
    normalized_fallback_locale = _normalize_locale_tag(fallback_locale)
    candidates = [normalized_locale]
    while "-" in candidates[-1]:
        candidates.append(candidates[-1].rsplit("-", 1)[0])

    if normalized_fallback_locale not in candidates:
        candidates.append(normalized_fallback_locale)

    return tuple(candidates)


class I18n:
    """Translation catalog with context-local locale selection."""

    def __init__(
        self,
        translation_directories: Iterable[Path],
        *,
        fallback_locale: LocaleTag = DEFAULT_LOCALE,
    ) -> None:
        self._catalog = _load_translation_catalog(translation_directories)
        self._fallback_locale = _normalize_locale_tag(fallback_locale)
        self._active_locale = ContextVar("i18n_locale", default=self._fallback_locale)

    @property
    def locale(self) -> LocaleTag:
        return self._active_locale.get()

    def set_locale(self, locale: LocaleTag) -> Token[LocaleTag]:
        return self._active_locale.set(_normalize_locale_tag(locale))

    def reset_locale(self, token: Token[LocaleTag]) -> None:
        self._active_locale.reset(token)

    @contextmanager
    def use_locale(self, locale: LocaleTag) -> Iterator[None]:
        token = self.set_locale(locale)
        try:
            yield
        finally:
            self.reset_locale(token)

    def translate(self, key: str, **values: object) -> str:
        translated = self._find_translation(key)
        if translated is None:
            return key
        if not isinstance(translated, str):
            return str(translated)

        return _interpolate(translated, values)

    def _find_translation(self, key: str) -> JsonValue:
        for locale in _locale_candidates(self.locale, self._fallback_locale):
            translated = _lookup(self._catalog.get(locale, {}), key)
            if translated is not None:
                return translated

        return None
