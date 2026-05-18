---
name: ref-swiftpost-skills-management
description: "Repository-specific guidance for the skills-management CLI and .agents/skills.json workflow in this repo. Use when: working on src/agentic_tools/skills_management, updating skills-management docs, or debugging skill linking and sync behavior in a consuming repo."
metadata:
  shareable-skills.visibility: "repo-local"
  shareable-skills.reason: "This reference documents the repository-specific agentic-tools package, skills-management CLI surface, and sync conventions implemented in this repo."
---

# Swiftpost Skills Management

## Purpose

Document the stable behavior of this repository's grouped `agentic-tools skills` CLI surface, its shareability enforcement rules, and the `.agents/skills.json` sync model used to materialize shared skills into another repository.

## When to use this skill

- Editing `src/agentic_tools/skills_management/`.
- Updating README or repo guidance for skill linking and syncing.
- Debugging why a skill cannot be linked, synced, or unlinked.
- Explaining how a consuming repo should configure `.agents/skills.json`.

## Scope Boundaries

- Use this skill for the actual `agentic-tools` package and the `skills-management` behavior implemented in this repo.
- Use `.agents/skills/ref-shareable-skills/SKILL.md` when the main question is about portability rules, shareability decisions, or dependency metadata rather than this CLI's behavior.
- Use `.agents/skills/ref-skills-authoring/SKILL.md` when the main question is about writing or maintaining a skill itself.

## Stable Surface

- Distribution name: `agentic-tools`
- Canonical entry points: `uv run agentic-tools skills ...` and the Node package command `agentic-tools skills ...`
- Compatibility aliases: `uv run skills-management ...` and `skills-management ...`
- Python implementation path: `src/agentic_tools/skills_management/main.py`
- Node implementation path: `src/agentic_tools/skills_management/main.mjs`
- Node runtime shim: `scripts/skills-management.mjs`
- Default global destination: `~/.agents/skills`

## Commands

### `list`

- Lists the discovered skills from a source repo.
- Default source is the current working directory.
- Accepts either a repo root or a direct `.agents/skills` path via `--from`.
- Reports each skill's `shareable-skills.visibility`, dependencies, and optional reason.

### `link`

- Links one or more selected shareable skills from a source repo into a destination repo or the global skills directory.
- Resolves hard dependencies declared in `shareable-skills.requires` automatically.
- Refuses to link skills that are missing shareability metadata, marked `repo-local`, or depend on non-shareable or unknown skills.
- Supports `--dry-run` for planning and `--force` for replacing an existing link that points somewhere else.
- Supports `--global` to target `~/.agents/skills` instead of a repo-local `.agents/skills` directory.

### `sync`

- Reads a JSON config and links all declared skills into the destination repo.
- Default config path is `<destination>/.agents/skills.json`.
- With `--global`, `--config` is required because there is no repo root from which to infer a default config file.
- Each configured source declares a `from` location and a list of `skills` to materialize.
- Reports missing configured skill names grouped by source before changing the destination.
- Removes dead skill links already present in the destination `.agents/skills` directory before relinking the configured set.
- Rejects duplicate skill names across configured sync sources.
- Supports `--dry-run` and `--force` with the same semantics as `link`.

### `unlink`

- Removes linked skills from a destination repo or the global skills directory.
- Validates the expected source target so it does not silently remove an unrelated directory.
- Supports `--dry-run` for planning.

## Shareability Enforcement

- The CLI only links skills that have explicit shareability metadata.
- `shareable-skills.visibility` must be either `shareable` or `repo-local`.
- `repo-local` skills are rejected during linking and syncing.
- Dependencies listed in `shareable-skills.requires` are resolved recursively and must themselves be shareable.
- Missing metadata triggers a recommendation to use `tool-make-skill-shareable`.

## Sync Config Model

- The sync file is JSON, not YAML.
- The expected repo-local location is `.agents/skills.json`.
- The top-level shape is:

```json
{
  "sources": [
    {
      "from": "package:agentic-tools",
      "skills": ["ref-skills-authoring", "ref-projects-architecture"]
    }
  ]
}
```

- `from` supports two durable source forms:
  - relative or absolute filesystem paths
  - `package:<name>` package references
- Relative paths resolve from the target repo root when the config lives under `.agents/skills.json`.
- Package sources are resolved by locating the installed package and walking upward until a repo root with `.agents/skills` is found.

## Windows Behavior

- The tool prefers real directory symlinks.
- On Windows, if directory symlink creation fails with privilege error `WinError 1314`, the CLI falls back to creating a directory junction.
- Existing supported directory links include both symlinks and Windows directory junctions.

## Decision Rules

- Use `list` when validating metadata or checking what a repo exposes.
- Use `link` for one-off selection and manual linking.
- Use `sync` for target repos that want a declarative shared-skill setup.
- Prefer `package:<name>` sources when the source repo is being consumed as an installed package instead of a sibling checkout.
- Prefer repo-relative filesystem sources when two repos are cloned side by side locally.
- In `uv`-managed consuming repos that already use Poe, prefer a task like `sync-skills = "uv run agentic-tools skills sync"` instead of creating a local wrapper script just to call the installed CLI.

## Validation

- Use `uv run agentic-tools skills list` to validate discovery and metadata parsing.
- Use `uv run agentic-tools skills sync --dry-run --to <repo>` before a real sync when debugging a target repo.
- Check `src/agentic_tools/skills_management/main_test.py` when changing source resolution, dependency handling, or Windows link behavior.
- Keep README examples aligned with the CLI behavior and config contract.

## References

- Read `./references/checklist.md` for a quick maintenance or debugging pass.
- Read `./references/config-shape.md` for the `.agents/skills.json` contract and source-resolution rules.
- Read `README.md` for the repo's user-facing examples.
- Read `src/agentic_tools/skills_management/main.py` for the implementation surface and `src/agentic_tools/skills_management/main_test.py` for the guarded behavior.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for CLI and sync prompts.
- Review `./evals/evals.json` when validating output quality for CLI behavior explanations.
