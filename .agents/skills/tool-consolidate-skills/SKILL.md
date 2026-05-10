---
name: tool-consolidate-skills
description: "Consolidate overlapping guidance across project skills and top-level Copilot instructions. Use when: copilot-instructions.md is getting bloated, multiple skills repeat the same rule, guidance belongs in the wrong file, a copied skill still mentions the wrong stack, or a long skill should be split into references, assets, or scripts."
metadata:
   shareable-skills.visibility: "shareable"
argument-hint: "What guidance should be consolidated?"
---

# Consolidate Skills

## Purpose

Keep project guidance simple, discoverable, and maintainable by giving each rule one clear home. Use `copilot-instructions.md` for always-on repo rules and routing. Use skills for domain-specific guidance. Use skill subfiles for large supporting material.

Use [the consolidation checklist](./references/checklist.md) after restructuring skills or top-level instructions.

## When to use this skill

- Reducing duplication across `.agents/skills/`.
- Trimming `copilot-instructions.md` without losing important rules.
- Moving guidance into the right owning skill.
- Adapting copied skill content to the actual libraries, commands, and file conventions used by this repo.
- Splitting a large skill into smaller references, assets, or scripts.
- Reviewing whether a rule should be always-on or only loaded on demand.

## Procedure

1. Inventory the current guidance.
   - List the relevant rules in `copilot-instructions.md` and the affected skills.
   - Note duplicate, conflicting, or misplaced guidance.
   - Flag copied-over commands, libraries, file extensions, or framework references that do not match the current repo.
2. Choose the right home for each rule.
   - Keep always-on project workflow, approval, and safety rules in `copilot-instructions.md`.
   - Move implementation guidance into the owning skill.
   - Move large examples, checklists, or templates into skill subfiles.
3. Consolidate to a single source of truth.
   - Remove duplicate wording instead of keeping multiple nearly identical copies.
   - Leave short routing summaries at the top level when the detailed rule now lives in a skill.
   - Update skill descriptions so the moved guidance stays discoverable.
   - Replace stale stack references with the repo's actual tools, libraries, and file conventions.
4. Verify the result.
   - Check that each rule has one primary home.
   - Check that the top-level instructions are still short and durable.
   - Check that skill references use relative `./` paths.
   - Check that no moved guidance became harder to find.

## Decision Rules

- If a rule applies to most work in the repo, keep it in `copilot-instructions.md`.
- If a rule is specific to a domain like styling, Next.js, or code conventions, move it into that skill.
- If a skill is reusable across many projects, keep its name generic. If it depends on repo-only packages or wrappers, use repo-specific naming.
- If copied guidance mentions the wrong package manager, library, framework, or file extension, treat that as stale content to be rewritten, not preserved.
- If a skill is getting long, split detailed material into [reference files](./references/checklist.md) or other subfiles.
- If ownership is unclear, ask which file should be the source of truth before duplicating the rule.

## Completion Checks

- Each important rule exists in one primary location.
- `copilot-instructions.md` contains routing and durable repo rules, not domain detail.
- Skill descriptions still contain the trigger words needed for discovery.
- Copied guidance has been adapted to the repo's real stack instead of preserving inherited library or command names.
- Supporting material is moved into subfiles when that makes the entry skill easier to scan.---
name: tool-consolidate-skills
description: "Consolidate overlapping guidance across project skills and top-level Copilot instructions. Use when: copilot-instructions.md is getting bloated, multiple skills repeat the same rule, guidance belongs in the wrong file, a copied skill still mentions the wrong stack, or a long skill should be split into references, assets, or scripts."
metadata:
   shareable-skills.visibility: "shareable"
argument-hint: "What guidance should be consolidated?"
---

# Consolidate Skills

## Purpose

Keep project guidance simple, discoverable, and maintainable by giving each rule one clear home. Use `copilot-instructions.md` for always-on repo rules and routing. Use skills for domain-specific guidance. Use skill subfiles for large supporting material.

Use [the consolidation checklist](./references/checklist.md) after restructuring skills or top-level instructions.

## When to use this skill

- Reducing duplication across `.agents/skills/`.
- Trimming `copilot-instructions.md` without losing important rules.
- Moving guidance into the right owning skill.
- Adapting copied skill content to the actual libraries, commands, and file conventions used by this repo.
- Splitting a large skill into smaller references, assets, or scripts.
- Reviewing whether a rule should be always-on or only loaded on demand.

## Procedure

1. Inventory the current guidance.
   - List the relevant rules in `copilot-instructions.md` and the affected skills.
   - Note duplicate, conflicting, or misplaced guidance.
   - Flag copied-over commands, libraries, file extensions, or framework references that do not match the current repo.
2. Choose the right home for each rule.
   - Keep always-on project workflow, approval, and safety rules in `copilot-instructions.md`.
   - Move implementation guidance into the owning skill.
   - Move large examples, checklists, or templates into skill subfiles.
3. Consolidate to a single source of truth.
   - Remove duplicate wording instead of keeping multiple nearly identical copies.
   - Leave short routing summaries at the top level when the detailed rule now lives in a skill.
   - Update skill descriptions so the moved guidance stays discoverable.
   - Replace stale stack references with the repo's actual tools, libraries, and file conventions.
4. Verify the result.
   - Check that each rule has one primary home.
   - Check that the top-level instructions are still short and durable.
   - Check that skill references use relative `./` paths.
   - Check that no moved guidance became harder to find.

## Decision Rules

- If a rule applies to most work in the repo, keep it in `copilot-instructions.md`.
- If a rule is specific to a domain like styling, Next.js, or code conventions, move it into that skill.
- If a skill is reusable across many projects, keep its name generic. If it depends on repo-only packages or wrappers, use repo-specific naming.
- If copied guidance mentions the wrong package manager, library, framework, or file extension, treat that as stale content to be rewritten, not preserved.
- If a skill is getting long, split detailed material into [reference files](./references/checklist.md) or other subfiles.
- If ownership is unclear, ask which file should be the source of truth before duplicating the rule.

## Completion Checks

- Each important rule exists in one primary location.
- `copilot-instructions.md` contains routing and durable repo rules, not domain detail.
- Skill descriptions still contain the trigger words needed for discovery.
- Copied guidance has been adapted to the repo's real stack instead of preserving inherited library or command names.
- Supporting material is moved into subfiles when that makes the entry skill easier to scan.
