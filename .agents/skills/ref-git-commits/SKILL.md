---
name: ref-git-commits
description: "Reference guidance for grouping changes into focused commits and writing commit messages in this repo. Use when: deciding how to split changes into commits, writing a commit title or body, deciding whether a commit needs a long description, or documenting an automated command for reproducibility."
---

# Git Commits

## Purpose

Define how this repository wants changes grouped into focused commits and how commit messages should be written.

## When to use this skill

- The user asks how changes should be committed.
- You need to write a commit title or body.
- You need to decide whether one change set should become one commit or several.
- The work came from an automated command and the commit message needs reproducibility details.

## Core Rules

- Keep each commit focused on one logical change.
- Validate the relevant slice before committing whenever a focused check exists.
- Use non-interactive commit flows.
- Keep unrelated user changes out of your commit.

## Commit Title Format

Use this default title format:

```text
type(scope): Short description of the commit
```

Defaults:

- Use one of `feat`, `fix`, `docs`, or `chore` as the `type`.
- Treat skill files as documentation. When a commit only changes skill guidance or other docs-only content, prefer `docs(...)` over `feat(...)` or `chore(...)`.
- Always include a short scope that names the main surface, such as `skills`, `policy`, `scripts`, `docs`, or `commits`.
- For changes to commit-related skill docs such as `ref-git-commits` or `tool-commit`, prefer the scope `commit-skills`, for example `docs(commit-skills): Short description of the commit`.
- Keep the short description concise, specific, and easy to scan in `git log`.
- Prefer one clear outcome over a list of implementation details.

## Commit Body Rules

- Add a long description when the commit is not trivial.
- Use the body to explain the key details and why the change exists, not to restate the title.
- Separate the title and body with a blank line.
- For work created from an automated command such as a codemod, include the full command in the body for reproducibility.
- Very mundane commits such as a straightforward lint fix do not need a long description.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Choose commit boundaries | Decide which changed files belong together. | Focused commits are easier to review, revert, and explain. | Before staging or writing the message. | Each commit has one coherent purpose. |
| Write the title | Summarize the change in `type(scope): Short description of the commit` form. | The title is the main line readers see in history and reviews. | For every commit. | The title makes the commit easy to categorize and skim. |
| Add a body | Explain the key details and why. | Non-trivial commits need context that the title cannot carry alone. | When the commit changes behavior, introduces structure, or would be unclear from the title alone. | The commit explains the important reasoning without becoming a changelog dump. |
| Record an automated command | Include the full command that produced the change. | Reproducibility matters when the work came from automation. | When a codemod, generator, migration command, or bulk rewrite produced the changes. | Another engineer can rerun or audit the automation later. |

## Examples

```text
docs(skills): Add tool-create-skill guidance

- add a guided intake flow for creating new skills
- route naming decisions through ref-skills-authoring
- keep the initial scaffold narrow to fit progressive disclosure

Why:
- reduce repeated manual setup when adding new skills
```

```text
docs(commit-skills): Clarify commit message defaults for skill docs
```

```text
chore(commits): Record codemod-generated import cleanup

- normalize import ordering across the new ref-skill package names

Why:
- keep the rename follow-up deterministic and reproducible

Command:
- uv run python -m scripts.some_codemod --rewrite-imports
```

```text
chore(formatting): Fix lint formatting
```

## Validation

- Confirm the title fits the default `type(scope): Short description of the commit` format.
- Confirm the body exists when the commit would otherwise be unclear.
- Confirm automated changes include the full generating command.
- Confirm the message matches the actual staged diff, not the whole working tree.
