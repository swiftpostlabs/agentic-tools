# Another Repo Via Skills-Management

Use this mode when the target repo can reference or link skills instead of copying them by hand.

## Default workflow

1. Identify the selected skills.
2. Confirm every selected skill is `shareable`.
3. Include hard dependencies from `shareable-skills.requires`.
4. Prefer `.agents/config.json` plus `uv run agentic-tools skills sync` when the target repo should keep tracking this repo as the source.
5. Prefer `uv run agentic-tools skills link <skill> --from <repo>` when the target only needs a one-off link.

## Output to provide

- The selected skill names.
- Any hard dependencies that must come along.
- The suggested `.agents/config.json` block or grouped `agentic-tools skills ...` commands.
- A short validation step such as `uv run agentic-tools skills list` or a dry-run link command.

## Core rule

If the target repo should keep consuming updates from this repo, prefer `sync` with `.agents/config.json` over a one-off copied bundle.
