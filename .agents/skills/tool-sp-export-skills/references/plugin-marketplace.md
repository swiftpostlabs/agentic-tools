# Plugin Marketplace

Use this mode when the skills should be **published** — packaged as an agent plugin and distributed
through a `marketplace.json` catalog, so anyone who adds the marketplace can install them and receive
updates. This is the only export mode that is an ongoing distribution channel rather than a one-time
handoff. One published plugin is installable from Claude Code, GitHub Copilot CLI, and VS Code.

## This mode is a pointer, not a procedure

The mechanics — `plugin.json` and `marketplace.json` layout, `source` types, the skills-path and
install-cache rules, cross-client compatibility, hosting for public/private/offline, and the release
and update flow — are owned by **`ref-sp-agents-plugin-marketplaces`**. Read that skill and follow it.
Do not restate or re-derive its rules here; they change upstream.

## What this skill still owns

The export gate, which is the same for this mode as for every other:

- Export only skills the sharing spec permits. A published plugin must **never** carry a
  `repo-local` skill, and an `organization` skill belongs only in a **privately hosted** marketplace.
- Include hard dependencies (`shareable-skills.requires`) of every exported skill.
- Preserve full skill folders, frontmatter, and subfiles.

Two things to be aware of before choosing this mode:

- **The publish set is enumerated, and that enumeration *is* the visibility filter.** No client has a
  concept of skill-level visibility, so a plugin ships whatever the manifest lists. Generate the list from
  the `shareable-skills.visibility` metadata rather than hand-writing it, and add a drift check, or a
  newly added `repo-local` skill will eventually leak.
- **Every published skill's `description` loads in every session** for anyone who installs the plugin.
  The publish set is a token budget, not only a policy decision.

## Validation

Follow the validation steps in `ref-sp-agents-plugin-marketplaces`. At minimum, after a real install
from the hosted marketplace, confirm the installed skill count matches the intended publish set and
that no `repo-local` skill appears.
