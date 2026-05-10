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

## Defaults

- Prefer feature-first organization over type-based dumping grounds.
- Keep product code under the main source tree.
- Keep maintenance and repo automation separate from product features.
- Keep tests near the code they explain when the project layout allows it.
- Extract shared utilities only after real reuse appears.

## Core Rules

### Feature boundaries

- Give each feature a folder or slice that is easy to find and reason about.
- Keep the code, tests, and local assets that change together close together.
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

## Validation

- A new engineer can find the owning feature quickly.
- Product code is not hidden inside maintenance paths.
- Shared utilities exist because of real reuse, not prediction.
- Feature boundaries are explicit and avoid backdoor dependencies.
- Tests live close enough to their source that maintenance stays cheap.

## References

- Read `./references/checklist.md` for a quick repository-structure review pass.
- Read `./assets/trigger-eval-queries.example.json` when testing whether architecture requests activate this skill cleanly.