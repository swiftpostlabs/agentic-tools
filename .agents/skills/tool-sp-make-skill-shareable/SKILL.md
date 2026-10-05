---
name: tool-sp-make-skill-shareable
description: "Decide how far one existing skill can be shared (public, organization, or repo-local), split it if needed, and set its sharing metadata. Use when a skill lacks sharing metadata or someone wants to export or reuse it."
argument-hint: "Existing skill name or file path and whether the goal is to export it, link it globally, or just review portability"
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.requires: "ref-sp-agents-shareable-skills, ref-sp-agents-skills-authoring"
---

# Make Skill Shareable

Walks one existing skill through the sharing spec in `ref-sp-agents-shareable-skills` (read it
first). New skills set visibility in `tool-sp-create-skill`; re-scoping many skills is a
`tool-sp-maintain-skills` pass. Actually shipping the skill belongs to
`ref-sp-agents-plugin-marketplaces` and `ref-sp-agents-skills-management`.

## Steps

1. Read the skill's frontmatter, body, and support files.
2. Decide visibility:
   - `public` or `organization` when it moves to another repo with light adaptation and no hidden
     repo-only helpers (`public` also needs a top-level `license`);
   - `repo-local` when it depends on this repo's layout, adoption flow, or wrappers. Record why in
     `shareable-skills.reason` if that would surprise a reader.
3. If only part is reusable, split it into a shared core plus a repo-local layer rather than
   marking the whole skill local.
4. List only hard dependencies in `shareable-skills.requires`; optional ones go in `suggests`.
5. Update the metadata, then run `yarn validate` and the sharing spec's `references/checklist.md`.
6. If a linker exists, dry-run it: `uv run agentic-tools skills link <name> --global --dry-run`.

Ask the user only what the skill itself doesn't answer: whether it really works elsewhere, which
dependencies are required, and whether to split.

## Gotchas

- A skill can't be `organization` or `public` if a hard dependency is `repo-local`.
- Shareability goes in metadata, never in the name.
- If exporting needs major surgery, say so; metadata alone won't fix it.
