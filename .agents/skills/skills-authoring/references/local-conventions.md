# Local Conventions

Use this file when you need to know which `skills-authoring` rules are intentional repo conventions rather than part of the official Agent Skills references.

## Purpose

This document records local extensions, interpretations, and stricter conventions used in this repository.

These conventions are allowed, but they should not be mistaken for official Agent Skills spec requirements.

Last verified: 2026-05-01

## Conventions Registry

| Convention | Why we use it | Relationship to original references | Review trigger | Last verified |
| --- | --- | --- | --- | --- |
| Use absolute filesystem paths when referencing another skill. | Cross-skill references are otherwise easy to resolve incorrectly across different clients, sandboxes, and working directories. | The original docs explicitly support relative paths for files inside the current skill, but they do not define a stable cross-skill reference convention. | Revisit if Agent Skills publishes an explicit cross-skill reference standard. | 2026-05-01 |
| Use relative paths for files inside the current skill. | This matches the official skill-root relative reference model and keeps local references portable. | Directly aligned with the official references. | Revisit only if the official spec changes. | 2026-05-01 |
| Use the `what / why / when / expected outcome` framing pattern for important commands or actions. | Bare command lists are ambiguous. This structure makes task intent, trigger conditions, and success criteria explicit. | The exact pattern is local, but it is supported conceptually by the original planning, reasoning, communication, and tool-use material. | Revisit if it proves too heavy or if a better pattern emerges from real skill revisions. | 2026-05-01 |
| Treat `task_framing_expectations` in the eval example JSON as a local example field. | It helps document what a good workflow-oriented result should contain. | Not part of the official eval schema described in the Agent Skills evaluation guide. | Revisit if we want strict schema fidelity in all example files. | 2026-05-01 |
| Keep traceability and conventions docs under `skills-authoring/references/` rather than the entry `SKILL.md`. | This preserves progressive disclosure and keeps the entry skill focused on operational guidance. | Consistent with the original progressive-disclosure model. | Revisit only if the package becomes too fragmented. | 2026-05-01 |

## Convention Details

## Absolute Cross-Skill Paths

Decision:

- When one skill needs to reference a different skill, use an absolute filesystem path.

Reason:

- The official references clearly support same-skill relative paths, but do not define a stable cross-skill reference convention.
- Absolute paths remove ambiguity across clients, working directories, and sandbox setups.

Scope:

- Applies only to references that leave the current skill directory.

## Same-Skill Relative Paths

Decision:

- Use relative paths for files that live inside the current skill.

Reason:

- This matches the official skill-root relative reference model.
- It keeps same-skill references portable and concise.

Scope:

- Applies to `./references/...`, `./scripts/...`, `./assets/...`, and similar in-skill paths.

## Task Framing Pattern

Decision:

- For important commands or operational actions, we may frame the step with `what`, `why`, `when`, and `expected outcome`.

Reason:

- Bare command lists are often too ambiguous for reliable agent behavior.
- This structure makes the trigger condition, purpose, and success signal explicit.

Scope:

- Use when the skill has multiple commands, branching steps, or steps that are easy to misuse.

## Eval Example Extension

Decision:

- The `task_framing_expectations` field in the eval example JSON is treated as a local example extension.

Reason:

- It helps describe workflow-quality expectations in examples.
- It is not part of the official Agent Skills evaluation format.

Scope:

- Applies to local example files and documentation in this repo.

## Traceability Docs Placement

Decision:

- Keep traceability and local-conventions docs in `skills-authoring/references/` instead of the entry `SKILL.md`.

Reason:

- This preserves progressive disclosure and keeps the entry skill operational.

Scope:

- Applies to deep explanatory material for this skill.

## Use Rule

Before adding a new convention to `skills-authoring`, ask:

1. Is this directly required by the original references?
2. If not, does it solve a real ambiguity or repeated failure in this repo?
3. Should it be labeled as local so future readers do not confuse it with the standard?

If the answer to 2 is no, do not add the convention.

## Change Rule

Whenever a local convention is added or removed:

- update this file,
- update `./source-traceability.md`,
- and make the affected examples or templates match the decision.
