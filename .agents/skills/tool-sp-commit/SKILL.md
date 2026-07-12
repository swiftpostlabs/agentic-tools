---
name: tool-sp-commit
description: "Inspect edited files, group them into logical commits, and create focused commits. Use when: the user asks to commit changes, split work into focused commits, or decide how the current diff should be grouped before committing."
argument-hint: "Optional commit goal, grouping constraint, or whether to only propose groups instead of committing"
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
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

## Scope boundaries

This tool groups a working diff into commits and writes their messages. It owns the grouping
decision, nothing further down the git pipeline.

- `ref-sp-dev-git-commits` — the rules this tool applies: title format, body content, when a commit
  needs a long description. Read it for the rules; use this tool to apply them to a real diff.
- `ref-sp-py-commitizen` and `ref-sp-dev-semantic-versioning` — releases, version bumps, and
  changelog generation. A conventional-commit *type* affects a future bump, but choosing the bump is
  not this tool's job.
- Branching, rebasing, pushing, and opening pull requests are out of scope. This tool stops at the
  commit.

## First Step

Read the repo's commit-guidance skill (`ref-sp-dev-git-commits` here, the `requires` dependency) before deciding commit boundaries or writing commit messages.

## Core Workflow

1. Inspect the current changed files and diff.
2. Separate unrelated user changes from the slice you should commit.
3. Group files by one coherent outcome, not by file type or directory alone.
4. Validate each proposed commit group with the narrowest relevant check.
5. Stage only one commit group at a time.
6. Write the message using the `ref-sp-dev-git-commits` rules. When a group came from an automated change, record its provenance in the body (the redacted command that produced it).
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
- When the work came from automation, keep the automated change together and record its provenance in the commit body: include the command that produced it (codemod, link fixer, formatter, generator, or bulk rewrite) so it can be rerun or audited. Redact private details first — replace absolute home paths with a repo-relative path, drop the username, and never include tokens or secrets. See `ref-sp-dev-git-commits` for the exact body format.

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
- For an automated group, confirm the body records the generating command and that it carries no private details (home paths, username, tokens).
- After committing, confirm whether additional groups remain in the working tree.
