# Skill Review Checklist

Use when creating, reviewing, refactoring, or consolidating skills.

## One skill

- One coherent responsibility; it would not be clearer as two skills, or as part of another.
- `name` matches the folder and uses `ref-` (guidance) or `tool-` (user-invoked workflow).
- Description: what it covers, then "Use when …", 150–300 characters, user's words.
- Opens with one to three sentences of orientation, naming neighbouring skills.
- No Purpose / When to use / Values sections and no what/why/when/outcome tables.
- Each rule appears once; "Before finishing" adds checks, it does not repeat rules.
- Nothing the agent already knows; each line changes behaviour.
- Defaults rather than menus; exact commands and paths for fragile steps.
- Gotchas in `SKILL.md`.
- No plans, status, or history; dated sources are fine.
- Examples use real repo surfaces or obviously synthetic names; nothing copied from another repo.
- `SKILL.md` under about 200 lines; references one level deep, each with a load condition.
- Same-skill links are `./...`; other skills are `.agents/skills/<name>/...`.
- `metadata` is a flat string map; sharing fields follow the sharing spec.
- Scripts are non-interactive with `--help`.
- `yarn validate` passes.

## Across skills

- Each rule has one owner skill. Others point to it in a sentence instead of restating it.
- Merge skills that give the same rule in different words, or that always load together.
- Split a skill when most activations only need a small, unrelated part of it.
- Prefer extending an existing owner over adding a new skill: every skill costs listing budget.
- After moving, renaming, or deleting guidance, search for references to the old name or path.
- Re-run trigger evals when a consolidation changes descriptions.
