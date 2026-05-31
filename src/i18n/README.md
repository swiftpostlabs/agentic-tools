# SwiftPost Labs / i18n

A small JSON-backed translation library with context-local BCP 47 locale selection.

This library is intentionally narrow. It loads locale-rooted JSON translation files from one or more directories, resolves dotted keys or `namespace:key` keys, interpolates `{{values}}`, and stores the active locale tag in Python `contextvars` so locale changes stay local to the current execution context.

It exists for CLI and agent-tooling code that needs predictable, typed, low ceremony translations without adopting a larger message-format ecosystem. It is not trying to be a full localization platform.

We do not use `gettext` here because the GNU catalog workflow, extraction step, message ids, and compiled files are more machinery than this scaffold currently needs. `gettext` is a good fit for mature applications with translator workflows, but this project is still defining small feature-local JSON catalogs.

We do not use Fluent because Fluent is designed for richer natural-language messages, selectors, plurals, and translator-authored message logic. Those are useful capabilities, but they add a message syntax and runtime model that would be premature for the current command strings.

We do not use `python-i18n` because the project needs a tiny typed surface, explicit catalog loading, and context-local locale state. `python-i18n` leans on global mutable configuration, which is harder to reason about as features and tests grow.

## Setup

Place translation JSON files in one or more directories. Each file must contain a JSON object whose top-level keys are BCP 47 language or locale tags such as `en`, `en-US`, `en-GB`, or `pt-BR`. Tags are normalized to conventional BCP 47 casing, so `en-us` and `en-US` are treated as the same tag.

```json
{
  "en": {
    "app": {
      "name": "agentic-tools",
      "greeting": "Hello {{name}}"
    }
  },
  "en-GB": {
    "app": {
      "greeting": "Hello {{name}}"
    }
  },
  "it": {
    "app": {
      "name": "agentic-tools",
      "greeting": "Ciao {{name}}"
    }
  }
}
```

Create an `I18n` instance with the directories that contain those JSON files.

```python
from pathlib import Path

from i18n.main import I18n

translations = Path(__file__).parent / "translations"

i18n = I18n((translations,), fallback_locale="en")
translate = i18n.translate
```

When using the library inside an application, keep app-specific directory wiring outside `src/i18n`. In this repository, [src/agentic_tools/core/i18n/main.py](../agentic_tools/core/i18n/main.py) owns the configured application instance.

## Usage

Translate by dotted key:

```python
translate("app.name")
```

Interpolate values with `{{name}}` placeholders:

```python
translate("app.greeting", name="Francesco")
```

Use `namespace:key` when that style reads better at the call site. The first colon is treated like a dot.

```python
translate("app:greeting", name="Francesco")
```

Switch locale for the current context with `use_locale`:

```python
with i18n.use_locale("it"):
    message = translate("app.greeting", name="Francesco")
```

For manual token control, use `set_locale` and `reset_locale`:

```python
token = i18n.set_locale("it")
try:
    message = translate("app.greeting", name="Francesco")
finally:
    i18n.reset_locale(token)
```

If a key is missing in the active locale, the library falls back through broader BCP 47 tags before checking the configured fallback locale. For example, `en-GB` checks `en-GB`, then `en`, then the configured fallback if different. If the key is still missing, `translate` returns the original key.

## Details for Devs

The public library surface lives in [main.py](main.py):

- `I18n` loads one or more translation directories and exposes locale-aware translation methods.
- `I18nError` is raised when translation files or directories cannot be loaded safely.
- `LocaleTag` is a `str` type alias for BCP 47 language and locale tags. It is intentionally not an enum because valid tags are open-ended.
- `DEFAULT_LOCALE` is `"en"`, which is a valid BCP 47 language tag.

Keep [main.py](main.py) as a dumb facade that re-exports the supported API. Put behavior in focused modules:

- [locale_tags.py](locale_tags.py) normalizes BCP 47 tag casing and builds fallback candidates.
- [catalog.py](catalog.py) loads, merges, and looks up translation catalog values.
- [interpolation.py](interpolation.py) handles `{{name}}` placeholder replacement.
- [translator.py](translator.py) owns the context-local `I18n` class.

Keep `src/i18n` generic. It should not import from `agentic_tools`, know about this repository's feature folders, or own application translation paths. Add application wiring in `src/agentic_tools/core/i18n` and test reusable behavior next to the module that owns it.

Focused validation:

```sh
uv run python -m pytest src/i18n/main_test.py src/agentic_tools/core/i18n/main_test.py -q
uv run python -m black --check src/i18n src/agentic_tools/core/i18n
uv run python -m pyright src/i18n src/agentic_tools/core/i18n
```
