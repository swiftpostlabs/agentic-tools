---
name: ref-project-structure-setup
description: "Reference guidance for project folder layout, organization, pyproject.toml configuration hub, and tool setup. Use when: understanding the project architecture, locating where code goes, understanding tool configuration, configuring new tools, or explaining the project structure to others."
metadata:
   shareable-skills.visibility: "shareable"
argument-hint: "Optional: aspect to explain (e.g., 'folder structure', 'pyproject.toml', 'poe tasks')"
---

# Project Structure and Setup

## Purpose

Guide understanding of the project's physical organization, central configuration through `pyproject.toml`, and how tools are integrated. This ensures consistent setup, proper file placement, and correct tool usage.

## Folder Structure

```

├── ./
├── .github/
│   └── copilot-instructions.md # Project guidance for GitHub Copilot
├── .agents/
│   └── skills/                 # Custom agent workflow skills
├── src/
│   └── <project_name>/         # Main package (matches pyproject.toml [project].name)
│       ├── main.py             # CLI entrypoint or main module
│       ├── main_test.py        # Unit tests (collocated with source)
│       └── <feature>/          # Feature folders follow feature-first layout
│           ├── feature.py      # Feature implementation
│           ├── feature_test.py # Feature tests
│           └── module.py       # Supporting modules as needed
├── scripts/
│   ├── *.py                    # Maintenance scripts
│   └── *_test.py               # Script tests (optional)
├── pyproject.toml              # Central configuration hub for all tools
├── GEMINI.md                   # Provider routing stub for Gemini
└── .claude/
   └── CLAUDE.md               # Provider routing stub for Claude
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/my_project/` | Main package source code. Organize using feature-first approach: each feature gets its own subdirectory. |
| `src/my_project/<feature>/` | Feature-specific code and tests, kept together. Tests use `*_test.py` naming. |
| `scripts/` | Utility scripts for maintenance, automation, or testing. Keep repo features out of `scripts/`; if a command is part of the product surface, put it under `src/my_project/<feature>/` instead. |
| `.agents/skills/` | Custom agent workflow skills (loaded by GitHub Copilot on-demand). Each skill in its own folder with `SKILL.md`. |
| `.github/` | Project-wide configuration including copilot instructions and agent definitions. |

## pyproject.toml: The Configuration Hub

The `pyproject.toml` file is the **single source of truth** for project configuration. All tools read from this file, ensuring consistency across the project.

### Sections and Their Roles

#### `[project]`
Defines metadata about the package distributed to users:
- `name`: Package name (used in `src/` folder organization)
- `version`: Semantic version for releases
- `dependencies`: Runtime dependencies (required by users)
- `readme`, `license`, `authors`: Metadata for package distribution

#### `[dependency-groups]`
Organizes development-only dependencies (uv feature):
```toml
[dependency-groups]
dev = [
  "poethepoet>=0.34.0",  # Task runner
  "pytest>=9.0",         # Test framework
  "black>=25.1.0",       # Code formatter
  "pyright>=1.1.400"     # Type checker
]
```

**Why here?** Keeps development tools separate from runtime dependencies. Use `uv sync` to install all groups.

#### `[project.scripts]`
Defines CLI entry points installed as shell commands:
```toml
[project.scripts]
main = "my_project.main:main"
```

This creates a `main` command that calls the `main()` function in `my_project/main.py`. Users get it automatically via `pip install`.

#### `[tool.poe.tasks]`
Defines development tasks (not distributed to users):
```toml
[tool.poe.tasks]
test = "python -m pytest"
lint = "python -m black --check ./src"
lint-fix = "python -m black ./src"
typecheck = "python -m pyright ./src"
```

**When to use:** Use `[tool.poe.tasks]` for:
- Development workflows (testing, linting, type-checking)
- Complex shell orchestration
- Commands that shouldn't be distributed with the package

For this repo, treat the Poe validation tasks as the default entrypoints for day-to-day checks. Reach for the underlying tool directly only when you specifically need flags or behavior that the task wrapper does not provide.

**When NOT to use:** If the command should be invoked as an installed Python entrypoint, define it in `[project.scripts]` instead.

#### `[tool.pyright]`
Type checker configuration in **strict mode**:
- `typeCheckingMode = "strict"` enforces complete type coverage
- `pythonVersion = "3.14"` targets Python 3.14
- Rules tune warning/error levels for project needs
- `stubPath = "src/typings"` allows custom type stubs for untyped libraries

See C:/Users/fcole/Projects/swiftpost-shareable-skills/.agents/skills/ref-code-conventions/SKILL.md for typing rules.

#### `[tool.pytest.ini_options]`
Test framework configuration:
- `testpaths = ["src", "scripts"]` — collect tests from these directories
- `python_files = ["*_test.py"]` — recognize test modules ending in `_test.py`
- `addopts = "--import-mode=importlib"` — use modern import detection

#### `[tool.hatch.build.targets.wheel]`
Build configuration for packaging:
```toml
[tool.hatch.build.targets.wheel]
packages = ["src/my_project", "scripts"]
```

Tells the build system which folders are included in the wheel when installed entrypoints need code from them.

## Tool Command Reference

Prefer these commands over calling the underlying tools directly during normal work. For example, use `uv run poe test` instead of raw `pytest` unless you need focused pytest flags for debugging.

| Tool | Command | Via | Purpose |
|------|---------|-----|---------|
| **pytest** | `uv run poe test` | Poe task | Run unit tests |
| **Black** | `uv run poe lint` | Poe task | Check code formatting |
| **Black** | `uv run poe lint-fix` | Poe task | Auto-format code |
| **Pyright** | `uv run poe typecheck` | Poe task | Type-check in strict mode |
| **AI policy sync** | `uv run sync-ai-policy` | Project script | Regenerate agent config from `.ai-policy.json` |
| **AI policy import** | `uv run sync-ai-policy-import-vscode` | Project script | Import VS Code approvals into policy, then sync |
| **Update script** | `uv run poe update-from-upstream` | Poe task | Fetch updates from template |

All commands use `uv run` to execute in the managed environment.

## Setup and Maintenance Workflow

### First-Time Setup
1. Install uv: [uv documentation](https://docs.astral.sh/uv/)
2. Clone the repository
3. Run `uv sync` to install all dependencies and development tools
4. Verify setup: `uv run poe typecheck` should complete without errors

### Before Starting Work on a Task
1. **Pull latest changes**: `git pull`
2. **Rebase if needed**: `git rebase origin/main` (or your default branch)
3. **Reinstall dependencies**: `uv sync` (ensures consistency after dependencies change)
4. **Create feature branch**: `git checkout -b feature-name`

### Quality Checks Before Committing
Run validation in sequence:
```bash
uv run poe lint-fix    # Auto-format code
uv run poe typecheck   # Ensure strict typing
uv run poe test        # Run tests
```

Only commit after all checks pass.

## File Placement Decision Guide

| Scenario | Where to Put It | Why |
|----------|-----------------|-----|
| New feature code | `src/my_project/<feature_name>/<feature_name>.py` | Keeps features self-contained and discoverable |
| Tests for a feature | `src/my_project/<feature_name>/<feature_name>_test.py` (same folder) | Collocates test with code for easy maintenance |
| Shared utilities | `src/my_project/utils/<category>/<tool>.py` | Consolidates reusable code; doesn't clutter feature folders |
| Maintenance script | `scripts/<script_name>.py` | Separate from package code; use only for repo maintenance, automation, migrations, or one-off helpers |
| CLI command (user-facing) | `src/my_project/<feature>/main.py`, register in `[project.scripts]` | Product-facing commands belong to a feature folder under `src`, with code and tests kept together |
| Configuration file | Top-level in repo, reference from `pyproject.toml` | Makes it discoverable and avoids duplication |
| Type stubs (for untyped libraries) | `src/typings/<library_name>.pyi` | Isolated from main code; Pyright reads this directory |

## Common Tasks with Configuration

### Adding a New Development Dependency
1. Update `[dependency-groups].dev` in `pyproject.toml`:
   ```toml
   [dependency-groups]
   dev = ["existing-tool", "new-tool>=1.0"]
   ```
2. Run `uv sync` to install
3. Configure the new tool in `pyproject.toml` under `[tool.new-tool]`

### Creating a New Poe Task
1. Add to `[tool.poe.tasks]`:
   ```toml
   [tool.poe.tasks]
   my-task = "command here"
   ```
2. Run: `uv run poe my-task`

### Creating a New CLI Entry Point
1. Create module with a `main()` function in `src/my_project/<feature>/`
2. Add to `[project.scripts]`:
   ```toml
   [project.scripts]
   my-command = "my_project.module:main"
   ```
3. Reinstall: `uv sync`
4. Run: `my-command` (available as shell command)

If the implementation intentionally stays in `scripts/`, the entrypoint may target `scripts.<module>:main` instead, provided the wheel includes `scripts`. Use that only for maintenance or repo-local automation, not for product features that belong under `src/my_project/<feature>/`.

## See Also

- C:/Users/fcole/Projects/swiftpost-shareable-skills/.agents/skills/ref-code-conventions/SKILL.md — Code writing standards and feature-first layout details
- C:/Users/fcole/Projects/swiftpost-shareable-skills/.agents/skills/ref-agent-behavior/SKILL.md — Project persona and workflow expectations
- [pyproject.toml reference](../../pyproject.toml) — Actual configuration file
- [uv documentation](https://docs.astral.sh/uv/) — Package manager and runner
- [poethepoet documentation](https://poethepoet.naiveapproach.com/) — Task runner
