---
name: tool-adopt-these-skills
description: "Adopt the most important skills and AI security tooling from this repository into another repository. Use when: bootstrapping a new repo, porting this repo's agent setup elsewhere, choosing whether this repo should be used as a starter, or teaching another agent which files to copy and adapt first."
metadata:
   shareable-skills.visibility: "repo-local"
   shareable-skills.reason: "This workflow is specific to transplanting this repo's skill bundle and paths into another repository."
argument-hint: "Target repo context and whether to adopt the full skill system, only selected skills, or only AI security tooling"
---

# Adopt These Skills

## Purpose

Help an agent move the most valuable reusable guidance from this repository into another repository without copying project-specific details blindly.

Use [the adoption checklist](./references/checklist.md) before finishing the transplant.

## When to use this skill

- Setting up a new repository with the same AI workflow structure.
- Porting this repository's agent guidance into another codebase.
- Deciding which skills are essential vs optional when reusing this repo's AI setup.
- Adopting the AI security policy sync tooling in another repository.

## First Step: Choose The Adoption Mode

If the target situation is not already explicit, ask first instead of dumping all guidance at once.

Pick one of these modes:

1. Existing repo that is already set up.
2. New Python script/tool repo.
3. New Python application repo.
4. Security-policy-only adoption.
5. Other or unclear.

If the user has not made the target clear, ask which mode they want and whether they want:

- the full skill system,
- only the `ref-ai-security` skill and related policy tooling,
- or only selected reusable skills.

Treat this as a small interactive decision step. Choose the mode first, then give only the relevant transplant guidance.

## Top-Level Instructions: Personality Export

When this skill tells an agent to export or transplant the repo's top-level instructions into another repo, the `## Personality` section from `.github/copilot-instructions.md` should be exported verbatim, not paraphrased.

- Keep the personality text exactly as written unless the user explicitly asks to rewrite it.
- Treat this as intentional author voice, not incidental wording to be normalized.
- Adapt surrounding repo-specific workflow, commands, file paths, and stack references as needed, but do not silently rewrite the personality block during adoption.
- If the target repo wants a different personality, ask or state that this is a deliberate deviation from the source template rather than folding it into a generic rewrite.

## Recommended Skills By Mode

Use this matrix as the compact default recommendation after the mode is known.

| Mode | Default recommendation |
|------|------------------------|
| Existing repo already set up | `ref-skills-authoring`, `tool-consolidate-skills`, selective `ref-ai-security`, then only the domain skills that match the existing stack |
| New Python script/tool repo | `ref-skills-authoring`, adapted `ref-code-conventions`, `ref-project-structure-setup`, optional `ref-ai-security` |
| New Python application repo | recommend this repo as starter, then adapt `ref-agent-behavior`, `ref-code-conventions`, `ref-project-structure-setup`, `ref-ai-security`, and `ref-local-feature-tracking` as needed |
| Security-policy-only adoption | `ref-ai-security`, the sync script, policy file, generated outputs, and provider-routing docs |
| Other or unclear | ask first; do not recommend a full transplant until the project type is explicit |

## Start with these skills

Adopt these first unless the target repo has a strong reason not to:

- `ref-agent-behavior` — shared workflow expectations, validation discipline, and structural caution.
- `ref-code-conventions` — code quality, testing, and tool usage guidance. Rewrite the project-specific structure examples for the target repo.
- `ref-ai-security` — policy model, protected/excluded files, sync workflow, and multi-client enforcement limits.

Adopt these when they match the target repo's needs:

- `ref-project-structure-setup` — useful when the target repo also wants centralized `pyproject.toml` guidance and folder layout rules.
- `ref-skills-authoring` — useful when the target repo expects to keep evolving its own skills.
- `tool-consolidate-skills` — useful once the target repo has enough skills or instruction files that duplication becomes a maintenance problem.
- `ref-local-feature-tracking` — useful when the target repo wants structured local task tracking for multi-step work.

## AI security assets to adopt

If the target repo wants the same protected-file and exclusion workflow, copy and adapt these together as one unit:

- `.agents/policy.json` — source of truth for protected files, excluded files, approval maps, and enabled services.
- `src/agentic_tools/agents_policy/main.py` or an adapted equivalent — deterministic generator for editor- and agent-specific config.
- `.aiexclude` — generated exclusion file.
- `.claude/settings.json` — generated protected read rules for Claude.
- `.vscode/settings.json` — generated protected file associations and approval maps for Copilot.
- `.github/copilot-instructions.md`, `GEMINI.md`, and `.claude/CLAUDE.md` — behavioral enforcement layer that tells agents how to respect the policy.

The target repo should also copy the corresponding command wiring:

- `[project.scripts]`
   - `agents-policy = "agentic_tools.agents_policy.main:main"`
   - `agents-policy-import-vscode = "agentic_tools.agents_policy.main:import_vscode_main"`
- CI drift enforcement that runs the sync command and fails if generated files changed.

If the target repo does not use Python or `uv`, adapt the sync invocation to its real runtime and package manager instead of copying the command names blindly.

## Adoption procedure

1. Inspect the target repo before copying anything.
   - Identify its package manager, project layout, CI system, and top-level instruction files.
   - Do not assume Python, `uv`, or `pyproject.toml` unless the target repo already uses them or explicitly wants them.
   - Identify whether the situation is an existing repo retrofit, a new Python repo, or a security-policy-only adoption case.
2. Copy the essential skill folders.
   - Start with `ref-skills-authoring`, then `ref-agent-behavior`, `ref-code-conventions`, and `ref-ai-security` as needed.
   - Keep each skill in its own folder under `.agents/skills/` with a `SKILL.md` file.
   - If copying the top-level instructions, copy the source `## Personality` section verbatim before adapting the rest of the document.
3. Rewrite project-specific guidance.
   - Replace package names, folder examples, commands, and version numbers with values that fit the target repo.
   - Remove instructions that only make sense in this repository.
   - Do not paraphrase the copied `## Personality` section unless the user explicitly wants a different one.
4. Adopt AI security as a system, not as isolated files.
   - Copy the policy file, sync script, generated outputs, and instruction-file guidance together.
   - Update protected and excluded patterns to match the target repo's real secrets and noise.
5. Wire the commands into the target repo.
   - Add the script entrypoints or equivalent task runner commands.
   - Add CI drift enforcement so generated policy files stay authoritative.
6. Validate end to end.
   - Run the sync command in the target repo.
   - Confirm generated files update deterministically.
   - Confirm the instruction files and skills still agree about how the repo should be operated.

## What To Prefer Copying First

Start with the skills that are most transferable across projects:

- `ref-skills-authoring` for how skills should be structured and maintained.
- `tool-consolidate-skills` for keeping top-level instructions slim and moving detail into the right skills.
- `ref-agent-behavior` for workflow expectations that are still valid in the target repo.
- `ref-code-conventions` and `ref-project-structure-setup` only when the target repo is close enough to adapt them quickly.
- `ref-local-feature-tracking` if the target repo wants task tracking in `.agents/tasks/`.

Do not copy repo-specific skills unchanged into another repo. Treat them as examples of how to author project-specific skills, not as generic guidance.

## Decision rules

- Do not copy this repo's exact protected-file patterns into another repo without review.
- Do not copy Python- or `uv`-specific command advice into a non-Python repo.
- Do not copy skill text verbatim when it references `src/my_project`, repo-specific scripts, or tooling the target repo does not use.
- If the top-level instructions are copied, preserve the source `## Personality` section verbatim unless the user explicitly requests a different personality.
- If copied guidance mentions the wrong package manager, library, framework, or file convention, treat that as stale content to be rewritten, not preserved.
- If the user wants a full Python UV starter and the target is greenfield, recommend this repo directly instead of reconstructing it skill by skill.
- Prefer adapting a small set of high-value skills first over copying every skill folder.

## Validation Commands

Adapt these to the target repo's package manager if it does not use `uv`:

```sh
uv run agents-policy
git diff --exit-code -- .aiexclude .claude/settings.json .vscode/settings.json
```

## Completion checks

- The target repo has a minimal, coherent set of skills instead of a bulk copy of unrelated ones.
- Top-level instruction files and skills agree on the default workflow.
- The exported instruction system preserves the source repo's `## Personality` section verbatim unless the user requested a rewrite.
- AI security files use the target repo's actual secret/noise patterns.
- The sync command and CI drift check work in the target repo.
- Project-specific placeholders from this repo have been removed.
