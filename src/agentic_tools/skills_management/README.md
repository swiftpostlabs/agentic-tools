# Skills Management

This feature packages the CLI that lists, links, syncs, and unlinks skill folders across repositories using the repo's shareability metadata.

## For Users

Use `skills-management` when you want a repo to consume shared skills from another clone or from an installed package.

### Install And Sync Shared Skills

1. Install `agentic-tools` in the target repo.
2. Add `.agents/skills.json` with one or more configured sources.
3. Run `uv run skills-management sync` in the target repo.

Example config:

```json
{
	"sources": [
		{
			"from": "package:agentic-tools",
			"skills": [
				"ref-agents-persona",
				"ref-coding-patterns",
				"ref-python"
			]
		}
	]
}
```

When `from` uses `package:agentic-tools`, `sync` resolves the installed package in the current environment and links skill folders from `agentic_tools/shareable_skills` inside `.venv`.

### Key Behavior

- `sync` resolves both filesystem sources and installed package sources.
- `sync` removes dead destination links before relinking the configured set.
- `sync` reports missing configured skills by source before changing anything.
- On Windows, directory-link creation falls back to junctions when symlink privileges are unavailable.

## For Developers

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
