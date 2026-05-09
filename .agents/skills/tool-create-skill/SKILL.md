---
name: tool-create-skill
description: "Create a new skill using this repo's skill-authoring standard. Use when: the user wants to add a new skill, scaffold a skill folder, turn repeated guidance into a skill, or run a guided wizard before writing skill files."
argument-hint: "Skill goal, preferred name if known, and whether the skill should be reference-style or tool-style"
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

Read C:/Users/fcole/Projects/swiftpost-shareable-skills/.agents/skills/ref-skills-authoring/SKILL.md before drafting the new skill.

## Core Workflow

1. Inspect the user's request and the existing skill set to avoid creating an overlapping duplicate.
2. Ask only the missing intake questions needed to define the skill boundary, name, trigger, and outputs.
3. Decide whether the new skill is `ref-...` or `tool-...`.
4. Draft the smallest useful skill package.
5. Add support files only when they improve progressive disclosure.
6. Validate the new skill against the repo's skill-authoring checklist.

## Defaults

- Default to one `SKILL.md` file first. Add `references/`, `assets/`, or `scripts/` only when the workflow genuinely needs them.
- Default to `ref-...` when the skill mainly informs the agent. Default to `tool-...` when the skill mainly drives an action-oriented workflow the user may invoke directly.
- Keep the first version narrow. Do not solve adjacent workflows in the same skill unless they are operationally inseparable.
- Prefer asking a short focused set of questions over dumping a large questionnaire at once.

## Wizard Questions

Ask only the questions that are still unanswered after reading the user's request.

| Question area | What to ask | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Skill goal | What repeated task or failure should this skill improve? | The skill boundary should come from a real job, not a topic label. | Always, unless the request already states the concrete job clearly. | The skill has one primary responsibility. |
| Skill role | Is this mostly reference guidance or a user-invoked action workflow? | The answer determines whether the name should start with `ref-` or `tool-`. | When the role is not already obvious. | The skill gets the right prefix and interaction style. |
| Trigger surface | What kinds of user requests should activate this skill? | The description must match realistic intent, not internal implementation language. | When the triggering language is still vague. | The skill can be described with a specific activation sentence. |
| Scope boundaries | What should this skill explicitly not cover? | This prevents mixed skills that sprawl into adjacent domains. | When the request could overlap with an existing skill or a neighboring workflow. | The skill has clear exclusions and fewer false positives. |
| Support files | Will the skill need references, assets, or scripts? | The package should stay lean unless larger support files provide real value. | When the workflow looks long, branched, or format-sensitive. | The skill package has only the files it actually needs. |
| Validation | How should the new skill be checked once drafted? | The skill should ship with a concrete validation loop rather than unchecked prose. | When the workflow has an obvious checklist, trigger test, or output check. | The authoring pass ends with a focused validation step. |

## Gotchas

- Do not ask every question in the table if the user already answered most of them.
- Do not create a `tool-...` skill just because the skill mentions commands. A reference skill can still mention commands.
- Do not create support files preemptively if a concise `SKILL.md` is enough.
- If the new skill would substantially overlap with an existing one, stop and clarify whether the user wants an update instead of a new skill.

## Validation

- Review the draft against C:/Users/fcole/Projects/swiftpost-shareable-skills/.agents/skills/ref-skills-authoring/references/checklist.md.
- Confirm the `name` matches the folder and uses the correct `ref-` or `tool-` prefix.
- Confirm any cross-skill reference uses an absolute path.
- Run a targeted error check on the new files before concluding.
