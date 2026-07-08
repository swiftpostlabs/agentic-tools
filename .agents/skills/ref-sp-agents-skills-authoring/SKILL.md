---
name: ref-sp-agents-skills-authoring
description: "Reference guidance for creating and maintaining project skills. Use when: designing new skills, updating existing skills, establishing skill standards, evaluating skill quality, organizing skill subfiles, or adapting copied skill content to the repo's actual stack."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
---

# Skills Authoring

## Purpose

Ensure project skills are discoverable, activation-worthy, operationally useful, and maintainable across skills-compatible agents.

## When to use this skill

- Creating a new skill file.
- Reviewing or updating an existing skill.
- Evaluating whether a skill is well-structured.
- Adapting a copied skill so it matches this repository instead of preserving stale source-project details.

## Scope And Relationship To The Sharing Spec

This skill owns **how to make a good skill in general, from the agent's perspective**: boundary,
description/trigger quality, instruction design, progressive disclosure, structure, and evaluation.

It does **not** own the sharing spec. How a skill is **named** (owner-prefix / domain / template /
topic grammar), **assigned a domain** (the domain registry and tags), given **visibility**
(repo-local / organization / public), declares **hard vs soft dependencies**, and is **vendored or
forked** is governed by .agents/skills/ref-sp-agents-shareable-skills/SKILL.md.

The two skills are **complementary but independent**, and neither hard-depends on the other. You
can author an excellent skill that is deliberately `repo-local` and never touches the sharing spec,
and you can share a skill whose general quality is reviewed here. Consult the sharing spec (a soft
dependency) when a skill should also be shared; use this skill for quality regardless.

Their validators are also separate and non-overlapping: this skill's `./scripts/validate-skill.mts`
checks general well-formedness and quality; the sharing-spec rules are validated by
ref-sp-agents-shareable-skills. Both are TypeScript and need Node >= 22 (`node ./scripts/validate-skill.mts <skill-dir>`).

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
- `./references/quality-evaluation.md` when a skill needs a rigorous human-plus-quantitative review loop.
- `./references/consolidation-checklist.md` when moving, deduplicating, or rehoming guidance across skills.
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
├── assets/
└── evals/
```

- **Open format:** Skills should remain compatible with the Agent Skills format rather than depending on one client's private conventions.
- **Supporting files are allowed:** Put long checklists, detailed examples, templates, or helper scripts in subfolders instead of cramming everything into `SKILL.md`.
- **Use relative paths only within the same skill:** Link this skill's own resources from `SKILL.md` with `./references/...`, `./scripts/...`, `./assets/...`, or `./evals/...` paths.
- **Use repo-root-relative paths for other skills in the same repo:** If one skill must point to another skill's `SKILL.md` or files in this repository, use an explicit repo-root-relative path such as `.agents/skills/ref-sp-dev-repo-conventions/SKILL.md` so clones, exports, and local folder renames do not break the reference.
- **Reserve absolute paths for outside-the-repo targets:** Use absolute filesystem paths only when the target is genuinely outside the current repository or when the client cannot resolve repo-root-relative paths reliably.
- **Keep loading progressive:** Keep `SKILL.md` concise and move large supporting material into subfiles. Prefer one-level-deep references from `SKILL.md` and tell the agent when to load each file.
- **One responsibility per skill.** A skill about code conventions should not also cover deployment.
- **Frontmatter required:** Every skill must have `name` and `description` in YAML frontmatter.
- **Follow the spec for `name`:** 1-64 chars, lowercase letters/numbers/hyphens only, no leading or trailing hyphen, no consecutive hyphens, and it must match the folder name.
- **Choose the skill prefix by role:** In this repo, use `ref-...` when a skill mainly informs the agent about a domain, workflow, convention, or repository surface. Use `tool-...` when a skill mainly tells the agent to carry out an action-oriented workflow that the user may invoke directly.
- **Name tool skills as actions:** A `tool-...` skill should read like an action connected to its purpose, such as `tool-sp-adopt-these-skills` or `tool-sp-maintain-skills`, not like a passive topic label.
- **Name reference skills as stable subjects:** A `ref-...` skill should name the subject area it explains, such as agent persona, code conventions, project setup, agents security, or local feature tracking.
- **Do not use `tool-...` for passive guidance:** If the skill mostly teaches the agent how to understand or review something rather than execute a user-invoked workflow, it should stay under `ref-...`.
- **Keep `description` under 1024 chars:** It must describe both what the skill does and when to use it.
- **Use optional fields only when they add execution value:** `compatibility` is for environment requirements, `license` for licensing, `metadata` for extra client metadata, and `allowed-tools` only when the client supports it.
- **Domain metadata is governed by the sharing spec:** every skill carries a domain in metadata. This is owned by .agents/skills/ref-sp-agents-shareable-skills/SKILL.md (the `metadata.shareable-skills.domain` field and domain registry). Do not redefine the vocabulary here.
- **Name must match folder:** The `name` field must match the skill folder name.
- **"When to use" section:** Include a clear section so the AI can determine relevance.
- **Concrete examples:** Provide small examples, templates, or commands where they reduce ambiguity.
- **Use synthetic example names by default:** In generic examples, templates, and starter snippets, prefer obviously made-up folder, file, feature, and script names. Do not reuse real folder or script names from this repo or another repo unless the skill is intentionally documenting that exact concrete surface.
- **Provider-agnostic:** No provider-specific features or assumptions. Skills must work with Copilot, Claude, Gemini, and others.
- **Adapt to the real repo:** When a skill is copied or derived from another project, update its commands, libraries, file names, folder layout, and examples to match this repository before keeping it.
- **Do not preserve stale stack details:** Remove or replace inherited references to the wrong package manager, framework, language conventions, file extensions, or UI library when they do not match the current repo.
- **Do not leak foreign repo artifacts into generic examples:** If you copied a template or skill from another repo, replace example paths like feature folders, excluded files, and sample script names with synthetic placeholders unless the skill explicitly says it is documenting the source repo itself.
- **Naming grammar, namespace, and portability live in the sharing spec:** the owner-prefix/domain/topic grammar, and whether a skill is `repo-local`, `organization`, or `public`, are governed by .agents/skills/ref-sp-agents-shareable-skills/SKILL.md. Portability is recorded in `metadata.shareable-skills.visibility`, not encoded in the name. Keep a skill's `name` focused on what it does so discovery and trigger quality stay intact.
- **Make values explicit:** When a skill depends on values like simplicity, clarity, or maintainability, state them directly in the purpose or rules instead of leaving them implicit.
- **Prefer modern defaults:** When a skill gives coding guidance, prefer modern, intention-revealing language and platform APIs over older sentinel-style patterns when both are supported by the project's runtime targets.
- **Prefer operational labels:** When naming workflow steps or guidance sections, prefer labels that describe the actual review/update action. Favor concrete labels like `Reflect` or `Capture Lessons` over vaguer labels like `Learn` when the step includes reviewing outcomes, correcting guidance, and updating the source of truth.

## Sharing, Domain, And Dependency Metadata

Naming grammar, domain, visibility, dependency declarations, and vendoring are the
**sharing spec**, owned by .agents/skills/ref-sp-agents-shareable-skills/SKILL.md. Do not restate or
redefine those rules here — consult that skill (and its `references/spec.md`) when a skill needs to
be assigned a domain, shared, or exported.

What this skill still asserts, because it is general skill quality rather than sharing policy:

- Every skill carries a single domain in metadata (`metadata.shareable-skills.domain`); pick the
  domain, not the repository namespace, and prefer an existing domain over inventing one. The
  vocabulary itself is owned by the sharing spec's domain registry.
- Track portability, dependencies, and namespace through `metadata`, never through the `name`; keep
  the `name` focused on what the skill does so discovery and trigger quality stay intact.
- The Agent Skills spec treats `metadata` as a string-to-string mapping, so do not use YAML lists
  or nested objects in any metadata field.

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
- Use relative paths for files inside the current skill and repo-root-relative paths for files that live in a different skill in this repo.

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

This covers **general skill-quality** validation only. Conformance to the sharing spec (naming
grammar, domain registry, visibility, deps, vendoring) is validated separately by
.agents/skills/ref-sp-agents-shareable-skills/SKILL.md. Run both when a skill should be good *and* shareable.

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

Portable helper scripts live at:

- `./scripts/validate-skill.mts` (TypeScript, Node >= 22) to validate one skill or a whole skills directory against Agent Skills structure and this repo's local quality rules. Run it as `node ./scripts/validate-skill.mts <skill-dir>` or `node ./scripts/validate-skill.mts .agents/skills --all`; from the repo root, `yarn validate:skills` runs the whole catalog (`yarn validate` runs both validators).
- `./scripts/aggregate_eval_results.py` to summarize `grading.json` files from output-quality eval runs.

Use `./evals/evals.json` as the maintained evaluation set for this skill itself.

## Cross-Platform Parity

Keep instructions consistent across all platform-specific files:

| File | Platform |
|------|----------|
| `AGENTS.md` | Cross-provider source of truth (read natively by Copilot and others) |
| `.github/copilot-instructions.md` | GitHub Copilot (only when a repo keeps a dedicated Copilot file) |
| `GEMINI.md` | Google Gemini |
| `.claude/CLAUDE.md` | Anthropic Claude |

The root `AGENTS.md` is the source of truth in this repo (Copilot reads it natively, so there is no dedicated Copilot file), and `GEMINI.md` plus `.claude/CLAUDE.md` should normally stay thin routing stubs.

For detailed guidance on writing and maintaining these instruction files, use `.agents/skills/ref-sp-agents-instructions-authoring/SKILL.md` and its provider-specific reference subfiles instead of expanding this skill further.

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
