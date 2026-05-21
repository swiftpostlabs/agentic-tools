---
name: ref-agents-local-tasks
description: "Reference guidance for using `.agents/tasks/` as a gitignored local workspace for task backlogs, temporary working files, and per-task notes. Use when: reading or updating `.agents/tasks/TODO.md`, maintaining task-specific folders under `.agents/tasks/`, or checking whether local agent task notes still match the active work."
metadata:
  agentic-tools-category: "agents"
  shareable-skills.visibility: "shareable"
---

# Agents Local Tasks

## Purpose

Define how this repo uses `.agents/tasks/` as a gitignored local workspace for backlog tracking, working notes, temporary delivery artifacts, and per-task execution context.
Treat `.agents/tasks/` for task tracking and `.agents/playground/` for scratch artifacts as the default paired local workspaces unless the current repo explicitly documents a different convention.

## When to use this skill

- Reading or updating `.agents/tasks/TODO.md`.
- Creating or maintaining `.agents/tasks/<task-name>/` for a multi-step task.
- Storing temporary working files such as `pr-description.md`, `notes.md`, `validation.md`, or `plan.md`.
- Reviewing whether local task files still match the active work.

## Core Workflow

1. Check `.agents/tasks/TODO.md` when the work belongs to a larger local backlog or set of follow-up items.
2. Decide whether the item is simple enough to execute directly or whether it needs clarification or refinement first.
3. Use one kebab-case folder per active task under `.agents/tasks/<task-name>/` when the work is complex enough to need a dedicated local workspace.
4. Keep one anchor file for the task when the work is broad enough to need a running brief, explicit subtasks, or a refinement record.
5. Update progress, blockers, assumptions, and next steps as the task changes.
6. For complex tasks, prepare a concise closeout answer that explains what was done, what was not done, how and why important decisions were made, validation, and any remaining caveats.
7. Remove or refresh stale local files once the task is done or no longer relevant.

## Directory Model

| Path | Role |
| --- | --- |
| `.agents/tasks/TODO.md` | Local top-level backlog for follow-up work in this repo. |
| `.agents/tasks/<task-name>/` | Local workspace for one task or PR-sized slice. |
| `.agents/tasks/<task-name>/README.md` | Preferred living brief when the task needs ongoing status, plan, and context. |
| `.agents/tasks/<task-name>/pr-description.md` | Temporary draft content for a PR or summary. |
| `.agents/tasks/<task-name>/notes.md`, `validation.md`, `plan.md` | Scratch notes, validation results, or a focused local plan. |
| `.agents/playground/` | Scratch space for temporary helper scripts or generated local artifacts that should be created with edit tools instead of terminal file-writing commands. |

## Backlog Syntax

Unfinished top-level items in `.agents/tasks/TODO.md` may use any of these forms:

```markdown
- todo item description
- [] todo item description
- [ ] todo item description
```

Completed items should use `[x]`:

```markdown
- [x] completed todo item description
```

When a helper script needs to find the next open task, treat plain bullets, empty brackets, and spaced empty brackets as open items, and skip `[x]` or `[X]` items.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Update `.agents/tasks/TODO.md` | Refresh the local backlog across active work. | The top-level TODO should reflect the current local priority list. | When new follow-up work appears, priorities change, or an item is completed. | The top-level backlog matches the real state of the work. |
| Triage one TODO item | Decide whether the item can be done directly or needs clarification first. | Simple tasks should not be over-processed, while broad or underdefined tasks should not be executed on guesswork. | When starting a new unchecked item from `.agents/tasks/TODO.md`. | The next step is explicit: execute immediately, ask clarifying questions, or open a local task brief first. |
| Create `.agents/tasks/<task-name>/` | Open a local workspace for one task or PR-sized slice. | Keeping one folder per task prevents unrelated notes from mixing together. | When a task is large enough to need its own running notes or temporary artifacts. | The task has a clearly named local workspace. |
| Add or update an anchor file such as `README.md` or `plan.md` | Keep a running summary of objective, status, blockers, and next steps. | Multi-step work becomes hard to recover if the local context is scattered across chat only. | When the task has enough moving parts that a single summary file will reduce drift. | Another pass can resume the task from the local file without reconstructing context from scratch. |
| Store a temporary artifact such as `pr-description.md` or `validation.md` | Save work product that is useful during the task but does not belong in the committed repo. | Temporary drafts and scratch outputs should stay near the task they support. | When you need a local draft, notes, or validation log for the active task. | The artifact is easy to find and scoped to the right task folder. |
| Prepare a complex-task closeout answer | Summarize done, not done, how, why, validation, and residual caveats. | Complex tasks create context and tradeoffs that should not disappear into local notes. | When a TODO led to feature work, significant edits, cross-skill changes, or important design/quality decisions. | The user can understand the outcome without rereading the whole transcript or local task files. |
| Prune stale local files | Remove or update local tracking that no longer reflects real work. | Gitignored local notes become misleading if they outlive the task or drift from the code. | After scope changes, task completion, or abandonment. | `.agents/tasks/` stays useful instead of becoming a graveyard of stale notes. |

## Decision Rules

- Treat `.agents/tasks/` as local working state, not as committed product documentation.
- Use `.agents/tasks/` and `.agents/playground/` together as the default local workspace pair unless the current repo explicitly documents a different convention.
- Keep `.agents/tasks/` gitignored and promote durable guidance elsewhere instead of relying on local notes to survive cloning or review.
- If a TODO item is simple and well-defined, execute it directly instead of forcing a planning ritual first.
- Treat mundane chores such as creating a branch, running a simple command, or applying a narrow typo fix as simple unless they reveal broader decisions or blockers.
- Treat feature development, broad refactors, multi-file skill or workflow changes, cross-repo updates, and tasks with meaningful tradeoffs as complex.
- If a TODO item is broad, ambiguous, or underdefined, ask the missing questions first and treat that clarification as part of the task rather than guessing.
- If a TODO item needs refinement before implementation, create `.agents/tasks/<task-name>/README.md` and capture the clarified goal, assumptions, and subtasks there before starting execution.
- If the work still cannot be executed cleanly after initial clarification, run an interactive breakdown with the user and record the resulting subtasks in the task `README.md`.
- If a TODO item relies on an incorrect assumption, state the problem calmly, explain the misunderstanding, and correct it with the user before proceeding.
- When a complex TODO is completed or blocked, the user-facing answer should state what was done, what was not done, how the work was approached, why notable decisions were made, what validation ran, and what caveats or next steps remain.
- Do not inflate simple tasks with a long closeout. A short status and validation note is enough when there were no meaningful decisions or residual risks.
- Prefer task- or PR-style, kebab-case folder names such as `.agents/tasks/add-button-for-language/`.
- When a temporary helper script or generated scratch file is needed, put it under `.agents/playground/` and create or edit it with the edit tools rather than shell heredocs, redirection, or inline terminal-generated files.
- Do not require every task folder to have a `README.md`. Use one only when the work needs a durable running brief.
- If the folder only needs a narrow temporary artifact, store that file directly without inventing extra structure.
- If a local note becomes durable repo guidance, promote it into a committed doc, skill, or code comment instead of leaving it only under `.agents/tasks/`.
- Do not overwrite unrelated task folders when the active task changes; keep local notes scoped to the task they belong to.

## Gotchas

- `.agents/tasks/` is normally gitignored, so other collaborators and future clones will not see it unless the content is promoted elsewhere.
- Local tracking can drift from the code if it is not updated after scope changes.
- A temporary draft under `.agents/tasks/` is not a substitute for updating the actual repo source of truth when the information becomes permanent.
- Broad TODO text is not authorization to improvise missing requirements; refine it first when the scope is unclear.
- A broken premise in a TODO item should be corrected, not silently worked around.

## Example Next-Todo Readers

Use examples like these as temporary helpers under `.agents/playground/` when manual scanning is noisy. Keep them simple and delete them when they are no longer useful.

```python
from pathlib import Path
import re


TODO_PATH = Path(".agents/tasks/TODO.md")
DONE_LINE = re.compile(r"^-\s*\[[xX]\]\s+")
OPEN_LINE = re.compile(r"^-\s*(?:\[\s*\]\s*)?(?P<text>\S.*)$")


def find_next_todo(todo_path: Path) -> tuple[int, str] | None:
    for line_number, line in enumerate(
        todo_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if DONE_LINE.match(line):
            continue

        match = OPEN_LINE.match(line)
        text = match.group("text").strip() if match else ""
        if text:
            return line_number, text

    return None


def main() -> None:
    todo_item = find_next_todo(TODO_PATH)
    if todo_item is None:
        print("No open todos found.")
        return

    line_number, text = todo_item
    print(f"{TODO_PATH}:{line_number}: {text}")


if __name__ == "__main__":
    main()
```

```typescript
import { readFileSync } from "node:fs";

type TodoItem = {
  lineNumber: number;
  text: string;
};

const todoPath = ".agents/tasks/TODO.md";
const doneLine = /^-\s*\[[xX]\]\s+/;
const openLine = /^-\s*(?:\[\s*\]\s*)?(?<text>\S.*)$/;

const findNextTodo = (content: string): TodoItem | null => {
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (doneLine.test(line)) {
      continue;
    }

    const match = openLine.exec(line);
    const text = match?.groups?.text?.trim();
    if (text) {
      return { lineNumber: index + 1, text };
    }
  }

  return null;
};

const main = (): void => {
  const todoItem = findNextTodo(readFileSync(todoPath, "utf8"));
  if (!todoItem) {
    console.log("No open todos found.");
    return;
  }

  console.log(`${todoPath}:${todoItem.lineNumber}: ${todoItem.text}`);
};

main();
```

## Validation

- Any helper or workflow that scans `.agents/tasks/TODO.md` recognizes plain bullets, `[]`, and `[ ]` as open items, and skips `[x]` or `[X]` items.
- After a major shift in scope, confirm that `.agents/tasks/TODO.md` and the active task folder still describe the same task you are actually performing.
- Before concluding a task, check whether any durable guidance discovered in local notes should be moved into committed repo files.
- Before concluding a complex TODO, confirm the user-facing answer explains done, not done, how, why, validation, and remaining caveats at the level the task deserves.
