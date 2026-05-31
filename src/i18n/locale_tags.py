"""BCP 47 locale tag normalization and fallback candidate resolution."""

from i18n.types import LocaleTag

DEFAULT_LOCALE: LocaleTag = "en"


def normalize_locale_tag(locale: LocaleTag) -> LocaleTag:
    """Return a locale tag using conventional BCP 47 casing.

    Language subtags are lower-case, script subtags are title-case, and region
    subtags are upper-case. This is a small normalizer for common tags, not a
    full BCP 47 validator.
    """

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


def locale_candidates(
    locale: LocaleTag,
    fallback_locale: LocaleTag,
) -> tuple[LocaleTag, ...]:
    """Return exact, base-tag, and configured fallback lookup candidates.

    For example, `en-GB` with fallback `en` returns `("en-GB", "en")`,
    while `pt-BR` with fallback `en` returns `("pt-BR", "pt", "en")`.
    """

    normalized_locale = normalize_locale_tag(locale)
    normalized_fallback_locale = normalize_locale_tag(fallback_locale)
    candidates = [normalized_locale]
    while "-" in candidates[-1]:
        candidates.append(candidates[-1].rsplit("-", 1)[0])

    if normalized_fallback_locale not in candidates:
        candidates.append(normalized_fallback_locale)

    return tuple(candidates)
