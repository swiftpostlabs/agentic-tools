---
name: tool-sp-maintain-skills
description: "Review, consolidate, and update project skills after repo, workflow, or branch changes. Use when: skills may be outdated after code or tooling changes, guidance is duplicated or misplaced, or the repo's skill catalog needs a maintenance pass."
argument-hint: "What changed in the repo or branch, and which skills may now be stale"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "organization"
  shareable-skills.requires: "ref-sp-agents-skills-authoring"
---

# Maintain Skills

## Purpose

Guide the agent through a short maintenance workflow so project skills stay aligned with current repo behavior, branch changes, and skill-authoring standards instead of drifting into stale commands, stale examples, or missing coverage.
Keep project guidance simple by giving each rule one clear home when maintenance reveals duplication or misplaced detail.

## When to use this skill

- Repo commands, package-manager choices, workflows, or folder structure changed.
- A branch introduced new domains, libraries, or tooling that the current skills do not mention.
- Existing skills may still describe old commands, old package managers, or renamed features.
- The skill catalog changed and the top-level routing may need a corresponding refresh.

## First Step

Read `.agents/skills/ref-sp-agents-skills-authoring/SKILL.md` before planning updates.
If the maintenance pass touches skill quality, evals, scripts, or copied guidance, also read `.agents/skills/ref-sp-agents-skills-authoring/references/quality-evaluation.md`.

## Core Workflow

1. Inspect the current skill catalog and the change surface that might have invalidated it.
2. If the repo is on a feature branch or has local changes, inspect the branch diff first and treat it as the primary signal for what skill guidance may have drifted.
3. Map changed code, workflows, commands, and directories to the skills that should describe them.
4. Update only the affected skills, metadata, supporting references, and top-level routing that actually drifted.
5. If you discover repeated or misplaced guidance, consolidate it into the correct owner instead of copying the same fix across multiple skills.
6. Run the portable skill validator and address real findings in the touched or drifted skills.
7. Validate trigger quality, file diagnostics, and skill discovery before concluding.

## Defaults

- Prefer a branch-diff-driven review over a blind rewrite of the entire skill catalog.
- Prefer updating the owning skill rather than adding top-level instruction detail that duplicates it.
- Prefer focused edits to the affected skill and its support files over sweeping rewrites.
- Prefer consolidating duplicated guidance into one owner instead of preserving near-copies across several skills.
- When the branch adds a new domain, decide whether an existing skill should expand, a new skill should be created, or the change is too repo-specific to generalize.
- When a maintenance pass reveals repeated eval failures or repeated helper-code recreation, promote the durable fix into the owning skill as a default, gotcha, validation rule, or `scripts/` helper.
- If no skill update is actually needed, say so explicitly and explain why the current skill set still covers the change.

## Wizard Questions

Ask only the questions that remain unanswered after inspecting the repo and branch.

| Question area | What to ask | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Change scope | What changed in the repo, branch, or workflow that might affect skill guidance? | The maintenance pass should respond to real drift rather than guess. | When the trigger for the maintenance pass is broad or vague. | The update scope is anchored to concrete repo changes. |
| Skill ownership | Which existing skill should own this guidance, or does the repo need a new one? | Skills drift when new behavior is documented in the wrong file. | When a change spans multiple skills or introduces a new domain. | One clear owner is chosen for each rule. |
| Routing impact | Should top-level instructions or help-routing sections be refreshed too? | A new or renamed skill is incomplete if the catalog and routing stay stale. | When skills were added, removed, renamed, or materially repurposed. | Discovery and routing stay aligned with the actual catalog. |
| Consolidation need | Is this drift exposing duplicated, misplaced, or copied-over guidance? | Maintenance should reduce future drift, not just patch one symptom. | When multiple skills mention the same outdated rule. | The fix lands in one primary owner, with optional follow-up consolidation. |

## Branch-Diff Guidance

- If git history is available, inspect changed files before editing skills.
- Prefer the narrowest useful diff: current branch against its base, current branch against the default branch, or local uncommitted changes when that is the only signal available.
- Treat changed commands, package-manager choices, workflow files, and new top-level directories as strong evidence that one or more skills may be stale.
- If a branch changed implementation but not the durable workflow, say that no skill update is needed instead of forcing one.

## Gotchas

- Do not refresh every skill just because one area changed.
- Do not leave `AGENTS.md` or equivalent routing files stale after adding or renaming a skill.
- Do not preserve copied examples, commands, or package managers that no longer match the repo.
- Do not create a new skill when an existing skill can absorb the change cleanly.
- Do not mutate shareability metadata casually; if a skill becomes repo-local or gains hard dependencies, record that intentionally.

## Validation

- Check the result against `./references/checklist.md`.
- If guidance moved between skills or out of top-level instructions, check `./references/consolidation-checklist.md` too.
- Run `node .agents/skills/ref-sp-agents-skills-authoring/scripts/validate-skill.mts <skill-dir>` for touched skills, or add `--all` on `.agents/skills` for the whole catalog (needs Node >= 22). For sharing-spec conformance, also run `node .agents/skills/ref-sp-agents-shareable-skills/scripts/validate-sharing.mts .agents/skills --all`.
- If output-quality evals produced `grading.json` files, summarize them with `.agents/skills/ref-sp-agents-skills-authoring/scripts/aggregate_eval_results.py <eval-workspace>`.
- Run a targeted error check on the touched skill files.
- Run the repo's skill-discovery or catalog-validation command when one exists.
- Confirm that new or renamed skills are reflected in top-level routing if needed.
- If the maintenance pass decided that no updates were necessary, confirm that conclusion against the actual diff rather than intuition.

## References

- Read `./references/consolidation-checklist.md` when the maintenance pass reveals duplicated or misplaced guidance.
- Use `.agents/skills/tool-sp-maintain-agents-instructions/SKILL.md` when skill changes imply drift in `AGENTS.md`, `GEMINI.md`, or `.claude/CLAUDE.md`.
- Use `.agents/skills/ref-sp-agents-local-tasks/SKILL.md` when the repo uses `.agents/tasks/` to keep a local maintenance plan or artifact trail.
- Read `.agents/skills/ref-sp-agents-skills-authoring/references/quality-evaluation.md` when reviewing important skills against the stricter quality bar adopted from the local Claude skill-creator task.
- Read `./references/checklist.md` for a quick maintenance review pass.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for branch-aware skill maintenance prompts.
- Review `./evals/evals.json` when validating output quality for change-to-skill mapping and maintenance decisions.
