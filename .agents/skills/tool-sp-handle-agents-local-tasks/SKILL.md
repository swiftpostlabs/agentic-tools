---
name: tool-sp-handle-agents-local-tasks
description: "Read the local `.agents/tasks/` workspace — the `TODO.md` notes list and the tracked task folders under `new/`, `open/`, `closed/` — choose the next actionable item, and work it through with code changes, validation, folder moves, and status updates. Use when: the user asks to check `.agents/tasks/TODO.md`, continue remaining local tasks, or process the repo's local agent-task backlog."
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

## Purpose

Guide the agent through reading the repo's local task workspace under `.agents/tasks/` — the lightweight `TODO.md` notes list and the tracked task folders in `new/`, `open/`, and `closed/` — picking the next actionable item, executing it with normal coding discipline, and keeping the folder location, `status` frontmatter, and notes in sync with reality.

## When to use this skill

- The user asks to check `.agents/tasks/TODO.md`.
- The user asks to continue remaining local tasks.
- The user asks to work through the repo's local backlog instead of one already-scoped code change.
- The agent needs a repeatable workflow for reconciling `.agents/tasks/` with the current repository state.

## First Step

Read the repo's local-tasks skill (`ref-sp-agents-local-tasks` here, the `requires` dependency), then inspect `.agents/tasks/TODO.md` and the tracked task folders in `.agents/tasks/new/` and `.agents/tasks/open/` before planning or coding.

## Core Workflow

1. Read `.agents/tasks/TODO.md` for quick items, and list the tracked task folders in `new/` and `open/` (their `README.md` `status` shows where each stands).
2. If the user mentioned a specific task, repo area, or local task folder, inspect that slice first.
3. Pick the next actionable item — an open task in `open/`, then a `ready` task in `new/`, then quick `TODO.md` items — skipping anything `blocked`.
4. Triage it: execute directly if it is simple and well-defined, or clarify and refine first if it is broad, ambiguous, or based on shaky assumptions.
5. When a substantial item warrants tracking, create `.agents/tasks/new/<task-name>/README.md` with `status` frontmatter and the clarified goal, assumptions, and subtasks before execution.
6. When work begins on a tracked task, move its folder from `new/` to `open/` and set `status` to `in progress`.
7. Execute one task slice at a time using the normal local-anchor, edit, and validation workflow.
8. When a tracked task finishes, move its folder to `closed/` and set `status` to `done` (or `cancelled`); update its `README.md` and `TODO.md` when items are completed, superseded, clarified, or blocked.
9. For complex items, prepare a user-facing closeout that covers what was done, what was not done, how and why important decisions were made, validation, and remaining caveats.
10. Re-check `TODO.md` and the `new/`/`open/` folders after each completed slice so newly added items or scope changes are not missed.
11. Stop only when no actionable items remain or a concrete blocker requires user input.

## Defaults

- Default to the next actionable item — an `in progress` task in `open/`, then a `ready` task in `new/`, then quick `TODO.md` items — unless the user explicitly reprioritizes the work.
- Skip `blocked` tasks unless the blocker is now resolvable; surface the blocker rather than forcing the task.
- Default to execution, not just triage, unless the user asked only for planning or review.
- Do not rush every item straight into implementation; simple items can be acted on directly, but complex or underdefined ones should be clarified first.
- Treat feature development, broad refactors, multi-file skill or workflow updates, cross-repo updates, and tasks with meaningful tradeoffs as complex enough to deserve a tracked folder and a real closeout answer.
- Treat mundane chores such as creating a branch, running a simple command, or applying a narrow typo fix as simple unless they expose broader decisions or blockers.
- When a task points to a file, symbol, or neighboring repo, use that as the first anchor before broader exploration.
- When a task remains too broad after the first read, switch into refinement mode with the user and record the task breakdown in `.agents/tasks/new/<task-name>/README.md`, keeping its `status: new` until it is `ready`.
- Keep each task's folder location and `status` frontmatter synchronized with real progress as part of the task, not as an afterthought.
- Re-check `TODO.md` and the `new/`/`open/` folders before concluding the overall session.

## Closeout Answers

- For a complex completed item, explain what changed, what did not change, how the work was approached, why notable decisions were made, which validations ran, and any remaining risks or follow-up work.
- For a complex blocked item, explain the blocker, what was already checked, what remains unknown, and what user decision or external input is needed.
- For a simple item, keep the answer short. Do not manufacture a long retrospective when the task had no meaningful tradeoffs.
- If several items were handled in one session, group the closeout by task so the user can see which are complete and which are still pending.

## Gotchas

- Do not treat stale local notes as more authoritative than the code, tests, or current repo state.
- Do not silently skip actionable items just because one slice is inconvenient; either handle them or surface the blocker.
- Do not delete or rewrite unrelated local task folders while working on the current item.
- Keep the subfolder and `status` in agreement at all times (see the core invariant in `ref-sp-agents-local-tasks`): `new/` → `new`/`ready`/`blocked`, `open/` → `in progress`/`in review`/`blocked`, `closed/` → `done`/`cancelled`. Moving a folder and updating its `status` is a single step — never do one without the other, and never leave an invalid pairing such as `closed/` with `status: in progress`.
- Do not move a task to `closed/` just because it is `blocked`; a blocked task stays in `new/` or `open/` with `status: blocked`.
- If a task is ambiguous, resolve the ambiguity from nearby code or notes when possible; if the missing detail still controls the outcome, ask the user before implementing.
- If a task contains a wrong assumption, correct the premise explicitly with the user instead of executing the wrong task cleanly.

## Validation

- Confirm the executed slice has a focused validation step before marking the task done.
- Confirm any finished tracked task was moved to `closed/` with `status: done` or `cancelled`, and that in-flight tasks sit in `open/` with a matching `status`.
- Confirm complex items have an appropriate closeout answer before ending the turn.
- Confirm `.agents/tasks/TODO.md` and the `new/`/`open/`/`closed/` folders reflect the current state before ending the session.
- Confirm any durable guidance discovered during local task execution has been promoted out of `.agents/tasks/` when appropriate.
