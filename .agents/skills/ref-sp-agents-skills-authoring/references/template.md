# Skill Starter Template

Copy, then delete every section the skill does not need.

~~~markdown
---
name: ref-sp-example-topic
description: "What the skill covers, main use case first. Use when <the situations a user would describe>."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "<org>/<repo>"
  shareable-skills.domain: "<registered domain>"
  shareable-skills.visibility: "repo-local"
---

# Example Topic

One to three sentences on what this skill is for. For <related work>, use `<other-skill>` instead.

## <First task>

- Default approach, with the reason when it is not obvious.
- Exception: when X, do Y instead.

## <Second task>

1. Inspect <input>.
2. Run `./scripts/example.py --input data.json`.
3. If it reports errors, fix them and run it again.

## Examples

```text
<a real input and the output it should produce>
```

## Gotchas

- <A fact about this repo or domain that the agent would otherwise get wrong.>

## Before finishing

- <A check that is easy to miss.>

## References

- Read `./references/example.md` when <condition>.
~~~

Before keeping it:

- Pick `ref-` for guidance and `tool-` for a user-invoked workflow.
- Set the sharing metadata from the sharing spec (`ref-sp-agents-shareable-skills`); tool skills
  carry no `domain`. Add `shareable-skills.requires` for hard skill dependencies.
- Replace every placeholder with real repo commands and paths, or with obviously synthetic names.
- Keep the description to 150–300 characters.
