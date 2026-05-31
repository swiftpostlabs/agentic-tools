---
name: ref-swiftpost-project-folders
description: "Repo-local folder layout guidance for the reset Python package in agentic-tools. Use when adding, moving, or reviewing files under src/agentic_tools, deciding between main, features, core, shared, or infrastructure, or checking that scaffold files are in the right place."
metadata:
  agentic-tools-category: "project"
  shareable-skills.visibility: "repo-local"
  shareable-skills.reason: "Documents this repository's reset package layout and legacy-package boundary."
---

# Swiftpost Project Folders

## Purpose

Keep the new `src/agentic_tools` package structured around explicit ownership boundaries so product features, application entrypoints, and foundational plumbing do not collapse into generic utility folders.

## When to use this skill

- Adding, moving, or reviewing files under `src/agentic_tools`.
- Deciding whether code belongs in `main`, `features`, `core`, `shared`, or `infrastructure`.
- Reviewing whether a dependency wrapper, configuration loader, translation setup, or feature module is in the right place.
- Checking that reset-era scaffold files did not drift back toward the legacy `src/agentic_tools_old` layout.

## Folder Model

```text
src/agentic_tools/
  main/
    cli.py
    cli_test.py
    spec.md
    translations/en.json
  features/
    <feature>/
      main.py
      main_test.py
      spec.md
      translations/en.json
  core/
    <concern>/
      main.py
      main_test.py
```

## Core Rules

- Keep `src/agentic_tools/main/cli.py` as the unique installed Python entrypoint for the new app.
- Put user-facing product behavior under `src/agentic_tools/features/<feature>/`.
- Put foundational application plumbing under `src/agentic_tools/core/<concern>/`.
- Use `core` for configuration setup, i18n wiring, logging setup, database/session setup, and focused wrappers around third-party libraries.
- Do not put domain behavior or feature commands in `core`.
- Do not create generic `utils` or `helpers` folders in the new package; choose a named `core/<concern>` or `features/<feature>` folder instead.
- Do not create `__init__.py` files just to make directories importable. This repo targets modern Python and uses namespace packages unless package-level code is genuinely needed.
- Keep `src/agentic_tools_old` as the legacy implementation boundary. New implementation work belongs under `src/agentic_tools` unless the task explicitly maintains the legacy package.

## Naming Decisions

- `main`: app-level command composition and CLI entrypoint code.
- `features`: product capabilities and user-facing command groups.
- `core`: foundational app plumbing and third-party library integration that features depend on.
- `shared`: only for domain-agnostic contracts that multiple features must agree on. Do not add it until a real shared contract exists.
- `infrastructure` or `infra`: only for strict DDD-style external adapters or infrastructure concerns that are too large or specific for `core`. This is not the default in this repo.

## Translation Placement

- Keep root CLI translation lines under `src/agentic_tools/main/translations/en.json`.
- Keep feature translation lines under `src/agentic_tools/features/<feature>/translations/en.json`.
- Keep translation library setup under `src/agentic_tools/core/translations/main.py`.
- Feature modules should import the small translation helper from `core/translations/main.py` instead of configuring `python-i18n` themselves.

## Review Checklist

- Does each moved file have one clear owner: entrypoint, feature, or core plumbing?
- Is any feature behavior hiding in `core`, `shared`, `utils`, or `helpers`?
- Is any third-party setup mixed directly into feature domain code?
- Are translation files colocated with the entrypoint or feature whose strings they contain?
- Are tests close to the code they exercise?
- Are there avoidable `__init__.py` files in the new package?
- Does validation still prove the moved import paths work?

## Validation

For a narrow scaffold or folder-layout change, run:

```text
uv run python -m pytest src/agentic_tools/main/cli_test.py -q
uv run python -m black --check src/agentic_tools
uv run python -m pyright src/agentic_tools src/typings
```

For broader changes that touch shared repo config or the legacy package boundary, prefer the full repo validation tasks from `.agents/skills/ref-code-conventions/SKILL.md`.
