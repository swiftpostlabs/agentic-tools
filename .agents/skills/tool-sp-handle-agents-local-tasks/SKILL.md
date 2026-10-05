---
name: tool-sp-handle-agents-local-tasks
description: "Work through the local .agents/tasks backlog: pick the next actionable item, do it, and keep folders, status, and notes in sync. Use when asked to check .agents/tasks/TODO.md or continue the local tasks."
argument-hint: "Optional task filter, whether to only triage or to execute tasks, and any stopping condition"
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.requires: "ref-sp-agents-local-tasks"
---

# Handle Agents Local Tasks

Works the gitignored `.agents/tasks/` backlog item by item. The format (lifecycle folders, `status`
values, `TODO.md` syntax) is in `ref-sp-agents-local-tasks`; read it first. The work itself follows
whichever skill owns that area, and commits go through `tool-sp-commit`.

## Steps

1. Read `TODO.md` and the task folders in `10-new/` and `20-open/`. If the user named a task or
   area, start there.
2. Pick the next item: an open task in `20-open/`, then a `ready` task in `10-new/`, then quick
   `TODO.md` items. Skip `blocked` ones unless the blocker can now be resolved.
3. Triage. Do simple, well-defined items directly. For broad or ambiguous ones, clarify with the
   user and write the breakdown into a task folder (`10-new/<YYYY-MM-DD>-<name>/README.md`,
   `status: new` until it is `ready`).
4. Starting a tracked task: move it to `20-open/`, set `status: in-progress`, bump `updated`.
5. Do one slice at a time: anchor on the file or symbol the task names, edit, validate.
6. Finishing: move it to `90-closed/`, set `status: done` or `cancelled`, write the prose
   `outcome` including what was left undone, and update `TODO.md`.
7. Re-read the backlog after each slice. Stop when nothing actionable remains or a blocker needs
   the user.

Track a task in a folder when it is a feature, a broad refactor, a multi-file skill change, a
cross-repo change, or has real trade-offs. Branches, one-off commands, and typo fixes are simple.

## Closing out

- Complex item done: what changed and what didn't, how and why key decisions were made, which
  checks ran, what risks remain.
- Complex item blocked: the blocker, what was checked, what is unknown, what input is needed.
- Simple item: one or two lines.
- Several items: group by task so done and pending are obvious.

## Gotchas

- The code and tests outrank stale task notes.
- Folder and `status` move together, always (`10-new/`: new, ready, blocked; `20-open/`:
  in-progress, in-review, blocked; `90-closed/`: done, cancelled). A blocked task never goes to
  `90-closed/`.
- If a task rests on a wrong assumption, correct the premise with the user instead of executing it.
- Leave other task folders alone.

## Before finishing

- Every task touched has `updated` bumped and a folder matching its `status`.
- Durable lessons found during the work are promoted out of `.agents/tasks/` into a skill or
  `AGENTS.md`.
