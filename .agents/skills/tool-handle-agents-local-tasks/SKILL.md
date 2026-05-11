---
name: tool-handle-agents-local-tasks
description: "Read the local `.agents/tasks/` backlog, choose the next actionable item, and work it through with code changes, validation, and task-file updates. Use when: the user asks to check `.agents/tasks/TODO.md`, continue remaining local tasks, or process the repo's local agent-task backlog."
metadata:
  shareable-skills.visibility: "shareable"
  shareable-skills.requires: "ref-agent-local-tasks"
argument-hint: "Optional task filter, whether to only triage or to execute tasks, and any stopping condition"
---

# Handle Agents Local Tasks

## Purpose

Guide the agent through reading the repo's local task backlog under `.agents/tasks/`, picking the next actionable item, executing it with normal coding discipline, and keeping the local task files in sync with reality.

## When to use this skill

- The user asks to check `.agents/tasks/TODO.md`.
- The user asks to continue remaining local tasks.
- The user asks to work through the repo's local backlog instead of one already-scoped code change.
- The agent needs a repeatable workflow for reconciling `.agents/tasks/` with the current repository state.

## First Step

Read `.agents/skills/ref-agent-local-tasks/SKILL.md`, then inspect `.agents/tasks/TODO.md` before planning or coding.

## Core Workflow

1. Read `.agents/tasks/TODO.md` and identify the unchecked or still-active items.
2. If the user mentioned a specific task, repo area, or local task folder, inspect that slice first.
3. Turn the active items into a short ordered plan, preserving the existing TODO priority unless the repo state clearly contradicts it.
4. Execute one task slice at a time using the normal local-anchor, edit, and validation workflow.
5. Update `.agents/tasks/TODO.md` and any active `.agents/tasks/<task-name>/` notes when an item is completed, superseded, or blocked.
6. Re-read `.agents/tasks/TODO.md` after each completed slice so newly added items or scope changes are not missed.
7. Stop only when no actionable items remain or a concrete blocker requires user input.

## Defaults

- Default to the first unchecked item in `.agents/tasks/TODO.md` unless the user explicitly reprioritizes the work.
- Default to execution, not just triage, unless the user asked only for planning or review.
- When a TODO item points to a file, symbol, or neighboring repo, use that as the first anchor before broader exploration.
- Keep local task files synchronized with real progress as part of the task, not as an afterthought.
- Re-read `.agents/tasks/TODO.md` before concluding the overall session.

## Gotchas

- Do not treat stale local notes as more authoritative than the code, tests, or current repo state.
- Do not silently skip unchecked TODO items just because one slice is inconvenient; either handle them or surface the blocker.
- Do not delete or rewrite unrelated local task folders while working on the current item.
- If a TODO item is ambiguous, resolve the ambiguity from nearby code or notes when possible before asking the user.

## Validation

- Confirm the executed slice has a focused validation step before marking the local task item done.
- Confirm `.agents/tasks/TODO.md` reflects the current state before ending the session.
- Confirm any durable guidance discovered during local task execution has been promoted out of `.agents/tasks/` when appropriate.