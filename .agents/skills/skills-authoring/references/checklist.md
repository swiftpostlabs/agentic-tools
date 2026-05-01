# Skill Authoring Checklist

Use this checklist when creating, reviewing, or refactoring a skill.

- Does the skill have one clear responsibility?
- Does the YAML frontmatter include `name` and `description`?
- Does the `name` field match the folder name and follow the Agent Skills naming constraints?
- Is the `description` concise, specific, and written as a trigger for activation rather than a generic summary?
- Does the skill include a clear `When to use` section?
- Does the `SKILL.md` contain the core instructions the agent needs on every activation?
- Does the skill tell the agent when to read supporting files instead of vaguely mentioning them?
- Does the guidance use this repo's actual commands, file paths, packages, and conventions?
- Were stale references from another project removed instead of preserved?
- If the skill is repo-specific, is that made explicit in the name or wording?
- Does `SKILL.md` stay concise, with long checklists, templates, or examples moved into `references/`, `assets/`, or `scripts/`?
- Are all links to supporting files relative `./references/...`, `./assets/...`, or `./scripts/...` paths?
- If the skill references a different skill, does it use an absolute path instead of a relative cross-skill path?
- For important commands or actions, does the skill make `what`, `why`, `when`, and expected outcome explicit?
- Does the skill cover the operational pieces the agent needs: what to inspect, how to plan, what tools to call, how to validate, and what to output?
- Are critical gotchas kept in `SKILL.md` when the agent must see them before hitting the failure?
- Does the skill provide a default approach instead of a menu of equally weighted options?
- If scripts are included, are they non-interactive, predictable, and described clearly enough for agent use?
- If the skill is important or complex, is there at least a lightweight evaluation plan for trigger quality and output quality?
- Does the skill avoid provider-specific assumptions unless a real platform-specific exception is required?
- If provider files are mentioned, does the skill preserve the reference-first pattern where `.github/copilot-instructions.md` is the source of truth and `GEMINI.md` / `.claude/CLAUDE.md` are thin stubs by default?
- Are workflow labels concrete and operational instead of vague?

Typical fixes:

- Rewrite the description so it matches realistic user intent and near-miss phrasings.
- Move large templates out of `SKILL.md` and into `references/`.
- Add explicit load conditions for support files.
- Move recurring helper logic into `scripts/`.
- Add a gotchas section for repeated agent mistakes.
- Replace equal-option lists with one default plus a fallback.
- Replace inherited package-manager or framework examples with this repo's real stack.
- Split mixed guidance into separate skills when one file is trying to cover multiple domains.
