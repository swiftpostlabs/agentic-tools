---
name: ref-sp-agents-skills-management
description: "This repo's agentic-tools skills CLI (list, link, sync, unlink) and the skills section of .agents/config.json that consuming repos use. Use when changing the CLI or debugging why a skill won't link or sync."
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "repo-local"
  shareable-skills.reason: "This reference documents the repository-specific agentic-tools package, skills-management CLI surface, and sync conventions implemented in this repo."
---

# Swiftpost Skills Management

The `agentic-tools skills` CLI that links shared skills into other repos. Which skills may travel is
the sharing spec (`ref-sp-agents-shareable-skills`); writing skills is
`ref-sp-agents-skills-authoring`.

It lives in the `skills-management` feature of the `agentic-tools` package (Python, with a legacy
Node port). Find it by feature name. Run it as `uv run agentic-tools skills ...` (or the Node
`agentic-tools skills ...`); there are no standalone bins. The global destination is
`~/.agents/skills`.

## Commands

- **`list`**: the skills a source exposes, with scope, visibility, dependencies, and reason.
  Source defaults to the current directory; `--from` takes a repo root or a `.agents/skills` path.
- **`link`**: links chosen skills into a repo or, with `--global`, into `~/.agents/skills`.
  Pulls in `requires` dependencies recursively.
- **`sync`**: links every skill a config declares. Config defaults to
  `<destination>/.agents/config.json` (its `skills` section), falling back to
  `.agents/skills.json`; `--global` requires `--config`. It reports missing names per source before
  changing anything, removes dead links in the destination first, and rejects a skill name declared
  by two sources.
- **`unlink`**: removes linked skills, checking they point at the expected source so an unrelated
  directory is never removed.

`link`, `sync`, and `unlink` take `--dry-run`; `link` and `sync` take `--force` to replace a link
that points elsewhere.

Use `link` for one-off picks and `sync` for a repo that declares its shared skills. In a uv repo
with Poe, add a task (`sync-skills = "uv run agentic-tools skills sync"`) rather than a wrapper
script.

## What may be linked

Only skills with `visibility` `public` or `organization`. `repo-local` skills, skills without
sharing metadata, and skills whose `requires` include a non-shareable or unknown skill are refused.
Missing metadata points the user to `tool-sp-make-skill-shareable`.

## Sync config

```json
{
  "skills": {
    "sources": [
      {
        "from": "package:agentic-tools",
        "skills": ["ref-sp-agents-skills-authoring", "ref-sp-dev-projects-architecture"]
      }
    ]
  }
}
```

`from` is a filesystem path (relative paths resolve from the target repo root) or
`package:<name>`. Prefer `package:` when the source is an installed dependency, a relative path
when two repos are cloned side by side. Full contract: `./references/config-shape.md`.

## Gotchas

- **`package:<name>` reads the installed copy** at the revision the consumer's lockfile pins, never
  a local checkout next to it. A skill that exists only in unpushed or newer commits shows up as
  missing. Fix in order: push the source, re-pin in the consumer, reinstall, sync. Skipping the
  re-pin reproduces the error.
- A renamed skill fails like a missing one, so a rename is a breaking change for every consumer
  that hasn't re-pinned.
- On Windows, if a directory symlink fails with `WinError 1314`, the CLI creates a directory
  junction instead; both count as supported links.

## Before finishing

- `uv run agentic-tools skills list` parses the metadata.
- `uv run agentic-tools skills sync --dry-run --to <repo>` before a real sync when debugging.
- The feature's tests pass when source resolution, dependencies, or link handling changed, and the
  README examples still match.
