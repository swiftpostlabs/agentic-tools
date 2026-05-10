---
name: ref-python
description: "Portable Python guidance for typed application code, scripts, CLIs, and tests. Use when: writing or refactoring Python modules, designing Python feature folders, or deciding typing and testing patterns."
metadata:
  shareable-skills.visibility: "shareable"
---

# Python

## Purpose

Provide portable Python defaults that emphasize explicit typing, simple structure, maintainable CLIs, and focused tests.

## When to use this skill

- Writing or refactoring Python application code.
- Designing a Python CLI or maintenance script.
- Choosing how to type shared data and interfaces.
- Deciding where tests should live and what they should cover.
- Reviewing Python code for readability and long-term maintainability.

## Defaults

- Prefer modern Python with type hints throughout public and shared code.
- Prefer `pathlib.Path` over raw path strings.
- Prefer dataclasses, typed dicts, or small domain objects over loose dictionaries when structure matters.
- Prefer explicit exceptions and clear error messages over silent fallbacks.
- Prefer the repo's standard formatter, type checker, and test task wrappers when they exist.

## Core Rules

### Typing

- Type function parameters and shared return values clearly.
- Prefer precise container types like `list[str]` or `dict[str, int]`.
- Use `Protocol`, `TypedDict`, dataclasses, or type aliases when they improve readability.
- Prefer type guards and restructuring over `# type: ignore`.

### Structure

- Group related modules by feature or responsibility.
- Keep tests close to the behavior they cover when the repo layout supports it.
- Extract helper modules only when the behavior is truly shared or the file has become hard to navigate.

### CLI and scripts

- If a command is part of the installed product, expose a clear `main()` function and register it as an entrypoint.
- If code is only for repo maintenance or one-off automation, keep it as a script.
- Use descriptive subcommands and flags for multi-action CLIs.

### Testing

- Add unit tests for non-trivial logic and error cases.
- Prefer small builders, fixtures, or factory helpers over giant setup blocks.
- Keep test names specific enough that failures are easy to localize.

## Validation

- Public Python code is typed clearly and reads without guesswork.
- Paths, errors, and data structures are explicit.
- Product CLIs and maintenance scripts are separated intentionally.
- Tests cover non-trivial logic and stay readable.

## References

- Read `./references/checklist.md` for a quick Python review pass.
- Read `./assets/trigger-eval-queries.example.json` when checking trigger quality for Python-focused prompts.