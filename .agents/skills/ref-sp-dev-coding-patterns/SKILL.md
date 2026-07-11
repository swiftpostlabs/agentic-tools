---
name: ref-sp-dev-coding-patterns
description: "Portable coding defaults for readable, strongly-typed, well-tested code across languages and CLIs. Use when: choosing naming, typing, comments, branching structure, CLI ergonomics, or testing defaults in a new or existing codebase."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
---

# Coding Patterns

## Purpose

Provide portable defaults for writing code that is explicit, intention-revealing, easy to test, and easy to maintain across languages.

## When to use this skill

- Choosing general coding defaults for a new feature or repository.
- Refactoring code that is hard to read, weakly typed, or over-coupled.
- Deciding when comments help and when they are noise.
- Designing a CLI or automation surface.
- Reviewing whether tests actually cover risky behavior.

## Scope Boundaries

- Use this skill for language-agnostic defaults such as naming, comments, branching, CLI ergonomics, and testing posture.
- Use `ref-sp-dev-projects-architecture` for folder layout, feature boundaries, and shared-utility decisions.
- Use `ref-sp-py-python`, `ref-sp-js-javascript`, or `ref-sp-js-typescript` for syntax- and runtime-specific guidance.
- Use a repo-local conventions skill (in this repo, `ref-sp-dev-repo-conventions`) when the question is about a specific repository's exact paths or commands.

## Defaults

- Prefer strict typing when the language supports it.
- Prefer explicit boundaries over clever inference at I/O edges.
- Prefer names that scream intent over vague verbs.
- Prefer early returns over deep nesting.
- Prefer small focused functions over multi-purpose handlers.
- Prefer safe CLI defaults and discoverable help.
- Prefer focused tests over broad integration-style guesswork.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Pick naming and data-boundary defaults | Choose intention-revealing names and explicit validation or narrowing points. | Weak names and fuzzy I/O boundaries make every later refactor harder. | When starting a new feature or cleaning up unclear code. | Call sites, helpers, and data shapes read clearly without private context. |
| Shape a CLI surface | Choose subcommands, flags, help text, and safe defaults deliberately. | CLI ergonomics become sticky quickly once other people start using them. | When creating or revising a command-line workflow. | The command is discoverable, predictable, and safe to run. |
| Review comments and tests | Decide which constraints deserve comments and which branches deserve tests. | Documentation and tests are expensive if they are broad but shallow. | When finishing a risky change or reviewing a refactor. | Comments explain real constraints and tests cover the most fragile behavior. |

## Core Rules

### Typing and data boundaries

- Type public APIs, exported helpers, and shared data structures clearly.
- Treat external input as untrusted until it is narrowed or validated.
- Prefer type guards, validation helpers, discriminated unions, or tagged states over unchecked casts.
- Avoid `any`, untyped containers, and stringly-typed state when the language gives you better options.

### Naming and structure

- Use names that describe the business meaning or effect of the code.
- Prefer names like `parseInvoiceCsv`, `loadUserProfile`, or `renderDashboard`.
- Avoid names like `handleData`, `doThing`, `misc`, or `helpers` when a narrower name exists.
- Split code by responsibility before it becomes hard to name mentally.

### Control flow

- Use early exits to remove nesting and make the happy path obvious.
- Keep conditions local and explicit rather than encoding them through side effects.
- If a branch exists because of a business rule, name that rule in code or in a short comment.

### Comments

- Comment why, constraints, invariants, or business context.
- Do not comment what the code already says clearly.
- Add comments when a rule is externally imposed, legally required, surprising, or easy to break during refactors.
- Treat a comment's assertion as a claim, not decoration: verify a stated invariant or safety condition (such as "safe because X") against the code before writing it as fact.

### CLI ergonomics

- Prefer verb-oriented subcommands for multi-action CLIs.
- Provide long flags and short aliases for the flags used most often.
- Use predictable pairs like `--from` and `--to` for source and destination.
- Default to the current working directory when that behavior is unsurprising.
- Add `--dry-run` for destructive or high-impact actions.
- Make `--help` concrete, with real examples and safe defaults.

### Testing

- Add focused tests for non-trivial logic, error handling, and boundary conditions.
- Cover the branch that is easiest to break, not just the happy path.
- Keep tests readable enough that they explain the intended behavior.
- Prefer a few well-named fixtures/builders over huge shared setup blocks.

## Validation

- Public functions and shared structures are typed clearly.
- Names reveal intent without needing surrounding explanation.
- Comments explain non-obvious constraints rather than narrating syntax.
- CLI flags are consistent, discoverable, and safe.
- Tests cover risky logic and failure modes, not only success paths.

## References

- Read `./references/checklist.md` for a quick review pass when applying or revising these defaults.
- Read `./assets/trigger-eval-queries.example.json` when testing whether the description triggers on the right requests.
