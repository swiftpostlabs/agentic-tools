# pyproject.toml Configuration Hub and Tooling

`pyproject.toml` is the **single source of truth** for project configuration; all tools read from it. Load this file when you need the section-by-section detail behind the summary in `../SKILL.md`.

## Sections and their roles

### `[project]`
Package metadata distributed to users: `name` (distribution name — `agentic-tools`, dashes are fine even though the import path is `agentic_tools`), `version`, `dependencies` (runtime), plus `readme`, `license`, `authors`.

### `[dependency-groups]`
Development-only dependencies (uv feature), kept separate from runtime deps. `uv sync` installs all groups.

```toml
[dependency-groups]
dev = [
  "poethepoet>=0.34.0",  # task runner
  "pytest>=9.0",         # tests
  "black>=25.1.0",       # formatter
  "pyright>=1.1.400",    # type checker
]
```

### `[project.scripts]`
Installed CLI entrypoints. Feature CLIs route through the grouped `agentic-tools` entrypoint rather than standalone package scripts.

```toml
[project.scripts]
agentic-tools = "agentic_tools.main:main"
```

### `[tool.poe.tasks]`
Development tasks (not distributed). Use for testing/linting/type-checking and shell orchestration. If a command should be an installed entrypoint, put it in `[project.scripts]` instead.

```toml
[tool.poe.tasks]
test = "python -m pytest"
lint = "python -m black --check ./src"
lint-fix = "python -m black ./src"
typecheck = "python -m pyright ./src"
```

### `[tool.pyright]`
Strict type checking: `typeCheckingMode = "strict"`, `pythonVersion = "3.14"`, `stubPath = "src/typings"` for custom stubs. Typing rules live in `../SKILL.md`.

### `[tool.pytest.ini_options]`
`testpaths = ["src", "scripts"]`, `python_files = ["*_test.py"]`, `addopts = "--import-mode=importlib"`.

### `[tool.hatch.build.targets.wheel]`
`packages = ["src/agentic_tools"]` — keep aligned with the packaged source tree.

## Tool command reference

| Tool | Command | Via | Purpose |
|------|---------|-----|---------|
| pytest | `uv run poe test` | Poe task | Run unit tests |
| Black | `uv run poe lint` | Poe task | Check formatting |
| Black | `uv run poe lint-fix` | Poe task | Auto-format |
| Pyright | `uv run poe typecheck` | Poe task | Strict type-check |
| AI policy sync | `uv run agentic-tools policy sync` | Project script | Regenerate agent config from `.agents/config.json` |
| AI policy import | `uv run agentic-tools policy import-vscode` | Project script | Import VS Code approvals, then sync |

All commands run through `uv run` in the managed environment.

## Setup and maintenance workflow

- **First-time:** install uv → clone → `uv sync` → verify with `uv run poe typecheck`.
- **Before a task:** `git pull`, rebase if needed, `uv sync`, create a feature branch.
- **Before committing:** `uv run poe lint-fix` → `uv run poe typecheck` → `uv run poe test`; commit only when all pass.

## Repo placement guide

| Scenario | Where | Why |
|----------|-------|-----|
| Packaged Python feature | `src/agentic_tools/features/<feature>/` | Shipped behavior belongs under the package root |
| Repo-only automation/migration helper | `scripts/` | Keeps maintenance out of the product package |
| Installed command wiring | `[project.scripts]` | Entry points belong in packaging config |
| Dev workflow command | `[tool.poe.tasks]` | Task wrappers live in Poe, not shipped entrypoints |
| Skill guidance | `.agents/skills/<skill>/` | Agent-facing guidance stays in the skills tree |
| Provider routing stub | `GEMINI.md` / `.claude/CLAUDE.md` | Thin, point back to the main instructions |

For portable boundary calls (feature vs shared utility, product vs maintenance), defer to `.agents/skills/ref-sp-dev-projects-architecture/SKILL.md`.

## Common config tasks

- **New dev dependency:** add to `[dependency-groups].dev`, `uv sync`, configure under `[tool.<tool>]`.
- **New Poe task:** add to `[tool.poe.tasks]`, run `uv run poe <task>`.
- **New CLI entry point:** implement under `src/agentic_tools/<feature>/`, add to `[project.scripts]` (`my-command = "agentic_tools.<feature>.main:main"`), `uv sync`, run `my-command`.
