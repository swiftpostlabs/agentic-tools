---
name: ref-sp-agents-local-tasks
description: "The format of the gitignored .agents/tasks/ workspace: TODO.md for quick items, dated task folders moving through 10-new, 20-open, and 90-closed with status frontmatter, task briefs, and HANDOFF.md. Use when creating, updating, moving, or handing off a local task."
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "tasks"
---

# Agents Local Tasks

How the local, gitignored `.agents/tasks/` workspace is laid out. Quick items go in `TODO.md`;
anything substantial gets its own dated folder that moves through lifecycle subfolders. Working the
backlog (picking, triaging, closing out) is `tool-sp-handle-agents-local-tasks`; reflecting after a
task is `ref-sp-agents-retro`. Scratch files go in `.agents/playground/`. These are the defaults
unless the repo documents a different convention.

## Layout

| Path | Holds |
| --- | --- |
| `.agents/tasks/TODO.md` | Quick notes and small tasks with no lifecycle. |
| `.agents/tasks/10-new/<YYYY-MM-DD>-<name>/` | Tracked task not started (`new`, `ready`, `blocked`). |
| `.agents/tasks/20-open/<YYYY-MM-DD>-<name>/` | Task being worked (`in-progress`, `in-review`, `blocked`). |
| `.agents/tasks/90-closed/<YYYY-MM-DD>-<name>/` | Finished task (`done`, `cancelled`). |
| `<task>/README.md` | The brief, with lifecycle frontmatter. Every tracked task has one. |
| `<task>/HANDOFF.md` | Optional single resume point (see below). |
| `<task>/notes.md`, `plan.md`, `validation.md`, `pr-description.md` | Scratch for this task. |
| `.agents/playground/` | Temporary helper scripts and generated files. Create them with edit tools, not shell heredocs or redirection. |

- Folder names are `<YYYY-MM-DD>-<kebab-case-name>`, dated the day the task was created
  (`10-new/2026-07-25-add-button-for-language/`). Find tasks by topic with a glob
  (`10-new/*wordpress*`).
- The numeric prefixes only make `ls` sort in lifecycle order; nothing parses them
  (`ref-sp-dev-projects-architecture` explains the convention).

## Lifecycle

**The folder and `status` always agree.** Move the whole folder and update `status` in the same
step; never one without the other.

| Folder | Valid `status` |
| --- | --- |
| `10-new/` | `new` (not yet refined), `ready` (refined), `blocked` |
| `20-open/` | `in-progress`, `in-review`, `blocked` |
| `90-closed/` | `done`, `cancelled` |

`blocked` stays where the task was: `10-new/` if never started, `20-open/` if in flight. A blocked
task never goes to `90-closed/`.

## README frontmatter

```markdown
---
status: done
created: 2026-07-15T21:53:15+02:00
updated: 2026-07-15T22:04:32+02:00
outcome: "Both fixes landed, but the auto-merge path was never re-verified end to end because CI
  was red on an unrelated error. Closed on its fixes, not on full verification."
---
```

- `status`: as above; multi-word values are hyphenated.
- `created`: `date -Iseconds`; its date part matches the folder name.
- `updated`: same format, bumped in the same edit that changes the README or moves the folder.
- `outcome`: required in `90-closed/`. One or two sentences of prose, including what was *not*
  done and why. `done` already says it finished; the qualification is the part worth reading.
  Longer reasoning goes in the body.

Nothing validates these files, and `updated` drifts most. When it looks wrong, compare the files
inside the folder: a folder's own `mtime` changes only when children are added or removed.

## README body

Keep the brief current as the task changes: objective, status, blockers, assumptions, and next
steps, bumping `updated` in the same edit.

Default to **describing the problem, not prescribing the fix.** A task is often worked weeks later
in a changed repo; a prescribed implementation hands over a conclusion without its evidence.

- **Facts:** what was verified, with sources.
- **Decided:** only what was actually settled, marked as settled.
- **Open:** questions nobody has answered.
- **Options:** candidate approaches, notes, and leads, under a heading that says so.

Leave out implementation detail invented while filing: step sequences, file layouts, function or
flag names nothing has validated. If the user asks for a prescriptive plan, say so in the brief.

When a task means processing a large batch of material (reading sources, transcribing, reviewing
many files), propose the depth per item up front with a rough cost for each option, for example
full notes against an outline of headings, and record the choice as decided. Finding out halfway
that the depth is too costly wastes the work done so far.

## Task handoff

A long task, or one another agent reads while it runs, may carry a `HANDOFF.md`: a short resume
point saying where things are, what was decided, and where to start, pointing into `README.md`
for detail rather than repeating it.

- Keep **one** handoff per task. When the picture changes, edit or replace it; never add a second
  beside it, because two handoffs that disagree are worse than none.
- Update it in the **same step** as the facts it records change (a date, the file to start from,
  what is done), not at the end of the session. A stale handoff is read as current.
- When several agents share a task, one owns the handoff; the others report corrections to the
  owner or the user instead of editing it in parallel.
- On close, mark the handoff closed. Moving the folder to `90-closed/` changes its path, so search
  for references to the old path (skills, other tasks) and update them in the same step.

## TODO.md

Open items are plain bullets, `- [] item`, or `- [ ] item`; done items are `- [x] item` (or `[X]`).
Anything substantial becomes a task folder instead. A script that finds the next open item must
accept all three open forms: `./assets/next-todo.mts` is a starting point to copy into
`.agents/playground/`.

## Gotchas

- The workspace is gitignored: collaborators and fresh clones never see it. Promote durable
  guidance into a skill, `AGENTS.md`, or code before relying on it.
- Local notes drift from the code after scope changes. After a big shift, check the folder, status,
  and brief still describe the work being done.
- A broken premise in a task gets corrected with the user, not silently worked around.
- Keep notes scoped to their task; don't overwrite other task folders when focus changes.
- On close, delete or refresh scratch files that no longer reflect the work, so the folder doesn't
  become a graveyard.
