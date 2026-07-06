---
name: tool-sp-create-skill
description: "Create a new skill using this repo's skill-authoring standard. Use when: the user wants to add a new skill, scaffold a skill folder, turn repeated guidance into a skill, or run a guided wizard before writing skill files."
argument-hint: "Skill goal, preferred name if known, whether the skill should be reference-style or tool-style, and any intended domain grouping"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "organization"
  shareable-skills.requires: "ref-sp-agents-skills-authoring"
---

# Create Skill

## Purpose

Guide the agent through a short skill-creation wizard so a new skill is scoped correctly, named correctly, and authored to match this repository's standards.

## When to use this skill

- The user wants to create a new skill.
- The user wants a wizard or guided intake for skill creation.
- Repeated repo guidance should be promoted into a reusable skill.
- The user knows the goal of the skill but not its final name, shape, or supporting files yet.

## First Step

Read .agents/skills/ref-sp-agents-skills-authoring/SKILL.md before drafting the new skill.

## Core Workflow

1. Inspect the user's request and the existing skill set to avoid creating an overlapping duplicate.
2. Ask only the missing intake questions needed to define the skill boundary, name, trigger, outputs, and shareability.
3. Decide whether the new skill is `ref-...` or `tool-...`. Refs put the domain in the name (`ref-sp-<domain>-<topic>`); tools use `tool-sp-<verb>-<topic>` and carry no domain.
4. Choose one `domain` from the registry (`.agents/skills/ref-sp-agents-shareable-skills/references/registry.json`); open a registry issue rather than inventing an unregistered domain.
5. Decide `visibility` (`public` / `organization` / `repo-local`), and list any hard skill dependencies.
6. Draft the smallest useful skill package.
7. Add support files only when they improve progressive disclosure.
8. Validate the new skill against the repo's skill-authoring checklist.

## Defaults

- Default to one `SKILL.md` file first. Add `references/`, `assets/`, or `scripts/` only when the workflow genuinely needs them.
- Default to `ref-...` when the skill mainly informs the agent. Default to `tool-...` when the skill mainly drives an action-oriented workflow the user may invoke directly.
- Follow the name grammar: `ref-sp-<domain>-<topic>` (optional `-template` suffix for app blueprints) and `tool-sp-<verb>-<topic>`, such as `ref-sp-js-typescript`, `ref-sp-agents-security`, or `ref-sp-dev-repo-conventions`.
- Set `metadata.shareable-skills.domain` to a registered domain. Use `.agents/skills/ref-sp-agents-shareable-skills/references/registry.json` (and the sharing spec) for the current domain vocabulary; open a registry issue rather than inventing an unregistered domain.
- Set `metadata.shareable-skills.visibility`: `public` for portable knowledge (add a top-level `license`), `organization` for org-wide but process-specific skills, `repo-local` when it depends on this repo's concrete layout, policies, or wrappers.
- Record hard dependencies in `metadata.shareable-skills.requires` (comma-separated skill names); put soft/optional ones in `metadata.shareable-skills.suggests`.
- Keep hard dependencies few, especially for exportable (`organization`/`public`) skills.
- Keep the first version narrow. Do not solve adjacent workflows in the same skill unless they are operationally inseparable.
- Prefer asking a short focused set of questions over dumping a large questionnaire at once.
- Default generic examples, paths, and script names to clearly synthetic placeholders unless the skill is intentionally documenting a real repo surface.

## Wizard Questions

Ask only the questions that are still unanswered after reading the user's request.

| Question area | What to ask | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Skill goal | What repeated task or failure should this skill improve? | The skill boundary should come from a real job, not a topic label. | Always, unless the request already states the concrete job clearly. | The skill has one primary responsibility. |
| Skill role | Is this mostly reference guidance or a user-invoked action workflow? | The answer determines whether the name should start with `ref-` or `tool-`. | When the role is not already obvious. | The skill gets the right prefix and interaction style. |
| Domain | Which registered `domain` does the skill belong to (`agents`, `js`, `py`, `db`, `dev`, ...)? | Domain drives the name (`ref-sp-<domain>-<topic>`) and catalog grouping, and is validated against the registry. | Always, since every skill carries a domain. | The skill has one registered `domain`, reflected in the name for refs. |
| Visibility | Is the skill `public` (portable knowledge), `organization` (org-wide but process-specific), or `repo-local` (depends on this repo)? | Visibility sets export scope; `public` additionally requires a `license`. | When transferability is not already obvious. | The skill gets the right `visibility` (and a `license` if `public`). |
| Skill dependencies | What other skills are hard requirements (`requires`) versus helpful-but-optional (`suggests`)? | Exportable skills should keep hard dependencies few and explicit. | When the new skill relies on another skill's instructions. | `requires` is minimal and accurate; extras go in `suggests`. |
| Trigger surface | What kinds of user requests should activate this skill? | The description must match realistic intent, not internal implementation language. | When the triggering language is still vague. | The skill can be described with a specific activation sentence. |
| Scope boundaries | What should this skill explicitly not cover? | This prevents mixed skills that sprawl into adjacent domains. | When the request could overlap with an existing skill or a neighboring workflow. | The skill has clear exclusions and fewer false positives. |
| Support files | Will the skill need references, assets, or scripts? | The package should stay lean unless larger support files provide real value. | When the workflow looks long, branched, or format-sensitive. | The skill package has only the files it actually needs. |
| Validation | How should the new skill be checked once drafted? | The skill should ship with a concrete validation loop rather than unchecked prose. | When the workflow has an obvious checklist, trigger test, or output check. | The authoring pass ends with a focused validation step. |

## Gotchas

- Do not ask every question in the table if the user already answered most of them.
- Do not create a `tool-...` skill just because the skill mentions commands. A reference skill can still mention commands.
- Do not encode shareability or namespace in the skill name. Use `metadata.shareable-skills.visibility` instead.
- Do not create support files preemptively if a concise `SKILL.md` is enough.
- Do not copy real folder or script names from another repo into generic examples just because they came along with a borrowed template.
- If the new skill would substantially overlap with an existing one, stop and clarify whether the user wants an update instead of a new skill.

## Validation

- Review the draft against .agents/skills/ref-sp-agents-skills-authoring/references/checklist.md.
- Confirm the `name` matches the folder and follows the grammar (`ref-sp-<domain>-<topic>` or `tool-sp-<verb>-<topic>`).
- Confirm `metadata.shareable-skills.domain` is a registered domain, `metadata.shareable-skills.visibility` is set (with a top-level `license` when `public`), and `metadata.shareable-skills.requires`/`.suggests` are comma-separated strings (metadata is string-to-string, not YAML lists).
- Run the sharing-spec validator: `node .agents/skills/ref-sp-agents-shareable-skills/scripts/validate-sharing.mts <skill-dir>` (Node >= 22).
- Confirm cross-skill references use repo-root-relative paths for skills in this repo.
- Confirm generic examples use synthetic folder, feature, and script names rather than real names copied from another repo.
- Run a targeted error check on the new files before concluding.
