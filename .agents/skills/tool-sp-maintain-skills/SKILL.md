---
name: tool-sp-maintain-skills
description: "Review and update existing skills after repo or branch changes: find drift, merge duplicated guidance, and keep each rule in one owner skill. Use when skills may be stale, overlap, or need a catalog-wide pass."
argument-hint: "What changed in the repo or branch, and which skills may now be stale"
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.requires: "ref-sp-agents-skills-authoring"
---

# Maintain Skills

Keeps the existing skills accurate and lean against the quality bar in
`ref-sp-agents-skills-authoring` (read it first, including its `references/checklist.md`). For a
new skill use `tool-sp-create-skill`; for drift in `AGENTS.md`, `tool-sp-maintain-agents-instructions`.

## Steps

1. Find what changed. Prefer the branch diff against its base, or local uncommitted changes when
   that is all there is. Changed commands, package managers, workflow files, and new top-level
   directories are the strongest signals.
2. Map each change to the skill that should describe it. If none should, say so and why.
3. Edit only the skills, references, and routing that actually drifted.
4. When the same rule lives in several skills, keep it in one owner and replace the others with a
   one-line pointer. Merge skills that always load together; split one when most uses need only a
   small part of it.
5. If skills were added, renamed, or removed, update the area index in `AGENTS.md` and, if the
   repo publishes a plugin, its manifest.
6. Run `yarn validate` and fix real findings in the touched skills.

Ask the user only when the change scope is unclear or two skills could both own a rule.

## Gotchas

- Do not rewrite every skill because one area changed.
- A stale plugin manifest fails silently both ways: a renamed folder drops out of the published
  plugin, and a skill demoted to `repo-local` but still listed leaks on the next release.
- Change shareability metadata only on purpose; becoming `repo-local` or gaining a hard
  dependency changes what can be exported.
- Prefer extending an existing owner over creating a new skill.
- When evals produced `grading.json` files, summarise them with
  `.agents/skills/ref-sp-agents-skills-authoring/scripts/aggregate_eval_results.py <workspace>`.

## Before finishing

- Every changed repo behaviour maps to an owner skill, or is left uncovered with a stated reason.
- No reference points at a renamed or deleted file or skill.
- If you concluded nothing needed updating, that conclusion is checked against the actual diff.
