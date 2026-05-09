# Consolidation Checklist

Use this checklist after reorganizing instructions or skills.

- Did each rule end up with one clear source of truth?
- Did you remove duplicated wording instead of leaving near-copies behind?
- Does `copilot-instructions.md` now contain only repo-wide rules, workflow, routing, and safety guidance?
- Does the owning skill now contain the detailed rule that was removed from the top-level guide?
- Did you update the skill description so the moved guidance is still discoverable?
- Did you replace copied-over library names, commands, file extensions, and framework references with ones that actually match this repo?
- Did you keep reusable guidance under generic skill names and reserve repo-specific naming for genuinely repo-only packages or wrappers?
- If the skill was getting long, did you move large examples, checklists, or templates into `references/`, `assets/`, or `scripts/`?
- Are all skill resource links relative and one level deep from `SKILL.md`?
- If you were unsure where a rule belonged, did you clarify ownership instead of duplicating it?

Typical moves from this repo:

- Dependency preferences belong in `code-conventions`, not in `copilot-instructions.md`.
- "Ask for clarification rather than making assumptions" belongs in `copilot-instructions.md` because it applies broadly.
- AI guardrail behavior belongs in `ai-security` plus the top-level restricted-file policy summary.
- Copied examples must use this repo's real commands and libraries instead of inherited ones from another project.
