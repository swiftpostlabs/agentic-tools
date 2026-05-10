# Skills Management

This feature packages the CLI that lists, links, syncs, and unlinks skill folders across repositories using the repo's shareability metadata.

## Files

- `main.py` contains manifest parsing, dependency resolution, path resolution, and the CLI command handlers.
- `main_test.py` covers the core CLI behaviors and linking logic.

## Canonical commands

- `uv run skills-management list`
- `uv run skills-management link <skill> --from <repo>`
- `uv run skills-management sync`
- `uv run skills-management unlink <skill> --from <repo>`

## Responsibilities

- read shareability metadata from skill frontmatter
- enforce `shareable-skills.visibility` and hard dependencies
- link skills into another repo or the global skills directory
- resolve package and filesystem sources for `.agents/skills.json`
- fall back to a Windows directory junction when symlink creation is blocked

## Focused validation

```sh
uv run python -m pytest src/agentic_tools/skills_management/main_test.py -q
```
