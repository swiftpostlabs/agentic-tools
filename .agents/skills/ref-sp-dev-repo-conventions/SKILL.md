---
name: ref-sp-dev-repo-conventions
description: "Repo-specific conventions for this Python project (agentic-tools): the feature-first src/agentic_tools layout, pyproject.toml configuration hub, Black + Pyright-strict + pytest tooling via Poe, typing rules, CLI and script placement, and translations. Use when: creating or moving features, tests, or CLI entrypoints; deciding which top-level or package folder a file belongs in; adjusting pyproject.toml, Poe tasks, or tool config; or explaining how this repo is wired."
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "repo-local"
  shareable-skills.reason: "Documents this repository's concrete Python layout, pyproject wiring, tooling commands, and package boundary."
---

# Repo Conventions

## Purpose

Help the agent work within this repository the way it is actually structured, configured, and validated, so the codebase stays clean and maintainable. This skill owns the **repo-specific** decisions; portable guidance lives in the skills listed under Scope boundaries.

## Values

- Prefer simplicity over cleverness.
- Prefer maintainability over short-term convenience.
- Prefer explicit structure and predictable behavior over hidden magic.

## When to use this skill

- Creating, moving, or reviewing code under `src/agentic_tools/` (features, entrypoints, core plumbing).
- Adding or updating tests, CLI entrypoints, or Poe tasks.
- Deciding which top-level folder (`src/`, `scripts/`, `.agents/`, `.github/`) or package folder (`main`, `features`, `core`, `shared`, `infrastructure`) a file belongs in.
- Adjusting `pyproject.toml`, tool configuration (Pyright, Black, pytest, Hatch), or the Poe tasks.
- Explaining how this repository is wired at the top level.

## Scope boundaries

This skill is the repo-specific layer. Defer portable decisions:

- `.agents/skills/ref-sp-py-python/SKILL.md` — portable Python structure, typing, and CLI patterns.
- `.agents/skills/ref-sp-dev-coding-patterns/SKILL.md` — language-agnostic naming, control flow, comments, testing defaults.
- `.agents/skills/ref-sp-dev-projects-architecture/SKILL.md` — portable feature-folder boundaries, shared-utility thresholds, product-vs-maintenance split.

Use this skill for the concrete package name, folder placement, `pyproject.toml` wiring, and validation commands in *this* repo.

## Project context

- Language: Python (targets 3.14); legacy JS/JSDoc Node port remains under `src/agentic_tools_old` until intentionally redesigned.
- Distribution name `agentic-tools`; importable package `agentic_tools` under `src/agentic_tools/` (the dash→underscore normalization is normal Python packaging).
- Tooling: Hatch (packaging), uv (dependencies/runner), Black (formatting), Pyright strict (types), pytest (tests), poethepoet (`[tool.poe.tasks]`).

## Top-level repo layout

```text
AGENTS.md                          # source-of-truth agent guidance (Copilot reads it natively)
.agents/skills/<skill>/SKILL.md    # agent workflow skills (+ references/ assets/ evals/ scripts/)
.agents/config.json                # policy + skills config
src/agentic_tools/                 # shipped Python package (feature-first, see below)
src/agentic_tools_old/             # legacy Node port (boundary; do not extend unless asked)
scripts/                           # repo maintenance/automation, not shipped product
pyproject.toml                     # single configuration hub for all tools
GEMINI.md, .claude/CLAUDE.md       # thin provider routing stubs -> AGENTS.md
```

## Package layout (feature-first)

```text
src/agentic_tools/
  main/            # app-level CLI composition and the installed entrypoint (cli.py)
    cli.py  cli_test.py  translations/en.json
  features/<feature>/   # user-facing capabilities and command groups, tests collocated
    main.py  main_test.py  translations/en.json
  core/<concern>/       # foundational plumbing: config, i18n wiring, logging, focused 3rd-party wrappers
    main.py  main_test.py
```

- `main`: app-level command composition; keep `src/agentic_tools/main/cli.py` as the unique installed entrypoint.
- `features`: product behavior and user-facing command groups; keep code and tests together.
- `core`: foundational plumbing and third-party integration features depend on — not domain behavior.
- `shared`: add **only** when a real domain-agnostic contract must be shared by multiple features.
- `infrastructure`/`infra`: only for strict external adapters too large/specific for `core`; not the default here.
- Do **not** create generic `utils`/`helpers` folders — choose a named `core/<concern>` or `features/<feature>`.
- Do **not** add `__init__.py` just to mark packages; this repo uses implicit namespace packages unless package-level code is genuinely needed.
- Do **not** create a top-level `tests/` folder; tests are collocated (`feature.py` → `feature_test.py`).

## Typing rules (Pyright strict)

- Type everything explicitly; avoid bare `dict`/`list`/`tuple`/`set` — prefer `dict[str, str]`, `list[int]`, etc.
- Annotate parameters always; prefer inferred return types when sound, but add explicit returns for public/shared API contracts, protocols/callbacks, recursive/overloaded functions, or when inference would yield `Any`/`object`/a misleading union.
- Fix strict-mode issues by improving annotations, adding type guards (`isinstance`), or restructuring. Treat `# type: ignore` as a last resort with a short justifying comment.
- For untyped third-party libs: install `types-...` stubs first, else add minimal local stubs under `src/typings` (Pyright `stubPath`), before considering `# type: ignore`.

## CLI and scripts

- Installed commands belong in `[project.scripts]`, routed through the grouped `agentic-tools` entrypoint (`src/agentic_tools/main/cli.py`), mounting feature groups from `src/agentic_tools/features/<feature>/main.py`.
- Repo maintenance scripts stay in `scripts/` (`if __name__ == "__main__":` is fine there). A user-facing feature belongs under `features/<feature>/`, not hidden in `scripts/`.
- Use `[tool.poe.tasks]` for dev workflows and shell-like orchestration that do not fit `[project.scripts]`.
- Ask before moving an existing script into the package or changing how the user runs it.

## Testing conventions

- Collocate a `*_test.py` next to non-trivial code; name tests `test_my_feature()` for `my_feature()`.
- pytest collects from `src`/`scripts`, matching `*_test.py`. Add at least one focused test for new non-trivial logic.

## Translation placement

- Root CLI strings: `src/agentic_tools/main/translations/en.json`; feature strings: `src/agentic_tools/features/<feature>/translations/en.json`.
- Reusable i18n library code lives at `src/i18n/main.py` (behaves like an external package); repo-specific i18n configuration at `src/agentic_tools/core/i18n/main.py`. Features import the configured helper from `core/i18n`, not the raw library.

## Tools and commands

Prefer the Poe tasks as the standard entrypoints; reach for the raw tool only for focused flags or debugging.

- `uv run poe test` — pytest
- `uv run poe lint` / `uv run poe lint-fix` — Black check / format
- `uv run poe typecheck` — Pyright strict on `./src`
- `uv run agentic-tools policy sync` / `... policy import-vscode` — regenerate agent policy config
- Before committing: `uv run poe lint-fix` → `uv run poe typecheck` → `uv run poe test`, then commit only if all pass.

For the full `pyproject.toml` section-by-section breakdown, the tool command reference, and common config tasks, read `./references/pyproject-and-tooling.md`.

## Validation

For a narrow scaffold or folder-layout change:

```text
uv run python -m pytest src/agentic_tools/main/cli_test.py -q
uv run python -m black --check src/agentic_tools
uv run python -m pyright src/agentic_tools src/typings
```

For broader changes touching shared config or the legacy boundary, run the full Poe tasks above. Read `./references/checklist.md` before finalizing a placement or `pyproject.toml` change.

## References

- `./references/pyproject-and-tooling.md` — `pyproject.toml` configuration hub, tool command reference, and common config tasks.
- `./references/checklist.md` — quick review pass on placement and `pyproject.toml` consistency.
- `./assets/trigger-eval-queries.example.json` — starter trigger-eval queries for this skill.
