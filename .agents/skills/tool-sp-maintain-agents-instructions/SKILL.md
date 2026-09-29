---
name: tool-sp-maintain-agents-instructions
description: "Review and update a repo's AGENTS.md after code, workflow, or skill changes, and retire leftover CLAUDE.md, GEMINI.md, or Copilot bridge files. Use when: AGENTS.md may be outdated, has grown too long, copies skill descriptions, or the repo still has instruction bridges that current clients no longer need."
argument-hint: "What changed in the repo, or which instruction files look stale"
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.requires: "ref-sp-agents-instructions-authoring"
---

# Maintain Agents Instructions

## Purpose

Keep `AGENTS.md` accurate and small after repo changes, and remove instruction files that no longer
need to exist.

## When to use this skill

- The repo's workflows, commands, or package-manager defaults changed.
- `AGENTS.md` may be outdated, is past the size budget, or copies skill descriptions.
- The repo still has `CLAUDE.md`, `.claude/CLAUDE.md`, `GEMINI.md`, or
  `.github/copilot-instructions.md` alongside `AGENTS.md`.

## Scope boundaries

This tool maintains `AGENTS.md` and any leftover instruction files, not the skills.

- `ref-sp-agents-instructions-authoring`: the rules applied here (one file, no bridges, budgets,
  persona placement) and the client table in its `references/agents-md-standard.md`.
- `ref-sp-agents-mr-wolf-persona`: canonical persona text. This tool re-syncs the inline copy and
  never rewrites the voice in place.
- `tool-sp-maintain-skills`: drift inside skills. A rule that outgrew `AGENTS.md` usually moves
  there.

## Core Workflow

1. Read `ref-sp-agents-instructions-authoring` and its `references/agents-md-standard.md`.
2. Inspect `AGENTS.md`, any other instruction files, and the change that triggered the pass.
3. Fold any real content from other instruction files into `AGENTS.md`, then delete them unless a
   documented fallback applies. Replace a `GEMINI.md` bridge with `context.fileName` if Gemini is
   in use.
4. Update commands, workflow, and safety rules that drifted. Re-sync the persona block if the
   persona skill changed.
5. Cut what does not belong: copied skill descriptions, content derivable from the code, and area-specific
   detail that a skill should own.
6. Check the budgets: about 150 lines, well under 32 KiB (`wc -l -c AGENTS.md`).

Ask the user only when it is unclear which clients are in use, or when two instruction files
contradict each other and the repo does not show which one is right.

## Gotchas

- Adding a `CLAUDE.md` of any kind makes Claude Code stop reading `AGENTS.md`. Do not "fix" missing
  Claude context by creating one; check the Claude Code version and the Project instructions
  setting first.
- A skill rename or a new skill that owns a main repo area needs a matching edit to the compact
  area-to-skill index in `AGENTS.md`.
- Keep instructions consistent with policy-managed files such as `.aiexclude` or
  `.claude/settings.json`.

## Validation

- Run the checklist in `ref-sp-agents-instructions-authoring` (`references/checklist.md` there).
- Only `AGENTS.md` carries instructions, unless a documented fallback is recorded.
- The budgets hold.

## References

- `ref-sp-agents-instructions-authoring`: source rules, client table, checklist.
- `ref-sp-agents-security`: when instruction changes touch generated policy files.
