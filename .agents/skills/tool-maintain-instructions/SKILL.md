---
name: tool-maintain-instructions
description: "Review and update repository instruction files after code, workflow, or skill changes. Use when: .github/copilot-instructions.md, GEMINI.md, or .claude/CLAUDE.md may be outdated, the skill catalog changed, or a multi-provider repo needs its instruction bridge refreshed."
metadata:
  shareable-skills.visibility: "shareable"
  shareable-skills.requires: "ref-instructions-authoring ref-copilot-instructions ref-gemini-instructions ref-claude-instructions"
argument-hint: "What changed in the repo and which instruction files or providers need to stay in sync"
---

# Maintain Instructions

## Purpose

Guide the agent through a short maintenance wizard so top-level instruction files stay aligned with current repo workflows, skill changes, and provider support without drifting into duplicate or conflicting guidance.

## When to use this skill

- The repo's workflows, commands, or package-manager defaults changed.
- Skills were added, removed, renamed, or substantially rewritten.
- `.github/copilot-instructions.md`, `GEMINI.md`, or `.claude/CLAUDE.md` may be outdated.
- A repo added multi-provider support and needs a bridge pattern or refresh.

## First Step

Read `.agents/skills/ref-instructions-authoring/SKILL.md` and the provider-specific instruction skills that match the files being touched.

## Core Workflow

1. Inspect the current instruction files and the code or skill changes that may affect them.
2. Ask only the missing questions needed to determine the source of truth, supported providers, and any real provider-specific exceptions.
3. Update the source-of-truth instruction file first.
4. Refresh provider bridge files so they still point back to the source of truth cleanly.
5. Update skill listings, help-routing sections, quick commands, and workflow summaries that drifted.
6. Validate that the files still agree and that bridge files remain thin.

## Defaults

- Prefer a single source-of-truth instruction file plus thin provider bridges.
- Prefer `.github/copilot-instructions.md` as the source of truth when the repo already uses that pattern.
- If the repo supports multiple providers, recommend an import bridge rather than parallel duplicated instruction bodies.
- When skill names or workflows change, update both the source-of-truth file and any provider routing summaries that mention them.
- If the top-level instruction file grows too large, move domain detail into the owning skill and keep only routing at the top level.

## Wizard Questions

Ask only the questions that are still unanswered after inspecting the repo.

| Question area | What to ask | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Provider support | Which providers or entry files does this repo actively support now? | The maintenance pass should not update phantom entry points or miss live ones. | When the supported provider set is unclear. | The update scope matches the real instruction surfaces. |
| Source of truth | Which file should own the real repo guidance after this update? | The maintenance pass needs one authoritative file before bridges can be refreshed. | When the current source of truth is unclear or changing. | One file owns the real workflow and policy text. |
| Provider-specific exceptions | Does any provider need a real provider-specific note, or should the bridge stay thin? | Unnecessary provider-specific text creates drift. | When a bridge file is growing or behaving differently. | Exceptions stay narrow and justified. |
| Drift scope | Which commands, workflows, skills, or policies changed? | The maintenance pass should update the exact sections that drifted, not rewrite the whole file blindly. | When the triggering change is broad or loosely described. | The edit is focused on the real drift surface. |

## Gotchas

- Do not rewrite every instruction file independently if an import bridge already exists.
- Do not leave skill listings or quick-command sections stale after renames or workflow changes.
- Do not move framework or language detail into the top-level instructions when the owning skill should hold it.
- If the repo already uses policy-managed files such as `.aiexclude` or `.claude/settings.json`, instruction updates should still match that model.

## Validation

- Check the result against `.agents/skills/ref-instructions-authoring/references/checklist.md`.
- Confirm the source-of-truth file and bridge files still agree.
- Confirm provider bridge files remain minimal unless a real provider-specific exception exists.
- Run a targeted error check on the touched instruction files before concluding.

## References

- Read `.agents/skills/ref-copilot-instructions/SKILL.md`, `.agents/skills/ref-gemini-instructions/SKILL.md`, and `.agents/skills/ref-claude-instructions/SKILL.md` for file-specific authoring rules.
- Use `.agents/skills/tool-consolidate-skills/SKILL.md` when the maintenance pass reveals duplicated or misplaced guidance that should be moved into a different owner.
- Use `.agents/skills/ref-ai-security/SKILL.md` when instruction changes must stay aligned with generated policy files or provider restrictions.
