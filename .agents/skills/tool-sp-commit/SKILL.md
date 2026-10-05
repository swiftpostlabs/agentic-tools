---
name: tool-sp-commit
description: "Inspect the working diff, group it into focused commits, validate each group, and commit. Use when the user asks to commit changes or to split the current diff into separate commits."
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

Turns the working diff into focused commits. The message rules live in `ref-sp-dev-git-commits`;
read it first. Release bumps and changelogs belong to `ref-sp-py-commitizen` and
`ref-sp-dev-semantic-versioning`. This tool stops at the commit: no branching, rebasing, pushing,
or pull requests.

## Steps

1. Read `git status` and the diff. Don't guess groups from file names.
2. Set aside the user's unrelated changes; they stay unstaged.
3. Group by outcome: one feature, fix, docs update, or chore per commit. Ask before staging when
   the grouping is ambiguous.
4. Run the narrowest check that covers each group. If none exists, say so and use the next best
   focused check.
5. Stage one group, check the staged diff, then commit non-interactively with a message that
   matches what is staged.
6. Repeat until no planned groups remain.

## Grouping

- Keep tests, docs, and generated files with the source change they belong to; keep a generated
  file with its source of truth.
- Separate cleanups, renames, and refactors from behaviour changes unless they are inseparable,
  and give a bulk mechanical rewrite its own commit so it doesn't hide a behaviour change.
- Keep an automated change (codemod, formatter, generator) together and record its redacted
  command in the body, as `ref-sp-dev-git-commits` describes.
- Don't split off trivial support changes that only make sense with the main change.

## Gotchas

- Never amend an existing commit unless the user asks.
- Skill-only changes are `docs(...)`; changes to the commit skills use `docs(commit-skills): ...`.

## Before finishing

- Each commit's message matches its staged diff.
- Automated groups carry their command, with no home paths, usernames, or tokens.
- Say whether changes remain in the working tree.
