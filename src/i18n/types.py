"""Shared type aliases for the i18n library.

`LocaleTag` values are BCP 47 language tags such as `en`, `en-US`,
`pt-BR`, or `zh-Hant`. The complete valid set is intentionally open-ended;
use the IANA Language Subtag Registry for the official current subtags:
https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
"""

from typing import Annotated

type JsonValue = None | bool | int | float | str | list[JsonValue] | dict[
    str, JsonValue
]
type TranslationTree = dict[str, JsonValue]
type LocaleTag = Annotated[
    str,
    "BCP 47 language tag, e.g. en, en-US, pt-BR, or zh-Hant; see the IANA Language Subtag Registry.",
]
type TranslationCatalog = dict[LocaleTag, TranslationTree]
