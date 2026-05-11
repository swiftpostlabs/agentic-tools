---
name: ref-agent-local-tasks
description: "Reference guidance for using `.agents/tasks/` as a gitignored local workspace for task backlogs, temporary working files, and per-task notes. Use when: reading or updating `.agents/tasks/TODO.md`, maintaining `.agents/tasks/<task-name>/`, or checking whether local agent task notes still match the active work."
metadata:
  shareable-skills.visibility: "shareable"
---

# Agent Local Tasks

## Purpose

Define how this repo uses `.agents/tasks/` as a gitignored local workspace for backlog tracking, working notes, temporary delivery artifacts, and per-task execution context.

## When to use this skill

- Reading or updating `.agents/tasks/TODO.md`.
- Creating or maintaining `.agents/tasks/<task-name>/` for a multi-step task.
- Storing temporary working files such as `pr-description.md`, `notes.md`, `validation.md`, or `plan.md`.
- Reviewing whether local task files still match the active work.

## Core Workflow

1. Check `.agents/tasks/TODO.md` when the work belongs to a larger local backlog or set of follow-up items.
2. Use one kebab-case folder per active task under `.agents/tasks/<task-name>/`.
3. Keep one anchor file for the task when the work is complex enough to need a running brief.
4. Update progress, blockers, and next steps as the task changes.
5. Remove or refresh stale local files once the task is done or no longer relevant.

## Directory Model

| Path | Role |
| --- | --- |
| `.agents/tasks/TODO.md` | Local top-level backlog for follow-up work in this repo. |
| `.agents/tasks/<task-name>/` | Local workspace for one task or PR-sized slice. |
| `.agents/tasks/<task-name>/README.md` | Preferred living brief when the task needs ongoing status, plan, and context. |
| `.agents/tasks/<task-name>/pr-description.md` | Temporary draft content for a PR or summary. |
| `.agents/tasks/<task-name>/notes.md`, `validation.md`, `plan.md` | Scratch notes, validation results, or a focused local plan. |

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Update `.agents/tasks/TODO.md` | Refresh the local backlog across active work. | The top-level TODO should reflect the current local priority list. | When new follow-up work appears, priorities change, or an item is completed. | The top-level backlog matches the real state of the work. |
| Create `.agents/tasks/<task-name>/` | Open a local workspace for one task or PR-sized slice. | Keeping one folder per task prevents unrelated notes from mixing together. | When a task is large enough to need its own running notes or temporary artifacts. | The task has a clearly named local workspace. |
| Add or update an anchor file such as `README.md` or `plan.md` | Keep a running summary of objective, status, blockers, and next steps. | Multi-step work becomes hard to recover if the local context is scattered across chat only. | When the task has enough moving parts that a single summary file will reduce drift. | Another pass can resume the task from the local file without reconstructing context from scratch. |
| Store a temporary artifact such as `pr-description.md` or `validation.md` | Save work product that is useful during the task but does not belong in the committed repo. | Temporary drafts and scratch outputs should stay near the task they support. | When you need a local draft, notes, or validation log for the active task. | The artifact is easy to find and scoped to the right task folder. |
| Prune stale local files | Remove or update local tracking that no longer reflects real work. | Gitignored local notes become misleading if they outlive the task or drift from the code. | After scope changes, task completion, or abandonment. | `.agents/tasks/` stays useful instead of becoming a graveyard of stale notes. |

## Decision Rules

- Treat `.agents/tasks/` as local working state, not as committed product documentation.
- Keep `.agents/tasks/` gitignored and promote durable guidance elsewhere instead of relying on local notes to survive cloning or review.
- Prefer task- or PR-style, kebab-case folder names such as `.agents/tasks/add-button-for-language/`.
- Do not require every task folder to have a `README.md`. Use one only when the work needs a durable running brief.
- If the folder only needs a narrow temporary artifact, store that file directly without inventing extra structure.
- If a local note becomes durable repo guidance, promote it into a committed doc, skill, or code comment instead of leaving it only under `.agents/tasks/`.
- Do not overwrite unrelated task folders when the active task changes; keep local notes scoped to the task they belong to.

## Gotchas

- `.agents/tasks/` is normally gitignored, so other collaborators and future clones will not see it unless the content is promoted elsewhere.
- Local tracking can drift from the code if it is not updated after scope changes.
- A temporary draft under `.agents/tasks/` is not a substitute for updating the actual repo source of truth when the information becomes permanent.

## Validation

- After a major shift in scope, confirm that `.agents/tasks/TODO.md` and the active task folder still describe the same task you are actually performing.
- Before concluding a task, check whether any durable guidance discovered in local notes should be moved into committed repo files.