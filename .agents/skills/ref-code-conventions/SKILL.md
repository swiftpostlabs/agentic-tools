---
name: ref-code-conventions
description: "Reference guidance for conventions and workflows in this Python project using Black, Pyright (strict), and pytest, with a feature-first layout. Use when: creating features, updating tests, adjusting project config, or working with source code."
metadata:
  shareable-skills.visibility: "repo-local"
---

# Project Conventions

## Purpose

Help the agent work within this project in a way that respects its structure, typing rules, and tooling, so the project stays clean and maintainable.

## Values

- Prefer simplicity over cleverness.
- Prefer maintainability over short-term convenience.
- Prefer explicit structure and predictable behavior over hidden magic.

## Project context

- Language: Python
- Distribution name: `agentic-tools`
- Package name: `agentic_tools`
- Source layout: `src/agentic_tools`
- Feature-first structure:
  - `src/agentic_tools/skills_management/`
  - `src/agentic_tools/<feature>/`
  - Each feature keeps its code and tests close together.
- Tooling:
  - Hatch for packaging
  - uv for dependency management
  - Black for formatting
  - Pyright with strict type checking
  - pytest for testing
  - `poethepoet` tasks under `[tool.poe.tasks]`

## When to use this skill

- Creating or updating features under `src/agentic_tools/<feature_name>/`.
- Adding or updating tests for a feature.
- Creating CLI entrypoints or tasks.
- Adjusting project configuration related to Pyright, Black, pytest, or Poe tasks.

## Scope boundaries

- Use this skill for repo-specific Python defaults in this repository, especially the actual package name, command wrappers, and file placement conventions.
- Use `.agents/skills/ref-python/SKILL.md` for portable Python structure, typing, and CLI guidance.
- Use `.agents/skills/ref-coding-patterns/SKILL.md` for language-agnostic naming, control-flow, comment, and testing defaults.
- Use `.agents/skills/ref-project-structure-setup/SKILL.md` for top-level repo wiring such as `pyproject.toml`, `.agents/skills/`, and `scripts/`.

## Structure and file placement

- Use a **feature-first** approach:
  - Group related code under `src/agentic_tools/<feature_name>/`.
  - If a feature is self-contained, put its unit tests in the same feature folder, e.g.:
    - `src/agentic_tools/feature/feature.py`
    - `src/agentic_tools/feature/feature_test.py`
- Example of a feature structure
  - `src/agentic_tools/feature/`
    - `main.py`
    - `main_test.py`
    - `types.py` (optional, may contain additional types used in the feature)
    - `api/`
      - `entity_api.py` (e.g fetching an endpoint)
    - `models`/
      - `entity.py` (e.g. Pydantic models)
      - `entity_test.py` (may contain or import mocks to test the model)
    - `services/`
      - `entity_service.py`
      - `entity_service_test.py`

- Do not create a separate top-level `tests` folder.
- Keep module and test names descriptive and consistent.

## Additional utilities

- Add shared utilities only after real reuse appears across features.
- When they are justified, keep them under `src/agentic_tools/utils/` with purpose-based subfolders.
- Example:
- `src/agentic_tools/utils/`
  - `web/`
    - `parser.py`
    - `parser_test.py`
    - `webdriver.py`
    - `webdriver_test.py`

## Typing rules

- Use clear, explicit typing everywhere:
  - Avoid untyped containers like `dict`, `list`, `tuple`, `set`.
  - Prefer precise types such as `dict[str, str]`, `list[int]`, `tuple[str, int]`, etc.
- For complex types, consider defining custom type aliases or data classes to improve readability.
- Inference is encouraged over explicit typing when typing is sound.
- For functions, always provide type annotations for parameters, but return types can be omitted if they are `None` or if the function has sound typing and is well-named. 
- Treat Pyright strict mode seriously:
  - Fix type issues by improving annotations, adding type guards, or restructuring code.
  - Prefer explicit checks and type guards (e.g. `isinstance` checks) over `# type: ignore`.
  - Treat `# type: ignore` as highly discouraged. Use it only as a last resort, with a short comment explaining why the type system cannot express the case cleanly.
- For third-party libraries without type annotations:
  - Best option: install appropriate type stub packages first, usually from common `types-...` distributions when available.
  - Fallback option: create minimal local stubs in `src/typings` that cover only the used surface of the library API.
  - Do both of those before falling back to `# type: ignore`.

## CLI and scripts

- When a file is meant to be run from the command line:
  - Prefer `[project.scripts]` for Python entrypoints whenever the command belongs to the installed project.
  - For packaged application code under `src/agentic_tools`, expose a clear function such as `main()` inside a feature folder like `src/agentic_tools/<feature>/main.py` and register it in `[project.scripts]`.
  - For standalone maintenance or repository scripts that already live in `scripts/`, keep them there unless the user explicitly asks to promote them into `src/agentic_tools`.
  - If the command is a user-facing feature of this repo rather than maintenance glue, put it under `src/agentic_tools/<feature>/` with collocated tests instead of leaving it in `scripts/`.
  - For those standalone `scripts/` utilities, `if __name__ == "__main__":` is acceptable.
  - Ask explicitly before moving an existing script into `src/agentic_tools` or changing how the user runs it.
- If the script is not simple Python or better modeled as a task:
  - Add it under `[tool.poe.tasks]` with an appropriate name.
  - Keep Poe as a fallback for orchestration or shell-like commands that do not fit cleanly into `[project.scripts]`.

## Testing conventions

- If a feature is self-contained, add a unit test module next to it:
  - `feature.py` → `feature_test.py` in the same feature directory.
  - Test functions should be named like `test_my_feature()` when testing `my_feature()` in `feature.py`.
- Follow the existing pytest configuration:
  - Tests live under `src`, matching `*_test.py`.
- When adding or changing behavior:
  - Add at least one unit test for non-trivial logic.
  - Prefer focused, readable tests over large, multi-purpose ones.

## Tools and commands

When proposing changes, the agent should keep these commands in mind:

- `uv run poe test` → run pytest tests.
- `uv run poe lint` → run Black in check mode.
- `uv run poe lint-fix` → format code with Black.
- `uv run poe typecheck` → run Pyright on `./src`.

Prefer the Poe tasks above as the standard validation entrypoints. Use raw `pytest`, `black`, or `pyright` only when there is a concrete need for direct tool behavior, focused flags, or debugging that the Poe task does not expose.

## General guidance for the agent

- Prefer small, incremental changes aligned with the feature-first layout.
- Prefer the simplest change that keeps the code easy to maintain.
- Maintain readability and consistency over cleverness.
- When in doubt about structure or naming, favor clarity and alignment with these conventions.
