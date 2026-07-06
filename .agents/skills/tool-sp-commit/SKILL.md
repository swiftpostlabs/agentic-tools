---
name: tool-sp-commit
description: "Inspect edited files, group them into logical commits, and create focused commits for this repo. Use when: the user asks to commit changes, split work into focused commits, or decide how the current diff should be grouped before committing."
argument-hint: "Optional commit goal, grouping constraint, or whether to only propose groups instead of committing"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "organization"
  shareable-skills.requires: "ref-sp-dev-git-commits"
---

# Commit Changes

## Purpose

Guide the agent through inspecting the current diff, grouping changes into coherent commits, validating each group, and committing them using this repository's commit format.

## When to use this skill

- The user asks to make one or more commits.
- The current diff should be split into focused commits.
- The agent needs help deciding whether changes belong together.
- The user wants the commit work done, not just explained.

## First Step

Read .agents/skills/ref-sp-dev-git-commits/SKILL.md before deciding commit boundaries or writing commit messages.

## Core Workflow

1. Inspect the current changed files and diff.
2. Separate unrelated user changes from the slice you should commit.
3. Group files by one coherent outcome, not by file type or directory alone.
4. Validate each proposed commit group with the narrowest relevant check.
5. Stage only one commit group at a time.
6. Write the message using the `ref-sp-dev-git-commits` rules.
7. Create the commit non-interactively, then repeat for the next group if needed.

## Defaults

- Default to one commit only when all changed files support the same outcome.
- Treat skill-file updates as docs by default. If a commit only changes commit-guidance skills such as `ref-sp-dev-git-commits` or `tool-sp-commit`, prefer a title like `docs(commit-skills): Short description of the commit`.
- Keep tests, docs, and generated outputs in the same commit as the source change they explain or validate when they are part of the same logical unit.
- Keep source-of-truth files and generated files together when one deterministically produces the other.
- Split cleanup, renames, or refactors away from behavior changes unless they are inseparable.
- If commit grouping is ambiguous, ask before staging rather than guessing.

## Grouping Rules

- Group by purpose: one feature, one fix, one docs update, one chore.
- Do not mix unrelated pre-existing user work into your commit just because it is already modified.
- Do not create a separate commit for trivial support-file changes that only make sense with the primary code change.
- Do create a separate commit when a bulk mechanical rewrite would obscure a behavior change.
- When the work came from automation, keep the automated change together and record the full command in the commit body.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Inspect status and diff | Review the current change set before staging anything. | Commit grouping is unreliable if you guess from filenames alone. | Always before proposing or making commits. | The changed surfaces and likely group boundaries are understood. |
| Propose commit groups | Decide which files belong in each commit. | Focused commits are easier to review and revert. | When the diff contains more than one logical change. | Each group has one coherent purpose. |
| Validate a group | Run the narrowest relevant check for the files in that group. | A focused commit should be valid on its own when a focused checker exists. | After defining a group and before committing it. | The group has passed a scoped validation step or has a justified fallback check. |
| Stage one group | Add only the files for the current logical commit. | This prevents unrelated changes from bleeding into the commit. | After the group is validated. | The index matches exactly one planned commit. |
| Commit the group | Create the commit using the repo's message rules. | The history should be focused and readable. | After staging and message preparation are complete. | One logical commit is recorded cleanly. |

## Gotchas

- Do not amend existing commits unless the user explicitly asks.
- Do not use interactive git flows when a non-interactive command will do.
- If there is no narrow validation command for a group, say so and use the next best focused check.
- If the working tree contains unrelated user changes, leave them out rather than trying to tidy them up.

## Validation

- Check that each commit group is internally coherent before staging it.
- Run a focused validation step for each group when one exists.
- Check the staged diff before committing so the message matches the staged content.
- After committing, confirm whether additional groups remain in the working tree.
