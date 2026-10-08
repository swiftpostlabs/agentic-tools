---
name: ref-sp-dev-repo-conventions
description: "How this agentic-tools repo is laid out and wired: the feature-first src/agentic_tools package, pyproject.toml, Poe tasks for Black, Pyright strict, and pytest, typing rules, CLI and script placement, translations. Use when adding, moving, or validating code here."
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "repo-local"
  shareable-skills.reason: "Documents this repository's concrete Python layout, pyproject wiring, tooling commands, and package boundary."
---

# Repo Conventions

This repo's concrete layout, config, and commands. Portable defaults live in `ref-sp-py-python`
(Python structure and typing), `ref-sp-dev-coding-patterns` (naming, control flow, tests), and
`ref-sp-dev-projects-architecture` (feature boundaries, shared code, product vs scripts).

## Project context

- Language: Python 3.14. The legacy JS/JSDoc Node port under `src/agentic_tools_old` is a
  boundary: don't extend it unless asked.
- Distribution name `agentic-tools`; importable package `agentic_tools` under `src/agentic_tools/` (the dash→underscore normalization is normal Python packaging).
- Tooling: Hatch (packaging), uv (dependencies/runner), Black (formatting), Pyright strict (types), pytest (tests), poethepoet (`[tool.poe.tasks]`).

## Top-level repo layout

```text
AGENTS.md                          # the only agent instruction file, read natively; no CLAUDE.md or GEMINI.md
.agents/skills/<skill>/SKILL.md    # agent workflow skills (+ references/ assets/ evals/ scripts/)
.agents/config.json                # policy + skills config
.agents/playground/                # local scratch space for temporary helper files (gitignored)
.agents/tasks/                     # local task backlog and tracked task folders (gitignored)
src/agentic_tools/                 # shipped Python package (feature-first, see below)
src/agentic_tools_old/             # legacy Node port (boundary; do not extend unless asked)
scripts/                           # repo maintenance/automation, not shipped product
pyproject.toml                     # single configuration hub for all tools
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

## Scratch and task workspaces

- Temporary helper files go under `.agents/playground/`, created with the edit tools — not generated
  through terminal heredocs or shell redirection.
- Local task notes and tracked task folders go under `.agents/tasks/` (see `ref-sp-agents-local-tasks`).
- Both are local workspaces: never ship product code from them.

## Testing conventions

- Collocate a `*_test.py` next to non-trivial code; name tests `test_my_feature()` for `my_feature()`.
- pytest collects from `src`/`scripts`, matching `*_test.py`. Add at least one focused test for new non-trivial logic.

## Translation placement

- Root CLI strings: `src/agentic_tools/main/translations/en.json`; feature strings: `src/agentic_tools/features/<feature>/translations/en.json`.
- Reusable i18n library code lives at `src/i18n/main.py` (behaves like an external package); repo-specific i18n configuration at `src/agentic_tools/core/i18n/main.py`. Features import the configured helper from `core/i18n`, not the raw library.

## Tools and commands

Prefer the Poe tasks as the standard entrypoints; reach for the raw tool only for focused flags or debugging.

- `uv run poe test` — pytest
- `uv run poe lint` — policy, version, and plugin drift checks plus Black `--check`
- `uv run poe lint-fix` — Black formatting only
- `uv run poe typecheck` — Pyright strict on `./src`
- `uv run agentic-tools policy sync` / `... policy import-vscode` — regenerate agent policy config

For the full `pyproject.toml` section-by-section breakdown, the tool command reference, and common config tasks, read `./references/pyproject-and-tooling.md`.

## Before finishing

While iterating, run the focused tasks on the touched paths, for example
`uv run poe lint-focused src/agentic_tools/main` (same shape for `typecheck-focused` and
`test-focused`; each takes the paths). Before
committing, run `uv run poe lint && uv run poe typecheck && uv run poe test` (format first with
`lint-fix` if Black complains), and commit only if all pass. Read `./references/checklist.md` before
finalizing a placement or `pyproject.toml` change.

## References

- `./references/pyproject-and-tooling.md` — `pyproject.toml` configuration hub, tool command reference, and common config tasks.
- `./references/checklist.md` — quick review pass on placement and `pyproject.toml` consistency.
