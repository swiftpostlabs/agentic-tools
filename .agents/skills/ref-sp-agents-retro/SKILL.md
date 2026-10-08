---
name: ref-sp-agents-retro
description: "Writing, naming, and triaging short task retrospectives in the gitignored .agents/retro/ folder, and promoting lasting lessons into skills. Use when finishing a substantial task, reading past retros before similar work, or triaging .agents/retro/10-new/."
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "retro,reflection"
---

# Agents Retro

A retro is a short note written after a substantial task: what went well, what went wrong and how
each problem was solved or worked around, what was learned about the repo or tools, and hypotheses
for next time. It lives in `.agents/retro/`, which is gitignored like `.agents/tasks/` (active work,
`ref-sp-agents-local-tasks`) and `.agents/playground/` (scratch). That workspace set is the default
unless the repo documents a different convention. Turning a lesson into a skill is `ref-sp-agents-skills-authoring`. The
user's cross-session agent memory is a separate thing: don't write retros there.

## Descriptive, not prescriptive

A retro is evidence for a future agent to weigh, not a rule to follow.

- Describe the episode: "the type-check failed because Node 14 shadowed nvm", not "always check
  the Node version".
- State improvements as hypotheses: "a lighter path might be Y", not "do Y".
- One task is one data point; say how sure you are.
- Anchor every observation to a concrete command, file, decision, or fix; drop vague "do better".
- When an observation really is a durable, general rule, **promote** it into a task, the owning
  skill, or the repo's instructions, and note in the retro where it went. Expect this often:
  retros are where lessons get noticed, and "does this belong in a skill?" is the default question
  at triage.

## When to write one

Write one after feature work, broad refactors, multi-file skill or instruction changes, or anything
with real decisions, friction, or surprises, including partial and abandoned tasks, which are often
the most useful. Skip trivial, uneventful chores. Before similar work, read relevant retros in both
folders to calibrate, not to obey.

## Lifecycle

| Folder | Meaning | `status` |
| --- | --- | --- |
| `.agents/retro/10-new/` | Captured, not yet triaged | `new` |
| `.agents/retro/90-closed/` | Triaged | `promoted` or `dismissed` |

- Name entries `<YYYY-MM-DD-task-slug>.md`, so they sort by date and grep by topic.
- Triage once: promote the durable observations (`promoted`) or let it go as episode-specific
  (`dismissed`). Either way move it to `90-closed/` **and** set `status` in the same step.
- There is no `20-open/`: a retro is captured and triaged, never worked over time. The numbers match
  `.agents/tasks/` (10 intake, 90 terminal); `ref-sp-dev-projects-architecture` explains the
  prefix convention.
- A growing `10-new/` means triage is overdue, not that more retros are needed. Prune `90-closed/`
  entries that promoted guidance has superseded or that no longer match the repo.

## Entry template

Keep it short and drop any section with nothing real in it.

```markdown
---
task: add-retro-skill
status: new
created: 2026-07-24T18:22:41+02:00
updated: 2026-07-24T18:22:41+02:00
outcome: "Done, but the folder-numbering question was reopened mid-task and forced a rewrite of
  the directory tables, so the skill shipped a day later than it needed to."
---

# Retro: add the retro skill

## Context
One or two sentences on the task and what shaped how it went.

## What went well
- A concrete thing that worked, tied to the command, file, or decision.

## Problems and how they were handled
- What went wrong, why, and how it was fixed or worked around, or that it is still open and what
  would settle it. Not "be more careful": "assumed X was gitignored, it wasn't, which cost a
  re-run; fixed by adding it to .gitignore first."

## What I learned
- Non-obvious facts about the repo, tools, or environment. Mark durable ones
  **promote →** `<owning skill or instruction>`.

## Improvement hypotheses
- A candidate better approach, as a hypothesis.

## Outcome
- How the task ended (done, partial, abandoned) and why.
```

Frontmatter:

- `task`: kebab-case slug matching the file name.
- `created`, `updated`: `date -Iseconds`; the date part of `created` matches the file name, and
  `updated` is bumped on every edit or triage.
- `status`: the retro's lifecycle, matching its folder.
- `outcome`: how the *task* ended, as one or two sentences of prose. An enum would lose the reason,
  which is the part worth keeping. Longer reasoning goes in the body's Outcome section.

`status` and `outcome` answer different questions: a retro about a task that went badly can be
`dismissed`, and one about a smooth task can be `promoted`.

## Gotchas

- Retros are gitignored: they don't survive a fresh clone or reach collaborators. Anything that
  must persist has to be promoted.
- An "always X" line in a retro carries a rule's authority without a skill's review, and loses the
  episode that would let someone re-evaluate it. Promote it instead.
- The same observation in several retros is overdue promotion, not a reason for another retro.
- A retro isn't the task's closeout: the closeout says what was done; the retro says how it went.
- If writing it costs more than it will save a future agent, keep it to a few lines or skip it.
