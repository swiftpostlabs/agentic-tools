---
name: ref-shareable-skills
description: "Reference guidance for deciding whether a skill is shareable, recording shareability metadata and hard skill dependencies, and validating export readiness. Use when: backfilling shareable-skills metadata, preparing a skill for reuse in another repo, reviewing whether a skill should stay repo-local, or verifying dependency-light skill exports."
metadata:
  shareable-skills.visibility: "shareable"
---

# Shareable Skills

## Purpose

Define how this repo decides whether a skill is safe to export, how shareability metadata should be recorded, and how to validate a skill before linking or copying it outside this repository.

## When to use this skill

- Deciding whether a skill should be `shareable` or `repo-local`.
- Backfilling `shareable-skills.visibility`, `shareable-skills.requires`, or `shareable-skills.reason` on existing skills.
- Reviewing whether a shareable skill has too many hard dependencies.
- Preparing a skill for the shareable-skill linking CLI.
- Reviewing whether a repo-local skill should be split into shareable and repo-specific parts.

## Core Workflow

1. Inspect the skill's frontmatter, body, and referenced files.
2. Identify whether the skill can move to another repo with only light adaptation.
3. Record `shareable-skills.visibility` as `shareable` or `repo-local`.
4. Record only hard skill dependencies in `shareable-skills.requires`.
5. Add `shareable-skills.reason` when the repo-local decision or dependency would otherwise be unclear.
6. Validate the resulting metadata with a dry-run of the shareable-skill CLI when available.

## Defaults

- Prefer `shareable` when the skill can move to another repo with light adaptation and without dragging along repo-only wrappers.
- Prefer `repo-local` when the skill depends on this repo's specific scripts, policies, file layout, or adoption workflow.
- Keep `shareable-skills.requires` short. If the list starts growing, split the skill or move stable pieces into a smaller shared dependency.
- Do not use `requires` for optional reading, related references, or nice-to-have neighboring skills.
- Prefer splitting a mixed skill over marking a broadly useful core as repo-local just because one section is tied to this repo.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Classify visibility | Decide whether the skill is `shareable` or `repo-local`. | The linker and export workflows need a clear portability decision. | Whenever a skill is created, reviewed for export, or backfilled with metadata. | The skill has a visibility value that matches its real portability. |
| Record hard dependencies | List required companion skills in `shareable-skills.requires`. | Shareable skills should bring along only the minimum additional skills needed to work correctly. | When the skill truly relies on another skill's instructions. | The dependency chain is explicit and shallow. |
| Add a repo-local reason | Explain why a non-shareable skill should stay local. | Future reviews are faster when the portability blocker is explicit. | When `repo-local` would otherwise be surprising. | The metadata explains the portability boundary succinctly. |
| Run `uv run skills-management link <name> --global --dry-run` | Validate the metadata through the export workflow. | The linker is the cheapest realistic check that the metadata and dependency chain are usable. | After adding or changing shareability metadata, once the CLI exists. | The skill dry-runs cleanly or reports a concrete exportability problem. |

## Gotchas

- The Agent Skills spec treats `metadata` as a string-to-string mapping, so `shareable-skills.requires` must stay a flat string, not a YAML list.
- A skill can be useful across repos and still be `repo-local` if exporting it would require hidden wrappers or repo-only assumptions.
- Hard dependencies should be rare. If everything depends on everything else, the skills are scoped poorly.
- The linker should reject repo-local skills rather than silently exporting them.

## Validation

- Confirm the skill metadata uses `shareable-skills.visibility` and, when needed, `shareable-skills.requires` and `shareable-skills.reason`.
- Confirm every dependency in `shareable-skills.requires` points to an existing skill name.
- Confirm a `shareable` skill does not depend on a `repo-local` skill.
- Run `uv run skills-management link <name> --global --dry-run` after metadata changes once the CLI exists.

## References

- Read `./references/checklist.md` before finalizing shareability metadata on a skill.
- Read .agents/skills/ref-skills-authoring/SKILL.md when the task shifts from portability review to broader skill authoring rules.
- Use .agents/skills/tool-make-skill-shareable/SKILL.md when a user wants a guided shareability decision for an existing skill.
