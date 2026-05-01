# Skill Starter Template

~~~markdown
---
name: my-skill
description: "Brief description. Use when: trigger condition 1, trigger condition 2."
argument-hint: "Optional slash-command hint"
---

# Skill Title

## Purpose

One-sentence description of the capability or workflow this skill gives the agent.

## When to use this skill

- Trigger condition 1.
- Trigger condition 2.

## Core Workflow

1. First inspect the relevant inputs.
2. Follow the default procedure.
3. Validate the result before finalizing.

## Defaults

- Preferred tool, command, library, or approach.
- Fallback only when the default does not apply.

## Task Framing

Use this table when the skill includes important commands or operational steps:

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| `./scripts/example.py --input data.json` | Briefly state what the step does. | Explain why the step matters. | State when to use it. | State what success looks like. |

## Gotchas

- Non-obvious repo or domain fact the agent will likely miss.
- Important constraint or failure mode.

## Validation

- Required checks, scripts, or references to run before concluding.

## References

- Read `./references/example.md` when a specific condition is true.
- Read `C:/absolute/path/to/other-skill/SKILL.md` only when you intentionally need to hand off to another skill.

## Scripts

- `./scripts/example.py` does X. Run it when Y is needed.

## Examples

```md
<!-- Concrete example -->
```
~~~

Adapt the template to the real repo before keeping it:

- Replace placeholder names, commands, and file paths.
- Rewrite the `description` so it triggers on realistic user intent.
- Remove sections that do not add value for the skill's actual responsibility.
- Keep critical gotchas in `SKILL.md` and move bulky detail into `references/`, `assets/`, or `scripts/`.
- Use relative paths for this skill's own files and absolute paths for other skills.
- If the skill includes commands or task steps, frame them with what, why, when, and expected outcome.
- If the workflow is fragile or multistep, add an explicit plan-validate-execute loop.
