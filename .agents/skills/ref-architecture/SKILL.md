---
name: ref-architecture
description: "Portable architecture guidance for feature folders, boundaries, shared utilities, and separating product code from maintenance scripts. Use when: deciding where code should live, splitting features, or reviewing repository structure."
metadata:
  shareable-skills.visibility: "shareable"
---

# Architecture

## Purpose

Provide portable repository and feature-structure defaults that keep codebases modular, discoverable, and resistant to accidental coupling.

## When to use this skill

- Designing the folder layout for a new feature or tool.
- Deciding whether code belongs in product source or in maintenance scripts.
- Reviewing whether a feature has grown beyond one file or one folder.
- Choosing when shared utilities are justified.
- Refactoring a repository that has started to blur boundaries.

## Scope Boundaries

- Use this skill for portable structure decisions such as feature boundaries, shared-utility thresholds, and product-versus-maintenance separation.
- Use `.agents/skills/ref-project-structure-setup/SKILL.md` when the question is about this repository's exact top-level folders, `pyproject.toml`, or agent wiring.
- Use `.agents/skills/ref-python/SKILL.md`, `.agents/skills/ref-javascript/SKILL.md`, or `.agents/skills/ref-typescript/SKILL.md` when the question is about language-specific folder shapes.
- Use `.agents/skills/ref-app-web-standalone/SKILL.md` when the structure question is specific to a browser-only local app or mini-tool.

## Defaults

- Prefer feature-first organization over type-based dumping grounds.
- Keep product code under the main source tree.
- Keep maintenance and repo automation separate from product features.
- Keep tests near the code they explain when the project layout allows it.
- Add a short `README.md` at the root of each real feature folder so the feature's purpose and entrypoints are obvious without reading code first.
- Extract shared utilities only after real reuse appears.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Define feature boundaries | Decide what belongs inside one feature slice and what should stay outside it. | Clear ownership reduces coupling and makes refactors cheaper. | When creating a new feature or splitting a large one. | The owning folder is obvious and internal details stay internal. |
| Promote product code out of maintenance paths | Move shipped or user-facing behavior under the main source tree instead of leaving it in `scripts/`. | Prototype placement often lingers long after the code becomes part of the product. | When a script becomes a real feature or installed command. | Product code is discoverable and tested like the rest of the source tree. |
| Decide whether to share a utility | Judge whether repeated logic is stable enough to extract or still cheap to duplicate locally. | Premature sharing creates invisible dependencies and vague utility buckets. | When two or more features start to reuse similar helpers. | Shared code exists for real reuse and has a clear home. |

## Core Rules

### Feature boundaries

- Give each feature a folder or slice that is easy to find and reason about.
- Keep the code, tests, and local assets that change together close together.
- When a feature has its own folder, add a short `README.md` there that explains what the feature owns, where the main entrypoints live, and how to validate it.
- Avoid letting one feature depend directly on another feature's internals.

### Shared code

- Create shared utilities only when reuse is real and stable.
- Do not create a global `utils` or `helpers` bucket unless it has clear internal categories.
- Prefer duplication of tiny stable code over premature shared abstractions that create coupling.

### Product code vs maintenance scripts

- If code is a user-facing feature of the product or package, keep it under the main source tree.
- If code is repo maintenance, migration, scaffolding, or one-off automation, keep it in `scripts/` or the equivalent maintenance area.
- Do not leave product behavior buried in maintenance scripts just because it started as a prototype.

### Naming and discoverability

- Choose folder names that match the domain or workflow they contain.
- Keep file names descriptive enough that a reader can predict the contents before opening them.
- Avoid over-generic folder names when a narrower domain name exists.

### Growth path

- Start small, but keep a path open for splitting files as complexity grows.
- Extract pure helpers before extracting stateful orchestration.
- If a file is hard to scan, split by responsibility inside the same feature before introducing repo-wide infrastructure.

## Example Layouts

### Python package with feature-first layout

```text
scripts/ (only for devs, not installed with the package)
  data-migration.py
  generate-docs.py
src/package_name/
  billing/
    main.py
    main_test.py
    service.py
    service_test.py
```

### JavaScript or TypeScript package in a monorepo

```text
scripts/ (only for devs, not installed with the package)
  data-migration.mts
  generate-docs.mts
packages/package-name/
  src/
    billing/
      index.ts
      parse-invoice.ts
      parse-invoice.test.ts
```

### Standalone browser tool with local assets

```text
scripts/ (only for devs, not installed with the package)
  data-migration.mjs/mts
  generate-docs.mjs/mts
src/features/billing/
  index.html
  app.js
  styles.css
```

## Validation

- A new engineer can find the owning feature quickly.
- Product code is not hidden inside maintenance paths.
- Shared utilities exist because of real reuse, not prediction.
- Feature boundaries are explicit and avoid backdoor dependencies.
- Tests live close enough to their source that maintenance stays cheap.

## References

- Read `./references/checklist.md` for a quick repository-structure review pass.
- Read `./assets/trigger-eval-queries.example.json` when testing whether architecture requests activate this skill cleanly.
