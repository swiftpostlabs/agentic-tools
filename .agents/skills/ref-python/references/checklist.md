# Review Checklist

- Public Python APIs are typed explicitly and use named structures where that improves clarity.
- Paths, errors, and return values are explicit rather than hidden in loose dictionaries or magic strings.
- Product features live under `src/<package>/<feature>/` and maintenance scripts stay in `scripts/`.
- Functions stay small enough to read without mentally executing the whole file.
- Tests cover non-trivial parsing, validation, branching, or filesystem behavior.