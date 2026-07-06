---
name: tool-sp-handle-agents-local-tasks
description: "Read the local `.agents/tasks/` backlog, choose the next actionable item, and work it through with code changes, validation, and task-file updates. Use when: the user asks to check `.agents/tasks/TODO.md`, continue remaining local tasks, or process the repo's local agent-task backlog."
argument-hint: "Optional task filter, whether to only triage or to execute tasks, and any stopping condition"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "organization"
  shareable-skills.requires: "ref-sp-agents-local-tasks"
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

Read `.agents/skills/ref-sp-agents-local-tasks/SKILL.md`, then inspect `.agents/tasks/TODO.md` before planning or coding.

## Core Workflow

1. Read `.agents/tasks/TODO.md` and identify the unchecked or still-active items.
2. If the user mentioned a specific task, repo area, or local task folder, inspect that slice first.
3. Triage the first active item: execute it directly if it is simple and well-defined, or clarify and refine it first if it is broad, ambiguous, or based on shaky assumptions.
4. When refinement is needed, create or update `.agents/tasks/<task-name>/README.md` with the clarified goal, assumptions, and subtasks before execution.
5. Turn the active items into a short ordered plan, preserving the existing TODO priority unless the repo state clearly contradicts it.
6. Execute one task slice at a time using the normal local-anchor, edit, and validation workflow.
7. Update `.agents/tasks/TODO.md` and any active `.agents/tasks/<task-name>/` notes when an item is completed, superseded, clarified, or blocked.
8. For complex items, prepare a user-facing closeout that covers what was done, what was not done, how and why important decisions were made, validation, and remaining caveats.
9. Re-read `.agents/tasks/TODO.md` after each completed slice so newly added items or scope changes are not missed.
10. Stop only when no actionable items remain or a concrete blocker requires user input.

## Defaults

- Default to the first unchecked item in `.agents/tasks/TODO.md` unless the user explicitly reprioritizes the work.
- Default to execution, not just triage, unless the user asked only for planning or review.
- Do not rush every TODO item straight into implementation; simple items can be acted on directly, but complex or underdefined ones should be clarified first.
- Treat feature development, broad refactors, multi-file skill or workflow updates, cross-repo updates, and tasks with meaningful tradeoffs as complex enough to deserve a real closeout answer.
- Treat mundane chores such as creating a branch, running a simple command, or applying a narrow typo fix as simple unless they expose broader decisions or blockers.
- When a TODO item points to a file, symbol, or neighboring repo, use that as the first anchor before broader exploration.
- When a TODO item remains too broad after the first read, switch into refinement mode with the user and record the task breakdown in `.agents/tasks/<task-name>/README.md`.
- Keep local task files synchronized with real progress as part of the task, not as an afterthought.
- Re-read `.agents/tasks/TODO.md` before concluding the overall session.

## Closeout Answers

- For a complex completed item, explain what changed, what did not change, how the work was approached, why notable decisions were made, which validations ran, and any remaining risks or follow-up work.
- For a complex blocked item, explain the blocker, what was already checked, what remains unknown, and what user decision or external input is needed.
- For a simple item, keep the answer short. Do not manufacture a long retrospective when the task had no meaningful tradeoffs.
- If several TODO items were handled in one session, group the closeout by task so the user can see which items are complete and which are still pending.

## Gotchas

- Do not treat stale local notes as more authoritative than the code, tests, or current repo state.
- Do not silently skip unchecked TODO items just because one slice is inconvenient; either handle them or surface the blocker.
- Do not delete or rewrite unrelated local task folders while working on the current item.
- If a TODO item is ambiguous, resolve the ambiguity from nearby code or notes when possible; if the missing detail still controls the outcome, ask the user before implementing.
- If a TODO item contains a wrong assumption, correct the premise explicitly with the user instead of executing the wrong task cleanly.

## Validation

- Confirm the executed slice has a focused validation step before marking the local task item done.
- Confirm complex items have an appropriate closeout answer before ending the turn.
- Confirm `.agents/tasks/TODO.md` reflects the current state before ending the session.
- Confirm any durable guidance discovered during local task execution has been promoted out of `.agents/tasks/` when appropriate.
