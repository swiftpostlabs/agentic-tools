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

## Scope Boundaries

- Use this skill for portable Python structure, typing, CLI, and testing guidance.
- Use `.agents/skills/ref-coding-patterns/SKILL.md` for language-agnostic naming, comment, and CLI ergonomics defaults.
- Use `.agents/skills/ref-projects-architecture/SKILL.md` for shared-utility thresholds and product-versus-maintenance boundaries.
- Use repo-local skills such as `.agents/skills/ref-project-setup/SKILL.md` or `.agents/skills/ref-code-conventions/SKILL.md` when the question is about this repository's exact package names, top-level folders, or validation commands.

## Defaults

- Prefer modern Python with type hints throughout public and shared code.
- If the repo already targets a modern Python baseline such as 3.14+, do not add `from __future__ import annotations` or similar compatibility boilerplate just to mimic older code.
- Prefer `pathlib.Path` over raw path strings.
- Prefer dataclasses, typed dicts, or small domain objects over loose dictionaries when structure matters.
- Prefer explicit exceptions and clear error messages over silent fallbacks.
- Prefer `uv` for Python dependency management, virtual environments, and runnable project commands unless the repo already mandates another Python workflow.
- In `uv`-managed repos that use Poe, prefer tasks that invoke installed console entry points through `uv run` instead of adding tiny wrapper scripts.
- Prefer the repo's standard formatter, type checker, and test task wrappers when they exist.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Organize a Python feature | Choose a feature folder, local modules, and collocated tests. | A good starting layout keeps future refactors local instead of repo-wide. | When adding a new unit of behavior. | The feature is easy to find, extend, and test. |
| Decide between product CLI and maintenance script | Choose whether a command belongs under the package or in repo maintenance paths. | Many Python repos accumulate product behavior in ad hoc scripts. | When a new command-line flow appears. | Product commands are packaged cleanly and maintenance glue stays separate. |
| Review types and tests together | Check whether the public API, data structures, and risky branches are explicit. | Python stays maintainable when type clarity and test coverage grow together. | When reviewing or refactoring non-trivial logic. | Data shapes are clear and the fragile branches are covered. |

## Core Rules

### Typing

- Type function parameters and shared return values clearly.
- On modern Python baselines, use standard annotation syntax directly instead of future-compatibility imports for postponed annotations.
- Prefer precise container types like `list[str]` or `dict[str, int]`.
- Use `Protocol`, `TypedDict`, dataclasses, or type aliases when they improve readability.
- Prefer type guards and restructuring over `# type: ignore`.

### Structure

- Group related modules by feature or responsibility.
- Keep tests close to the behavior they cover when the repo layout supports it.
- Extract helper modules only when the behavior is truly shared or the file has become hard to navigate.

### CLI and scripts

- If a command is part of the installed product, expose a clear `main()` function and register it as an entrypoint.
- If a `uv`-managed repo needs a development task for an installed dependency, prefer a Poe task that calls the dependency's console command through `uv run`, for example `sync-shared-tool = "uv run shared-tool sync"`, instead of a pass-through script like `python scripts/run_sync.py`.
- If code is only for repo maintenance or one-off automation, keep it as a script.
- Use descriptive subcommands and flags for multi-action CLIs.

### Testing

- Add unit tests for non-trivial logic and error cases.
- Prefer small builders, fixtures, or factory helpers over giant setup blocks.
- Keep test names specific enough that failures are easy to localize.

## Example Layouts

### Packaged feature with collocated tests

```text
src/package_name/report_sync/
  main.py
  main_test.py
  client.py
  client_test.py
  models.py
```

### Repo maintenance script

```text
scripts/
  update_from_upstream.py
  update_from_upstream_test.py
```

## Validation

- Public Python code is typed clearly and reads without guesswork.
- Modern-baseline projects do not carry legacy compatibility imports without a version-specific reason.
- Paths, errors, and data structures are explicit.
- Product CLIs and maintenance scripts are separated intentionally.
- Tests cover non-trivial logic and stay readable.

## References

- Read `./references/checklist.md` for a quick Python review pass.
- Read `./assets/trigger-eval-queries.example.json` when checking trigger quality for Python-focused prompts.
