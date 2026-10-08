---
name: ref-sp-py-python
description: "Python defaults: type hints and Pyright-friendly typing, uv and Poe, side-effect-free imports, CLI vs maintenance scripts, packaging boundaries, and collocated tests. Use when writing, refactoring, or packaging Python code."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "py"
  shareable-skills.visibility: "public"
---

# Python

Portable Python defaults. Language-neutral rules (naming, comments, CLI ergonomics, the import
side-effect rule) are `ref-sp-dev-coding-patterns`; folder boundaries are
`ref-sp-dev-projects-architecture`; a repo's exact names and commands are its conventions skill (here,
`ref-sp-dev-repo-conventions`).

## Basics

- `pathlib.Path` over path strings; dataclasses, `TypedDict`, or small domain objects over loose
  dicts when structure matters; explicit exceptions with clear messages over silent fallbacks.
- `uv` for dependencies, environments, and running commands, unless the repo mandates another
  workflow. Use the repo's formatter, type checker, and test tasks when they exist.

## Typing

- Type function parameters clearly.
- Prefer inferred return types for private/local helpers whose implementation makes the result obvious to the checker and reader.
- Add return annotations for public APIs, shared protocol or callback contracts, abstract methods, recursive functions, overload-style dispatch, CLI entrypoints, and cases where inference would become `Any`, `object`, or an overly broad union.
- On modern Python baselines, use standard annotation syntax directly instead of future-compatibility imports for postponed annotations.
- Prefer precise container types like `list[str]` or `dict[str, int]`.
- Prefer `object` plus narrowing, focused casts, or type guards at unknown input boundaries instead of defaulting to `Any`.
- Reserve `Any` for rare interoperability gaps that cannot be expressed cleanly with narrower types.
- Use `Protocol`, `TypedDict`, dataclasses, or type aliases when they improve readability.
- Prefer type guards and restructuring over `# type: ignore`.
- Treat type hints as the checked parameter contract: Pyright and mypy verify annotations but never read docstring `Args:`, `:param`, or `Returns:` blocks, so a docstring that restates the signature drifts silently and no type check catches it.
- Prefer not to restate typed parameters in prose; if a project genuinely needs API docstrings, enforce them with a dedicated docstring linter, not the type checker. Prefer `pydoclint` — actively maintained, runs standalone or as a pre-commit hook, and adds no new lint stack; `darglint` is unmaintained. Ruff's equivalent `DOC` rules are still preview-only, so do not pull in Ruff just for docstring checks.

## Structure

- Group related modules by feature or responsibility.
- Keep tests close to the behavior they cover when the repo layout supports it.
- Extract helper modules only when the behavior is truly shared or the file has become hard to navigate.
- On modern Python baselines, do not create `__init__.py` files solely to make directories importable; use implicit namespace packages unless package-level code is actually needed.

## Module initialization

`import module` runs the whole top level, so a module-scope `client = SomeClient(...)` works at
import time and makes import order matter. Use a factory or a lazy accessor (a `get_client()`,
optionally memoized with `functools.lru_cache`); keep module scope to constants, type aliases, and
inert values. Module-scope instantiation of a stateful object is a deliberate, stated decision.
In tests, prefer fixtures over import-time setup.

```python
# avoid: runs at import time, import order now matters
client = ApiClient(os.environ["API_URL"])

# prefer: construction deferred to call time
def get_client() -> ApiClient:
    return ApiClient(settings.api_url)
```

## CLI and scripts

- If a command is part of the installed product, expose a clear `main()` function and register it as an entrypoint.
- If a `uv`-managed repo needs a development task for an installed dependency, prefer a Poe task that calls the dependency's console command through `uv run`, for example `sync-shared-tool = "uv run shared-tool sync"`, instead of a pass-through script like `python scripts/run_sync.py`.
- If code is only for repo maintenance or one-off automation, keep it as a script.
- Use descriptive subcommands and flags for multi-action CLIs.

## Packaging boundaries

- `[project.scripts]` is distribution metadata, not a local convenience: it becomes `entry_points.txt` inside the built artifact. There is no internal-only entrypoint, so a command meant to stay in the repo belongs in the task runner instead.
- Keep repo maintenance directories out of the distributed package list. Shipping them installs test files and repo-mutating scripts into every consumer's environment.
- Never distribute a generic top-level import name such as `scripts`, `utils`, `common`, or `i18n`. A directory with no `__init__.py` is a namespace package, so it merges across `sys.path` and silently shadows a consumer's same-named package — the consumer's own code loses, because installed paths usually sort ahead of theirs.
- Do not derive a repo root from `__file__` in a module that can be installed. Once it is copied into `site-packages` the path resolves to the venv rather than the checkout. Walk up from the working directory, or keep the module out of the distribution.

## Testing

- Add unit tests for non-trivial logic and error cases.
- Prefer small builders, fixtures, or factory helpers over giant setup blocks.
- Keep test names specific enough that failures are easy to localize.

## Example layouts

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
  init_project.py
  init_project_test.py
```

Give it a task-runner entry rather than a `[project.scripts]` one, so it keeps a first-class
invocation without becoming distribution metadata:

```toml
[tool.poe.tasks]
init-project = "python scripts/init_project.py"
```

Invoked as `uv run poe init-project --name cool-app`; a `cmd`-type task forwards arguments through
unchanged. The task table is read from the working tree and never lands in the built wheel, which is
what makes it internal-only in a way `[project.scripts]` cannot be. The payoff beyond packaging is
consistency: every documented command in the repo becomes `uv run poe <task>`, instead of one script
path standing out from the rest.

## Before finishing

- After `uv build`, list the wheel (`unzip -l dist/*.whl`): no maintenance directories or test files
  ship in it.

## References

- Read `./references/checklist.md` for a quick Python review pass.
