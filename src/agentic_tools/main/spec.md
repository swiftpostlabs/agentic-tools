# Main CLI Spec

This file documents the intended shape of the new top-level CLI.

## Goals

- Keep one root Python entrypoint in `main/cli.py`.
- Mount feature-specific subcommands from dedicated `features/<feature>/` folders.
- Keep foundational app plumbing under `core/<concern>/`.
- Avoid creating `__init__.py` files for scaffold directories; modern Python namespace packages are enough here.
- Start with placeholder behavior while the new implementation is designed.

## Example Commands

```text
uv run agentic-tools --help
uv run agentic-tools skills --help
uv run agentic-tools skills list
```

## Current Scaffold Behavior

- The root command prints help when called without a subcommand.
- The `skills` command group is registered.
- `skills list` is a placeholder and performs no real action.
