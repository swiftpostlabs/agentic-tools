---
name: skills-authoring
description: "Guidelines for creating and maintaining project skills. Use when: designing new skills, updating existing skills, establishing skill standards, evaluating skill quality, organizing skill subfiles, or adapting copied skill content to the repo's actual stack."
---

# Skills Authoring

## Purpose

Ensure project skills are discoverable, activation-worthy, operationally useful, and maintainable across skills-compatible agents.

## When to use this skill

- Creating a new skill file.
- Reviewing or updating an existing skill.
- Evaluating whether a skill is well-structured.
- Adapting a copied skill so it matches this repository instead of preserving stale source-project details.

## References

Use these as the source of truth when authoring or revising a skill:

- <https://agentskills.io/specification>
- <https://agentskills.io/skill-creation/quickstart>
- <https://agentskills.io/skill-creation/best-practices>
- <https://agentskills.io/skill-creation/optimizing-descriptions>
- <https://agentskills.io/skill-creation/evaluating-skills>
- <https://agentskills.io/skill-creation/using-scripts>
- <https://agentskills.io/client-implementation/adding-skills-support>
- <https://www.ibm.com/think/topics/components-of-ai-agents>
- <https://www.ibm.com/think/topics/agentic-workflows>
- <https://www.ibm.com/think/topics/tool-calling>

Core local references for this skill:

- `./references/checklist.md` for quick review or refactor passes.
- `./references/template.md` for creating a new skill skeleton.
- `./references/playbook.md` for the full authoring workflow.
- `./references/description-guide.md` when drafting or fixing the `description` field.
- `./references/evaluation-guide.md` when testing trigger quality or output quality.
- `./references/scripts-and-resources.md` when deciding what belongs in `references/`, `scripts/`, or `assets/`.
- `./references/task-framing.md` when a skill needs commands or actions framed by what, why, when, and expected outcome.
- `./references/agent-components.md` when a skill feels conceptually correct but still does not improve agent behavior.
- `./references/source-traceability.md` when you need to verify which rules are direct, synthesized, or local.
- `./references/local-conventions.md` when you need to understand repo-specific conventions added on top of the original references.

## Values

- Prefer real expertise over generic best-practice filler.
- Prefer concise, high-signal instructions over exhaustive prose.
- Prefer reusable procedures over task-specific answers.
- Prefer deterministic defaults over menus of equal options.
- Keep skill guidance easy to find, activate, execute, and audit.

## Skill Lifecycle Model

Author skills around the way compatible agents actually load them:

1. Discovery: Agents see only `name` and `description` at session start.
2. Activation: Agents load the full `SKILL.md` only when the description matches the task.
3. Execution: Agents load `references/`, `scripts/`, and `assets/` only when the skill tells them to.

That means:

- The `description` field is a trigger, not marketing copy.
- `SKILL.md` must contain the core instructions the agent needs on every activation.
- Supporting files must be explicitly referenced with clear load conditions.

## Core Workflow

1. Start from real repo or domain expertise, not generic filler.
2. Define one coherent skill boundary.
3. Write the `description` as an activation trigger.
4. Put only the always-needed workflow in `SKILL.md`.
5. Move long, situational, or mechanical detail into support files.
6. Evaluate both triggering and execution quality.
7. Promote repeated corrections into defaults, gotchas, validation rules, or scripts.

Read `./references/playbook.md` for the detailed workflow and decision rules.

## Skill File Rules

- **Location:** In this repo, project skills live at `.agents/skills/<skill-name>/SKILL.md`.
- **Folder structure:** A skill folder may include supporting subfiles when they keep the main skill focused.

```text
.agents/skills/<skill-name>/
├── SKILL.md
├── references/
├── scripts/
└── assets/
```

- **Open format:** Skills should remain compatible with the Agent Skills format rather than depending on one client's private conventions.
- **Supporting files are allowed:** Put long checklists, detailed examples, templates, or helper scripts in subfolders instead of cramming everything into `SKILL.md`.
- **Use relative paths only within the same skill:** Link this skill's own resources from `SKILL.md` with `./references/...`, `./scripts/...`, or `./assets/...` paths.
- **Use absolute paths for other skills:** If one skill must point to another skill's `SKILL.md` or files, use an absolute filesystem path so the target is unambiguous across clients and working directories.
- **Keep loading progressive:** Keep `SKILL.md` concise and move large supporting material into subfiles. Prefer one-level-deep references from `SKILL.md` and tell the agent when to load each file.
- **One responsibility per skill.** A skill about code conventions should not also cover deployment.
- **Frontmatter required:** Every skill must have `name` and `description` in YAML frontmatter.
- **Follow the spec for `name`:** 1-64 chars, lowercase letters/numbers/hyphens only, no leading or trailing hyphen, no consecutive hyphens, and it must match the folder name.
- **Keep `description` under 1024 chars:** It must describe both what the skill does and when to use it.
- **Use optional fields only when they add execution value:** `compatibility` is for environment requirements, `license` for licensing, `metadata` for extra client metadata, and `allowed-tools` only when the client supports it.
- **Name must match folder:** The `name` field must match the skill folder name.
- **"When to use" section:** Include a clear section so the AI can determine relevance.
- **Concrete examples:** Provide small examples, templates, or commands where they reduce ambiguity.
- **Provider-agnostic:** No provider-specific features or assumptions. Skills must work with Copilot, Claude, Gemini, and others.
- **Adapt to the real repo:** When a skill is copied or derived from another project, update its commands, libraries, file names, folder layout, and examples to match this repository before keeping it.
- **Do not preserve stale stack details:** Remove or replace inherited references to the wrong package manager, framework, language conventions, file extensions, or UI library when they do not match the current repo.
- **Name repo-specific skills explicitly:** If a skill depends on repo-only packages, conventions, or wrappers that would not transfer cleanly to another project, prefix or name it in a repo-specific way. Keep transferable guidance under generic names like `code-conventions`, `project-structure-setup`, or `skills-authoring`.
- **Make values explicit:** When a skill depends on values like simplicity, clarity, or maintainability, state them directly in the purpose or rules instead of leaving them implicit.
- **Prefer modern defaults:** When a skill gives coding guidance, prefer modern, intention-revealing language and platform APIs over older sentinel-style patterns when both are supported by the project's runtime targets.
- **Prefer operational labels:** When naming workflow steps or guidance sections, prefer labels that describe the actual review/update action. Favor concrete labels like `Reflect` or `Capture Lessons` over vaguer labels like `Learn` when the step includes reviewing outcomes, correcting guidance, and updating the source of truth.

## Description Rules

The description is the discovery surface. Treat it as the most important trigger field in the skill.

- Use imperative phrasing such as `Use this skill when...`.
- Describe user intent, not internal implementation details.
- Include relevant near-miss contexts so the agent activates the skill even when the user does not use your preferred jargon.
- Be specific enough to avoid false positives.
- Err slightly toward being pushy rather than too timid, but do not claim adjacent tasks the skill does not actually handle.
- Revise the description with trigger evals when activation is flaky.

Read `./references/description-guide.md` when you need the full trigger-writing and trigger-eval workflow.

Bad pattern:

- `description: Helps with PDFs.`

Better pattern:

- `description: Extract text and tables from PDFs, fill PDF forms, and merge documents. Use this skill when the user is working with PDF files, form fields, scanned documents, or document extraction workflows.`

## Instruction Design Rules

Make the skill improve actual agent behavior:

- Tell the agent what to inspect first.
- Give it an execution order for multistep work.
- Preserve durable facts and gotchas.
- Explain decision rules when the task is fragile.
- Name exact tools, commands, scripts, and artifacts.
- Specify output shape and escalation behavior.
- Refine the skill from real failures and traces.

Read `./references/agent-components.md` for the detailed mapping from agent components to skill content.

## Content Calibration

- **Add what the agent lacks, omit what it already knows.** Do not waste context on textbook explanations.
- **Aim for moderate detail.** Too little leaves the agent guessing; too much causes it to chase irrelevant branches.
- **Prefer defaults over menus.** Pick the default library, command, or approach and mention alternatives only as escape hatches.
- **Favor procedures over declarations.** Teach the method, not just a single instance answer.
- **Frame important tasks explicitly.** For command-heavy or workflow-heavy skills, describe each important action in terms of what it does, why it exists, when to use it, and the expected outcome.
- **Keep critical gotchas in `SKILL.md`.** If the agent must know something before it can recognize the failure mode, do not hide it only in a reference file.
- **Use templates for constrained output.** Inline small templates; move larger templates to `assets/` and reference them explicitly.
- **Use checklists for multistep workflows.** They help agents maintain progress and validation order.
- **Use plan-validate-execute for fragile or destructive work.** Require an intermediate artifact or validation step before action.

If you are creating a new skill from scratch, start from `./references/template.md` and then prune or extend it to fit the actual workflow.

Read `./references/task-framing.md` when the skill includes multiple commands, scripts, or operational actions that need clearer task selection and success criteria.

## Progressive Disclosure Rules

- Keep the main `SKILL.md` under roughly 500 lines and under roughly 5,000 tokens unless there is a strong reason not to.
- Put detailed references in focused files rather than one giant appendix.
- When pointing to a support file, explain the trigger condition.
- Use relative paths for files inside the current skill and absolute paths for files that live in a different skill.

## Tool And Script Rules

Use scripts when they make the workflow more reliable or when the agent keeps reinventing the same logic.

- Bundle repeated, testable logic under `scripts/`.
- Keep scripts self-contained where possible.
- Prefer pinned, reproducible commands for one-off external tools.
- State environment prerequisites in the skill when they matter.
- Use relative paths from the skill root.
- Do not require interactive prompts.
- Provide `--help` output with concise usage and examples.
- Emit structured data on stdout and diagnostics on stderr when possible.
- Use clear error messages, meaningful exit codes, and safe defaults.
- Add `--dry-run` or equivalent safeguards for destructive operations.
- Keep output size predictable or support writing results to files.

When a script is Python and meant to be portable, prefer a self-contained `uv run` flow or inline metadata approach rather than hidden environment assumptions.

Read `./references/scripts-and-resources.md` when deciding whether content belongs in `SKILL.md`, `references/`, `scripts/`, or `assets/`.

## Validation And Evaluation

Every meaningful skill should be tested in two dimensions:

1. **Trigger quality:** Does the description activate the skill on the right prompts?
2. **Execution quality:** Does the skill produce better outputs than no skill or than the previous version?

Use these practices:

- Create realistic should-trigger and should-not-trigger queries for description evaluation.
- Run trigger checks multiple times because model behavior is nondeterministic.
- Use train and validation query splits to avoid overfitting the description.
- Create a small `evals/evals.json` set for output-quality evaluation when the skill is important enough to justify it.
- Compare `with_skill` against `without_skill` or against the previous version.
- Add objective assertions after the first round of outputs shows what good looks like.
- Use scripts for mechanical checks and human review for broader quality.
- Read execution traces, not just final outputs.
- Remove instructions that waste tokens or cause repeated dead-end behavior.

If a correction keeps recurring in review or execution traces, promote it into the skill as a default, a gotcha, a validation rule, or a bundled script.

Use `./references/evaluation-guide.md` for the detailed evaluation loop. Example starter files live at:

- `./assets/trigger-eval-queries.example.json`
- `./assets/evals.example.json`

## Cross-Platform Parity

Keep instructions consistent across all platform-specific files:

| File | Platform |
|------|----------|
| `.github/copilot-instructions.md` | GitHub Copilot |
| `GEMINI.md` | Google Gemini |
| `.claude/CLAUDE.md` | Anthropic Claude |

The Copilot instructions file is the source of truth.

Default pattern for this repo and most repos:

- Put the real guidance in `.github/copilot-instructions.md`.
- Make `GEMINI.md` and `.claude/CLAUDE.md` thin reference files that import the Copilot instructions directly.
- Prefer repo-root `@.github/...` imports over relative `@./...` or `@../...` imports so the entry-point stubs do not depend on folder depth.
- Do not duplicate the same workflow, commands, or policy text across all three files when a reference is enough.

Cross-platform parity means the effective guidance should match across providers, not that every file must contain the same amount of text.

Only add provider-specific text in `GEMINI.md` or `.claude/CLAUDE.md` when there is a real platform-specific need, such as:

- a required bootstrap instruction that must appear in that provider's entry file,
- a provider-specific limitation or capability that changes how the repo must be operated,
- or a provider-specific routing note that cannot live solely in the shared Copilot instructions.

When that happens:

- keep the provider-specific file minimal,
- state only the platform-specific exception,
- and route back to `.github/copilot-instructions.md` for the actual repo guidance.

If there is no real provider-specific behavior, nothing else needs to be done beyond the reference stub.

## Communication Guidelines

- Provide direct, unfiltered feedback. The user prefers honesty over comfort.
- Do not sugarcoat technical debt or architectural flaws.
- If a request is suboptimal, explain why immediately and suggest the correct path.

## Review Heuristics

When reviewing a skill, ask these questions:

- Will the description trigger on realistic prompts, including indirect wording?
- Does the body tell the agent what to inspect, what to do, what to validate, and what to output?
- Are critical gotchas placed where the agent will actually see them in time?
- Are scripts and references referenced with clear conditions instead of vague mentions?
- Does the skill reduce agent uncertainty, or is it mostly repeating generic knowledge?
- Does the skill teach a reusable workflow instead of hardcoding one answer?
- Is the skill likely to compose cleanly with neighboring skills?
