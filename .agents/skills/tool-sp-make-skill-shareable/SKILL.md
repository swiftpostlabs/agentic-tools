---
name: tool-sp-make-skill-shareable
description: "Review an existing skill, decide whether it can be made shareable, and update its shareability metadata through a guided workflow. Use when: a skill lacks shareable-skills metadata, a user wants to export or symlink a skill, the current portability is unclear, or a repo-local skill might need to be split into a shared core."
argument-hint: "Existing skill name or file path and whether the goal is to export it, link it globally, or just review portability"
metadata:
  owner-prefix: "sp"
  owner: "swiftpostlab/agentic-tools"
  scope: "agents"
  visibility: "organization"
  requires: "ref-sp-agents-shareable-skills, ref-sp-agents-skills-authoring"
---

# Make Skill Shareable

## Purpose

Guide the agent through reviewing an existing skill, deciding whether it should be shareable or repo-local, and updating the metadata or structure needed to support that decision.

## When to use this skill

- A skill is missing `shareable-skills.visibility` or `shareable-skills.requires`.
- The user wants to export, symlink, or otherwise reuse an existing skill outside this repo.
- The portability of a current skill is unclear.
- A repo-local skill might need to be split into a shared core plus a local layer.

## First Step

Read .agents/skills/ref-sp-agents-shareable-skills/SKILL.md and .agents/skills/ref-sp-agents-skills-authoring/SKILL.md before deciding whether the target skill can be exported cleanly.

## Core Workflow

1. Inspect the target skill's frontmatter, body, and support files.
2. Ask only the missing questions needed to classify the skill as `shareable` or `repo-local`.
3. Identify only the hard skill dependencies.
4. Decide whether the skill should stay whole, be marked repo-local, or be split into shared and local pieces.
5. Update the skill metadata and structure accordingly.
6. Validate the result with the shareable-skill checklist and linker dry-run when available.

## Defaults

- Prefer `shareable` only when the skill can move with light adaptation and without hidden repo-only helpers.
- Prefer `repo-local` when the skill depends on this repo's adoption flow, private layout, or special wrappers.
- Prefer splitting a mixed skill over forcing the whole skill to stay repo-local when the core guidance is reusable.
- Keep `shareable-skills.requires` minimal and explicit.

## Wizard Questions

Ask only the questions that are still unanswered after reading the target skill.

| Question area | What to ask | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Portability boundary | Can this skill move to another repo with only light adaptation, or does it rely on repo-only assumptions? | This decides whether the skill should be `shareable` or `repo-local`. | Always, unless the answer is already obvious from the skill. | The visibility decision is grounded in actual constraints. |
| Hard dependencies | Which other skills are required for this skill to work correctly? | The linker and export workflow need a minimal dependency chain. | When the skill points to other skills or borrows their required workflow. | `shareable-skills.requires` stays accurate and small. |
| Split decision | If only part of the skill is reusable, should we split the reusable core from the repo-local layer? | Splitting is often better than marking a broadly useful skill repo-local. | When the skill mixes reusable guidance with local implementation detail. | The skill structure matches the portability boundary. |
| Repo-local reason | If the skill must stay local, what concise reason should be recorded? | Future reviews are faster when the blocker is explicit. | When `repo-local` would otherwise be surprising. | `shareable-skills.reason` explains the local-only boundary. |

## Gotchas

- Do not add optional related skills to `shareable-skills.requires`.
- Do not mark a skill `shareable` if one of its hard dependencies is `repo-local`.
- Do not encode shareability in the skill name.
- If the skill would need major surgery to export cleanly, say so directly instead of pretending the metadata alone fixes it.

## Validation

- Review the result against .agents/skills/ref-sp-agents-shareable-skills/references/checklist.md.
- Confirm the metadata keys stay within the spec's string-to-string model.
- Confirm every dependency in `shareable-skills.requires` exists and is itself shareable.
- Run `uv run agentic-tools skills link <name> --global --dry-run` once the linker CLI exists.
