# Local Conventions

Use this file when you need to know which `ref-skills-authoring` rules are intentional repo conventions rather than part of the official Agent Skills references.

## Purpose

This document records local extensions, interpretations, and stricter conventions used in this repository.

These conventions are allowed, but they should not be mistaken for official Agent Skills spec requirements.

Last verified: 2026-05-21

## Conventions Registry

| Convention | Why we use it | Relationship to original references | Review trigger | Last verified |
| --- | --- | --- | --- | --- |
| Use repo-root-relative paths when referencing another skill in this repository. | Repo-root-relative paths survive clones and exports better than machine-specific absolute paths while avoiding ambiguous `../` hops. | The original docs explicitly support relative paths for files inside the current skill, but they do not define a stable cross-skill reference convention. | Revisit if Agent Skills publishes an explicit cross-skill reference standard. | 2026-05-21 |
| Use relative paths for files inside the current skill. | This matches the official skill-root relative reference model and keeps local references portable. | Directly aligned with the official references. | Revisit only if the official spec changes. | 2026-05-01 |
| Prefix reference-heavy skills with `ref-` and action-heavy skills with `tool-`. | The prefix makes the skill's role discoverable before the agent loads the body. It also distinguishes passive guidance from action workflows. | This is a local naming convention layered on top of the base Agent Skills name constraints. | Revisit if the repo's skill mix changes or if a better role signal proves more reliable. | 2026-05-09 |
| Track skill exportability and hard skill dependencies in `metadata` using `shareable-skills.visibility`, `shareable-skills.requires`, and `shareable-skills.reason`. | Names should stay focused on discovery and activation, while metadata can drive export and dependency tooling without polluting the trigger surface. | This is a local convention built on top of the spec's arbitrary string metadata field. | Revisit if Agent Skills standardizes shareability or dependency metadata. | 2026-05-10 |
| Use the `what / why / when / expected outcome` framing pattern for important commands or actions. | Bare command lists are ambiguous. This structure makes task intent, trigger conditions, and success criteria explicit. | The exact pattern is local, but it is supported conceptually by the original planning, reasoning, communication, and tool-use material. | Revisit if it proves too heavy or if a better pattern emerges from real skill revisions. | 2026-05-01 |
| Treat `task_framing_expectations` in the eval example JSON as a local example field. | It helps document what a good workflow-oriented result should contain. | Not part of the official eval schema described in the Agent Skills evaluation guide. | Revisit if we want strict schema fidelity in all example files. | 2026-05-01 |
| Keep traceability and conventions docs under `ref-skills-authoring/references/` rather than the entry `SKILL.md`. | This preserves progressive disclosure and keeps the entry skill focused on operational guidance. | Consistent with the original progressive-disclosure model. | Revisit only if the package becomes too fragmented. | 2026-05-01 |

## Convention Details

## Repo-Root-Relative Cross-Skill Paths

Decision:

- When one skill needs to reference a different skill in this repository, use a repo-root-relative path such as `.agents/skills/ref-code-conventions/SKILL.md`.
- Use absolute filesystem paths only when the target is outside the current repository or when the client cannot resolve repo-root-relative paths reliably.

Reason:

- The official references clearly support same-skill relative paths, but do not define a stable cross-skill reference convention.
- Repo-root-relative paths remove ambiguity without baking one developer machine path into a shareable skill.

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

## Skill Role Prefixes

Decision:

- Use `ref-...` for reference-heavy skills and `tool-...` for action-heavy skills.

Reason:

- The prefix signals the skill's job before the agent loads the full file.
- It distinguishes passive guidance from user-invoked workflows more clearly than a generic name does.

Scope:

- Applies to skill folder names and frontmatter `name` fields in this repo.

## Shareability Metadata

Decision:

- Use `shareable-skills.visibility` with `shareable` or `repo-local`.
- Use `shareable-skills.requires` as a space-separated string of hard dependency skill names.
- Use `shareable-skills.reason` as an optional short explanation when a skill is repo-local or a dependency is not obvious.

Reason:

- The Agent Skills spec exposes `metadata` as a string-to-string mapping, so a flat string encoding is the simplest portable way to track exportability and dependencies.
- Names should keep describing the skill's function for activation quality instead of being repurposed for packaging labels like `internal-...` or `shareable-...`.
- Future tooling can parse these keys to copy, validate, or export only the intended skills and their hard dependencies.

Scope:

- Applies to skills in this repo when we need to track whether they are meant to be shared and which other skills they require.

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

- Keep traceability and local-conventions docs in `ref-skills-authoring/references/` instead of the entry `SKILL.md`.

Reason:

- This preserves progressive disclosure and keeps the entry skill operational.

Scope:

- Applies to deep explanatory material for this skill.

## Use Rule

Before adding a new convention to `ref-skills-authoring`, ask:

1. Is this directly required by the original references?
2. If not, does it solve a real ambiguity or repeated failure in this repo?
3. Should it be labeled as local so future readers do not confuse it with the standard?

If the answer to 2 is no, do not add the convention.

## Change Rule

Whenever a local convention is added or removed:

- update this file,
- update `./source-traceability.md`,
- and make the affected examples or templates match the decision.
