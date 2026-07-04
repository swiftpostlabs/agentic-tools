# Review Checklist

- Public Python APIs are typed explicitly and use named structures where that improves clarity.
- Modern Python projects do not keep compatibility imports such as `from __future__ import annotations` without a real version need.
- Paths, errors, and return values are explicit rather than hidden in loose dictionaries or magic strings.
- Product features live under `src/<package>/<feature>/` and maintenance scripts stay in `scripts/`.
- Packaged CLIs expose a clear `main()` under the feature folder rather than staying in ad hoc script files.
- Functions stay small enough to read without mentally executing the whole file.
- Tests cover non-trivial parsing, validation, branching, or filesystem behavior.
