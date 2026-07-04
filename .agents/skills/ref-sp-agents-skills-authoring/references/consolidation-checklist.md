# Skill Consolidation Checklist

Use this checklist when a maintenance pass reveals duplicated, misplaced, copied, or competing guidance across skills.

## Ownership

- Identify the one skill that should own the durable rule, command, or decision surface.
- Keep repo-specific implementation details in repo-specific skills and portable defaults in shareable reference skills.
- Move workflow instructions to `tool-...` skills only when the skill's main purpose is an action the user may invoke directly.
- Keep reference guidance in `ref-...` skills when it mainly helps the agent understand a domain, convention, or review surface.

## Merge Or Split

- Merge duplicated guidance when two skills tell the agent the same rule with different wording.
- Split a skill when most activations only need a small unrelated subset of the loaded instructions.
- Prefer a short pointer from secondary skills to the owner instead of repeating the full rule.
- Do not create a new skill when an existing owner can absorb the guidance cleanly.

## References

- Use `./references/...`, `./scripts/...`, `./assets/...`, or `./evals/...` only for files inside the current skill.
- Use repo-root-relative `.agents/skills/...` paths when pointing to another skill in this repository.
- Remove dead references when guidance is moved, renamed, or deleted.
- Replace copied repo-specific examples with synthetic examples unless the skill intentionally documents that real surface.

## Validation

- Run `node ./scripts/validate-skill.mts <skill-dir>` for touched skills or `node ./scripts/validate-skill.mts .agents/skills --all` for catalog-wide consolidation (needs Node >= 22).
- Re-run the repo's skill discovery command when names, metadata, dependencies, or descriptions change.
- Check related eval prompts when consolidation changes trigger wording or expected outputs.
- Record the reason for non-obvious consolidation decisions in the task note, commit body, or relevant reference file.
