# Repo Conventions Review Checklist

Use before finalizing a placement, scaffold, or `pyproject.toml` change.

## Placement and layout

- Does each file have one clear owner: app entrypoint (`main`), a feature, or `core` plumbing?
- Is any feature behavior hiding in `core`, `shared`, `utils`, or `helpers`?
- Is any third-party setup mixed directly into feature domain code instead of a `core/<concern>` wrapper?
- Are tests collocated with the code they exercise (`*_test.py`), with no top-level `tests/` folder?
- Are there avoidable `__init__.py` files in the new package?
- Does the top-level folder choice match responsibility: packaged product code (`src/`), repo maintenance (`scripts/`), agent guidance (`.agents/`), or provider routing?

## Configuration and wiring

- Does `pyproject.toml` keep installed entrypoints under `[project.scripts]` and dev workflows under `[tool.poe.tasks]`?
- Does the package directory match the normalized import path even though the distribution name uses dashes?
- Is `[tool.hatch.build.targets.wheel].packages` aligned with the actual packaged source tree?
- Do repo-local helper scripts stay in `scripts/` unless they are genuinely part of the shipped product?
- Do skill support files live beside their `SKILL.md` under `references/`, `assets/`, `evals/`, or `scripts/`?
- Do thin provider stubs (`GEMINI.md`, `.claude/CLAUDE.md`) route back to the main instructions instead of duplicating rules?

## Translations and boundary

- Are translation files colocated with the entrypoint or feature whose strings they contain?
- Do features import the configured i18n helper from `core/i18n` rather than configuring the raw library?
- Did reset-era scaffolding stay under `src/agentic_tools` without drifting back toward `src/agentic_tools_old`?

## Validation

- Does validation still prove the moved import paths work (`uv run poe typecheck` / targeted pytest)?
