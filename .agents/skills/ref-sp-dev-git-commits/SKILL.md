---
name: ref-sp-dev-git-commits
description: "Rules for grouping a diff into focused commits and writing type(scope) commit messages, including when a body is needed and recording the command behind automated changes. Use when committing, splitting a diff, or writing a commit message."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "git"
---

# Git Commits

How to group changes into commits and write their messages. To actually split and commit a working
diff, use `tool-sp-commit`, which applies these rules. Release bumps from commit types belong to
`ref-sp-py-commitizen` and `ref-sp-dev-semantic-versioning`.

## Grouping

- One logical change per commit, so each can be reviewed and reverted alone.
- Run the focused check for the touched slice before committing.
- Leave the user's unrelated changes unstaged.
- Commit non-interactively.

## Title

```text
type(scope): Short description of the commit
```

- `type` is one of `feat`, `fix`, `docs`, `chore`. Skill files count as docs, so a skill-only
  change is `docs(...)`.
- `scope` names the main surface: `skills`, `policy`, `scripts`, `docs`, `commits`. Changes to the
  commit skills themselves use `commit-skills`.
- Describe the outcome, not the implementation steps.

## Body

Add a body unless the commit is trivial, such as a plain lint fix. Separate it from the title with
a blank line and explain what matters and why, without restating the title.

When a tool produced the change (codemod, link fixer, formatter, generator), record the command so
someone can rerun or audit it. Redact it first: repo-relative paths instead of `/home/<user>/...`,
no usernames, no tokens or machine-specific values.

## Examples

```text
docs(skills): Add tool-sp-create-skill guidance

- add a guided intake flow for creating new skills
- route naming decisions through ref-sp-agents-skills-authoring

Why:
- reduce repeated manual setup when adding new skills
```

```text
chore(commits): Record codemod-generated import cleanup

- normalize import ordering across the new ref-skill package names

Command:
- uv run python -m scripts.some_codemod --rewrite-imports ./src
```

```text
chore(formatting): Fix lint formatting
```

## Before committing

- The message describes the staged diff, not the whole working tree.
- Automated changes carry their redacted command.
