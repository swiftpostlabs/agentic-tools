---
name: ref-project-structure-setup
description: "Reference guidance for project folder layout, organization, pyproject.toml configuration hub, and tool setup. Use when: understanding the project architecture, locating where code goes, understanding tool configuration, configuring new tools, or explaining the project structure to others."
metadata:
   shareable-skills.visibility: "repo-local"
argument-hint: "Optional: aspect to explain (e.g., 'folder structure', 'pyproject.toml', 'poe tasks')"
---

# Project Structure and Setup

## Purpose

Guide understanding of this repository's physical layout, central configuration through `pyproject.toml`, and where tool wiring lives. Use this skill to locate code and config in this repo, not to restate generic architecture or language-specific patterns that belong to the dedicated skills.

## When to use this skill

- Locating the repo surface that owns packaging, entrypoints, validation tasks, or agent config.
- Explaining how this repository is wired together at the top level.
- Deciding which top-level folder a new file belongs in.
- Reviewing whether a question is about repo structure, generic architecture, or language-specific layout.

## Scope boundaries

- Use this skill for repo-specific placement and tool wiring such as `pyproject.toml`, `.agents/skills/`, `scripts/`, or the package root under `src/`.
- Use `.agents/skills/ref-architecture/SKILL.md` for portable structure patterns such as feature-first organization, shared-utility thresholds, and product-vs-maintenance boundaries.
- Use `.agents/skills/ref-python/SKILL.md` for Python-specific feature layouts such as `src/<package>/<feature>/`.
- Use `.agents/skills/ref-javascript/SKILL.md` and `.agents/skills/ref-typescript/SKILL.md` for language-specific JS or TS guidance, including package-level layout and monorepo-friendly paths like `packages/<package-name>/src/<feature>/` when that style fits the repo.

## Folder Structure

```

├── ./
├── .github/
│   └── copilot-instructions.md # Project guidance for GitHub Copilot
├── .agents/
│   └── skills/                 # Custom agent workflow skills
├── src/
│   └── agentic_tools/          # Python package root for shipped code
│       ├── main.py             # Small package entrypoint/example module
│       ├── main_test.py        # Collocated test for the package root module
│       └── skills_management/  # Packaged feature folder for the skills CLI
│           ├── main.py         # CLI implementation and parser wiring
│           └── main_test.py    # Feature tests
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
| `src/agentic_tools/` | Main Python package for shipped code. The package path uses underscores even though the project name in `pyproject.toml` is `agentic-tools`. |
| `src/agentic_tools/<feature>/` | Packaged feature code and its tests. For placement rules and feature-folder shape, defer to `.agents/skills/ref-python/SKILL.md` and `.agents/skills/ref-architecture/SKILL.md`. |
| `scripts/` | Repo maintenance, transition helpers, and automation that are not part of the packaged product surface. |
| `.agents/skills/` | Custom agent workflow skills (loaded by GitHub Copilot on-demand). Each skill in its own folder with `SKILL.md`. |
| `.github/` | Project-wide configuration including Copilot instructions. |
| `.claude/` and `GEMINI.md` | Thin routing stubs that point other clients back to the Copilot instructions. |

## pyproject.toml: The Configuration Hub

The `pyproject.toml` file is the **single source of truth** for project configuration. All tools read from this file, ensuring consistency across the project.

### Sections and Their Roles

#### `[project]`
Defines metadata about the package distributed to users:
- `name`: Distribution name shown to installers and packaging tools
- `version`: Semantic version for releases
- `dependencies`: Runtime dependencies (required by users)
- `readme`, `license`, `authors`: Metadata for package distribution

In this repo, `name = "agentic-tools"` while the importable package is `src/agentic_tools/`. That normalization is normal for Python packaging; do not assume the folder name must literally include dashes.

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
main = "agentic_tools.main:main"
skills-management = "agentic_tools.skills_management.main:main"
```

This is where installed commands are wired. In this repo, the packaged skills CLI is exposed from `src/agentic_tools/skills_management/main.py`.

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

See .agents/skills/ref-code-conventions/SKILL.md for typing rules.

#### `[tool.pytest.ini_options]`
Test framework configuration:
- `testpaths = ["src", "scripts"]` — collect tests from these directories
- `python_files = ["*_test.py"]` — recognize test modules ending in `_test.py`
- `addopts = "--import-mode=importlib"` — use modern import detection

#### `[tool.hatch.build.targets.wheel]`
Build configuration for packaging:
```toml
[tool.hatch.build.targets.wheel]
packages = ["src/agentic_tools"]
```

Tells the build system which package directories are shipped. Keep this aligned with the actual packaged source tree.

## Routing Examples

Use the smallest skill that owns the decision:

| Question | Start here | Why |
|----------|------------|-----|
| Where is the installed skills CLI wired? | This skill, then `pyproject.toml` and `src/agentic_tools/skills_management/main.py` | This is repo wiring, not a generic language rule. |
| Should a new reusable parser live in a feature folder or a shared utility area? | `.agents/skills/ref-architecture/SKILL.md` | That is a portable boundary decision. |
| Where should a new Python feature live? | `.agents/skills/ref-python/SKILL.md` | Python feature layout belongs to the Python skill. |
| Should a new repo helper live in `scripts/` or under `src/agentic_tools/`? | This skill first, then `.agents/skills/ref-architecture/SKILL.md` if the boundary is unclear | The top-level folder choice is repo-specific, but the product-vs-maintenance rule is architectural. |
| Where do skill support files go? | This skill | The answer is repo-specific: `.agents/skills/<skill-name>/references`, `assets`, `evals`, or `scripts`. |
| How should a TypeScript or JavaScript package be laid out in a monorepo? | `.agents/skills/ref-typescript/SKILL.md` or `.agents/skills/ref-javascript/SKILL.md` | That is language and package-layout guidance, not repo wiring. |

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

## Repo Placement Guide

| Scenario | Where to Start | Why |
|----------|----------------|-----|
| Packaged Python feature | `src/agentic_tools/<feature>/` | Shipped behavior belongs under the package root; see `.agents/skills/ref-python/SKILL.md` for the feature layout details. |
| Repo-only automation or migration helper | `scripts/` | Keeps maintenance code out of the product package. |
| Installed command wiring | `[project.scripts]` in `pyproject.toml` | Entry points belong in the packaging config. |
| Dev workflow command | `[tool.poe.tasks]` in `pyproject.toml` | Repo task wrappers live in Poe, not in shipped entrypoints. |
| Skill guidance | `.agents/skills/<skill-name>/` | Agent-facing guidance stays in the skills tree with its own `SKILL.md`. |
| Provider routing stub | `GEMINI.md` or `.claude/CLAUDE.md` | These files stay thin and point back to the main project instructions. |

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
1. Create the feature implementation under `src/agentic_tools/<feature>/`.
2. Add to `[project.scripts]`:
   ```toml
   [project.scripts]
   my-command = "agentic_tools.<feature>.main:main"
   ```
3. Reinstall: `uv sync`
4. Run: `my-command` (available as shell command)

If the implementation intentionally stays in `scripts/`, keep it a repo-local maintenance command unless there is a strong reason to ship it. Product features should not stay hidden in `scripts/`.

## References

- Read `./references/checklist.md` for a quick review pass on repo placement and `pyproject.toml` consistency.
- Read `./assets/trigger-eval-queries.example.json` when testing whether repo-structure questions trigger this skill instead of the portable architecture or language skills.

## See Also

- .agents/skills/ref-architecture/SKILL.md — Portable structure patterns, boundaries, and shared-utility rules
- .agents/skills/ref-python/SKILL.md — Python feature layout, CLI placement, and testing patterns
- .agents/skills/ref-javascript/SKILL.md — JavaScript structure and JSDoc guidance
- .agents/skills/ref-typescript/SKILL.md — TypeScript layout and runtime-boundary guidance
- .agents/skills/ref-agent-behavior/SKILL.md — Project persona and workflow expectations
- [pyproject.toml reference](../../pyproject.toml) — Actual configuration file
- [uv documentation](https://docs.astral.sh/uv/) — Package manager and runner
- [poethepoet documentation](https://poethepoet.naiveapproach.com/) — Task runner
