# Skills Subcommand Spec

This file documents the intended shape of the new `skills` command group.

## Goals

- Keep `features/skills/main.py` as the owner of the `skills` subcommands.
- Avoid creating `__init__.py` files for scaffold directories; modern Python namespace packages are enough here.
- Expand from no-op placeholders into real commands in later passes.

## Example Commands

```text
uv run agentic-tools skills --help
uv run agentic-tools skills list
```

## Current Scaffold Behavior

- `skills` prints help when called without a subcommand.
- `skills list` prints a placeholder message and exits successfully.
