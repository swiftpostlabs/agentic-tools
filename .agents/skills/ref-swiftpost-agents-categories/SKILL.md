---
name: ref-swiftpost-agents-categories
description: "Repository-specific guidance for assigning agentic-tools category metadata to skills. Use when: creating or reviewing skill frontmatter, deciding whether a new category is needed, or grouping this repo's skills by domain."
metadata:
  agentic-tools-category: "agents"
  shareable-skills.visibility: "repo-local"
  shareable-skills.reason: "This reference documents this repo's concrete skill-category taxonomy and catalog conventions."
---

# Swiftpost Agents Categories

## Purpose

Define the `agentic-tools-category` metadata used to group this repo's skills by domain without mixing that domain grouping with shareability, skill role, or Swiftpost-specific naming.

## When to use this skill

- Adding or reviewing `agentic-tools-category` metadata in skill frontmatter.
- Creating a new skill and choosing its category.
- Deciding whether an existing category fits or a new category is justified.
- Reviewing the current skill catalog for category drift.

## Metadata Rule

Add exactly one category to each skill's frontmatter:

```yaml
metadata:
  agentic-tools-category: "js"
  shareable-skills.visibility: "shareable"
```

Use a short lowercase string. The category should describe the domain the skill helps with, not whether the skill is `ref-...` or `tool-...`, and not whether it is shareable.

## Current Categories

| Category | Use for | Current examples |
| --- | --- | --- |
| `agents` | Agent behavior, instructions, security, local task tracking, skills authoring, skills sharing, policy generation, and repo-specific agent tooling. | `ref-agents-persona`, `ref-skills-authoring`, `ref-swiftpost-agents-policy`, `tool-maintain-skills` |
| `app` | Whole-app guidance and application-level stack decisions. | `ref-app-web-standalone`, `ref-app-react-next` |
| `db` | Database modeling, relational and non-relational design, normalization, transactions, and database operations guidance. | `ref-db-management`, `ref-db-relational`, `ref-db-normalization`, `ref-db-nosql` |
| `dev` | Generic development workflows that are not language-specific, such as coding defaults, commits, versioning, and package-management policy. | `ref-coding-patterns`, `ref-dev-semantic-versioning`, `ref-git-commits`, `tool-commit` |
| `docs` | Documentation authoring and README structure. | `ref-docs-authoring` |
| `github` | GitHub platform automation and repository services. | `ref-github-actions-ci`, `ref-github-dependabot` |
| `js` | JavaScript, TypeScript, Deno, React, Next.js, userscripts, and browser-script domains. | `ref-js-typescript`, `ref-js-deno`, `ref-js-react` |
| `project` | Project layout, architecture boundaries, feature folders, and repository setup. | `ref-project-setup`, `ref-projects-architecture` |
| `py` | Python-specific typing, CLIs, tests, tooling, and this repo's Python conventions. | `ref-python`, `ref-py-commitizen`, `ref-code-conventions` |
| `supabase` | Supabase platform behavior, CLI workflows, migrations, API use, and Edge Functions. | `ref-supabase` |

## Decision Rules

- Choose the domain of the guidance, not the organization-specific prefix. For example, `ref-swiftpost-agents-policy` is category `agents`, not `swiftpost`.
- Choose the domain of the action, not the `tool-...` prefix. For example, `tool-commit` is category `dev`, while `tool-handle-agents-local-tasks` is category `agents`.
- Prefer existing categories when a skill name already has a clear family prefix, such as `ref-js-*`, `ref-app-*`, `ref-github-*`, or `ref-agents-*`.
- Prefer existing categories when a skill name already has a clear family prefix, such as `ref-db-*`, `ref-js-*`, `ref-app-*`, `ref-github-*`, or `ref-agents-*`.
- Use `dev` for broad development workflows that are not primarily about a language, platform, repository layout, or agent system.
- Use `project` for structure and architecture, even when the guidance affects developer workflows.
- Use `py` or `js` when the core guidance depends on language or runtime-specific behavior.
- Keep a skill to one category. If two categories both feel necessary, first check whether the skill is doing too much.

## New Category Rules

Create a new category only when the current categories would make discovery worse or misleading.

A good new category is:

- short, lowercase, and stable;
- a domain that can plausibly contain multiple skills;
- not an organization name, unless the domain itself is organization-specific and cannot be expressed otherwise;
- not a role label such as `ref`, `tool`, `workflow`, or `shareable`.

Before creating a new category, look for a nearby existing one and decide whether renaming or splitting the skill would be better.

## Current Catalog Mapping

| Skill family | Category |
| --- | --- |
| `ref-agents-*` | `agents` |
| `ref-swiftpost-agents-*` | `agents` |
| `ref-swiftpost-skills-management` | `agents` |
| `ref-shareable-skills`, `ref-skills-authoring` | `agents` |
| `tool-*skills*`, `tool-*agents*`, `tool-adopt-these-skills` | `agents` |
| `ref-app-*` | `app` |
| `ref-db-*` | `db` |
| `ref-coding-patterns`, `ref-dev-*`, `ref-git-commits`, `tool-commit` | `dev` |
| `ref-docs-authoring` | `docs` |
| `ref-github-*` | `github` |
| `ref-js-*` | `js` |
| `ref-project-*`, `ref-projects-*` | `project` |
| `ref-python`, `ref-py-*`, `ref-code-conventions` | `py` |
| `ref-supabase` | `supabase` |

## Validation

- Every skill frontmatter has exactly one `agentic-tools-category` string.
- Category names are short lowercase domain labels.
- Repo-specific skill names still use the domain category.
- `uv run agentic-tools skills list` shows a useful category for each skill.
