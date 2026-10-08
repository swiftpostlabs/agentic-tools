---
name: ref-sp-dev-coding-patterns
description: "Language-neutral coding defaults: strict types at boundaries, intention-revealing names, early returns, side-effect-free imports, comments that explain why, safe CLIs, and focused tests. Use when writing, refactoring, or reviewing code in any language."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
---

# Coding Patterns

Defaults that apply in any language. Folder layout and feature boundaries are
`ref-sp-dev-projects-architecture`; language specifics are `ref-sp-py-python`,
`ref-sp-js-javascript`, and `ref-sp-js-typescript`; a repo's exact paths and commands live in its
conventions skill (here, `ref-sp-dev-repo-conventions`).

## Types and boundaries

- Type public APIs, exported helpers, and shared data structures. Use strict mode where the
  language has one.
- Treat external input as untrusted until it is narrowed or validated; prefer type guards,
  validation helpers, and discriminated unions over unchecked casts.
- Avoid `any`, untyped containers, and stringly-typed state when the language offers better.

## Names and structure

- Name by business meaning or effect: `parseInvoiceCsv`, `loadUserProfile`, not `handleData`,
  `doThing`, `misc`, `helpers`.
- Split by responsibility before a unit gets hard to name. Prefer small focused functions.
- Prefer early returns over nesting. Keep conditions explicit, not encoded in side effects; name
  a business rule that drives a branch, in code or a short comment.

## Imports do no work

Importing a module only binds names. It must not open connections, read files or the environment,
call the network, run expensive work, or build stateful clients, pools, or singletons. If changing
import order changes behaviour, something works at import time.

- Use a factory, a lazy accessor, or injected dependencies instead of a ready-made module-level
  instance. Pure constants and frozen lookup data are fine.
- Wiring at an entry point (an app root, `main()`, provider setup) is expected; the rule is about
  *importing*, not construction ever happening at module scope.
- A module-scope exception is a documented decision with a stated reason, never an accident.
  Tests get more latitude, but still avoid import-order coupling.

## Comments

- Comment why: constraints, invariants, business context, rules that are external, legal,
  surprising, or easy to break in a refactor. Don't narrate what the code says.
- A comment's claim ("safe because X") is an assertion: check it against the code before writing it.

## CLIs

- Verb subcommands for multi-action tools; long flags with short aliases for the common ones;
  predictable pairs like `--from` / `--to`.
- Default to the current directory when that is unsurprising.
- `--dry-run` for destructive or high-impact actions; `--help` with real examples.

## Tests

- Focused tests for non-trivial logic, error handling, and boundaries, including the branch most
  likely to break, not only the happy path.
- Readable enough to explain the intended behaviour; a few well-named fixtures or builders over
  large shared setup.

## References

- `./references/checklist.md`: quick review pass when applying these defaults.
