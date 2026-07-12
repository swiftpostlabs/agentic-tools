---
name: ref-sp-agents-local-tasks
description: "Reference guidance for using `.agents/tasks/` as a gitignored local workspace: a lightweight `TODO.md` notes list plus tracked task folders that move through `new/`, `open/`, and `closed/` lifecycle subfolders. Use when: reading or updating `.agents/tasks/TODO.md`, creating or moving a tracked task folder between `new/`, `open/`, and `closed/`, setting a task's frontmatter `status`, or checking whether local agent task notes still match the active work."
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "tasks"
---

# Agents Local Tasks

## Purpose

Define how this repo uses `.agents/tasks/` as a gitignored local workspace with two complementary layers:

- **`TODO.md`** — a lightweight notes and small-tasks list for quick items that do not need lifecycle tracking.
- **Tracked task folders** — one kebab-case folder per substantial task, each carrying a `README.md` whose frontmatter records an internal `status`. Each folder lives in exactly one lifecycle subfolder — `new/`, `open/`, or `closed/` — and moves between them as the task progresses.

Treat `.agents/tasks/` for task tracking and `.agents/playground/` for scratch artifacts as the default paired local workspaces unless the current repo explicitly documents a different convention.

## When to use this skill

- Reading or updating `.agents/tasks/TODO.md`.
- Creating a tracked task folder under `.agents/tasks/new/<task-name>/`, or moving one between `new/`, `open/`, and `closed/`.
- Setting or updating a task's frontmatter `status`.
- Storing temporary working files such as `pr-description.md`, `notes.md`, `validation.md`, or `plan.md` inside a task folder.
- Reviewing whether local task files still match the active work.

## Scope boundaries

This skill owns the **format and conventions** of `.agents/tasks/`: the directory model, the
lifecycle subfolders, `TODO.md` syntax, and frontmatter `status`.

- `tool-sp-handle-agents-local-tasks` — actually working the backlog: picking the next item, doing
  it, moving the folder. Read this skill for the format; invoke that one to run the loop.
- `ref-sp-dev-repo-conventions` — where `.agents/tasks/` and `.agents/playground/` sit in this repo's
  layout.
- Issue trackers, project boards, and anything outside `.agents/tasks/` are out of scope. This is the
  local, gitignored workspace only.

## Core Workflow

1. Check `.agents/tasks/TODO.md` for quick notes and small items, and scan `new/`, `open/`, and `closed/` for tracked task folders.
2. Decide whether the item is a quick note (leave it in `TODO.md`) or substantial enough to become a tracked task folder.
3. For substantial work, create `.agents/tasks/new/<task-name>/` with a `README.md` whose frontmatter sets `status:` (`new`, `ready`, or `blocked`).
4. When work begins, move the folder to `open/` and update `status` to `in progress` (or `in review` / `blocked`).
5. Keep the `README.md` brief current — objective, status, blockers, assumptions, and next steps — as the task changes.
6. When the task finishes, move the folder to `closed/` and set `status` to `done` or `cancelled`.
7. For complex tasks, prepare a concise closeout answer that explains what was done, what was not done, how and why important decisions were made, validation, and any remaining caveats.
8. Remove or refresh stale local files once a task is done or no longer relevant.

## Directory Model

| Path | Role |
| --- | --- |
| `.agents/tasks/TODO.md` | Lightweight notes and small tasks that do not need lifecycle tracking. |
| `.agents/tasks/new/<task-name>/` | Tracked task not started yet (`status: new \| ready \| blocked`). |
| `.agents/tasks/open/<task-name>/` | Tracked task being worked (`status: in progress \| in review \| blocked`). |
| `.agents/tasks/closed/<task-name>/` | Finished tracked task (`status: done \| cancelled`). |
| `.agents/tasks/<lifecycle>/<task-name>/README.md` | Living brief with `status` frontmatter, plan, and context. |
| `.agents/tasks/<lifecycle>/<task-name>/pr-description.md` | Temporary draft content for a PR or summary. |
| `.agents/tasks/<lifecycle>/<task-name>/notes.md`, `validation.md`, `plan.md` | Scratch notes, validation results, or a focused local plan. |
| `.agents/playground/` | Scratch space for temporary helper scripts or generated local artifacts that should be created with edit tools instead of terminal file-writing commands. |

## Task Lifecycle

A tracked task is a folder that lives in exactly one lifecycle subfolder at a time. As the task progresses, **move the whole folder** and update the `status` frontmatter to a value valid for the new subfolder.

| Subfolder | Meaning | Valid `status` values |
| --- | --- | --- |
| `new/` | Backlog — identified but not being worked yet. | `new`, `ready`, `blocked` |
| `open/` | Active — currently being worked. | `in progress`, `in review`, `blocked` |
| `closed/` | Finished — no further work expected. | `done`, `cancelled` |

**Core invariant — the subfolder and the `status` must always agree.** The subfolder is the source of truth for the lifecycle stage, and a task's `status` must be one of the values valid for the subfolder it currently sits in. The only allowed combinations are exactly those three rows above; any other pairing is invalid and must be corrected. Concretely:

- A folder in `new/` may only be `new`, `ready`, or `blocked` — never `in progress`, `in review`, `done`, or `cancelled`.
- A folder in `open/` may only be `in progress`, `in review`, or `blocked` — never `new`, `ready`, `done`, or `cancelled`.
- A folder in `closed/` may only be `done` or `cancelled` — never anything else.
- Whenever you move a folder to a new subfolder, update its `status` in the same step; whenever you change a task's `status`, confirm it is still valid for the subfolder (and move the folder if not). Never do one without the other.

Notes:

- `blocked` is the one status valid in **two** subfolders — `new/` and `open/`. Keep a blocked task in whichever subfolder reflects whether work has begun: `new/` if it never started, `open/` if it was in flight. A blocked task is never moved to `closed/`; `closed/` is only for `done` or `cancelled`.
- `new` means not yet triaged/refined; `ready` means refined and ready to pick up.

### Task README frontmatter

Each tracked task's `README.md` starts with YAML frontmatter carrying the `status`:

```markdown
---
status: in progress
---

# Task Title

Objective, plan, blockers, next steps…
```

## TODO.md Syntax

`TODO.md` holds quick notes and small tasks only; anything substantial becomes a tracked task folder. Unfinished items in `.agents/tasks/TODO.md` may use any of these forms:

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
| Update `.agents/tasks/TODO.md` | Refresh the quick-notes and small-tasks list. | `TODO.md` should reflect the current lightweight items that do not warrant a tracked folder. | When a quick note or small task appears, is resolved, or should be promoted into a tracked folder. | `TODO.md` matches the real state of small local work. |
| Create `.agents/tasks/new/<task-name>/` | Open a tracked task folder in the `new/` backlog with `status` frontmatter. | Substantial work needs its own lifecycle-tracked workspace separate from quick notes. | When an item is large enough to need running notes, a brief, or lifecycle tracking. | The task has a clearly named folder under `new/` with an initial `status`. |
| Move a task between `new/`, `open/`, `closed/` | Relocate the whole task folder and update its `status` to a value valid for the new subfolder. | The subfolder and `status` are the source of truth for where a task is in its lifecycle. | When work starts (`new/`→`open/`) or finishes (`open/`→`closed/`), or a task is cancelled. | The folder location and `status` agree and reflect reality. |
| Triage one tracked task | Decide whether the task can be executed directly or needs clarification first, and set `status` (`new`→`ready`, or `blocked`). | Simple tasks should not be over-processed, while broad or underdefined tasks should not be executed on guesswork. | When picking up a task from `new/`. | The next step is explicit and the `status` reflects readiness. |
| Add or update the task `README.md` | Keep a running summary of objective, status, blockers, and next steps, with current `status` frontmatter. | Multi-step work becomes hard to recover if the local context is scattered across chat only. | When the task has enough moving parts that a single summary file will reduce drift. | Another pass can resume the task from the local file without reconstructing context from scratch. |
| Store a temporary artifact such as `pr-description.md` or `validation.md` | Save work product that is useful during the task but does not belong in the committed repo. | Temporary drafts and scratch outputs should stay near the task they support. | When you need a local draft, notes, or validation log for the active task. | The artifact is easy to find and scoped to the right task folder. |
| Prepare a complex-task closeout answer | Summarize done, not done, how, why, validation, and residual caveats. | Complex tasks create context and tradeoffs that should not disappear into local notes. | When a TODO led to feature work, significant edits, cross-skill changes, or important design/quality decisions. | The user can understand the outcome without rereading the whole transcript or local task files. |
| Prune stale local files | Remove or update local tracking that no longer reflects real work. | Gitignored local notes become misleading if they outlive the task or drift from the code. | After scope changes, task completion, or abandonment. | `.agents/tasks/` stays useful instead of becoming a graveyard of stale notes. |

## Decision Rules

- Treat `.agents/tasks/` as local working state, not as committed product documentation.
- Use `.agents/tasks/` and `.agents/playground/` together as the default local workspace pair unless the current repo explicitly documents a different convention.
- Keep `.agents/tasks/` gitignored and promote durable guidance elsewhere instead of relying on local notes to survive cloning or review.
- Keep quick notes and small items in `TODO.md`; promote work into a tracked task folder once it is substantial enough to need lifecycle tracking or a running brief.
- Place a new tracked task folder in `new/`, move it to `open/` when work starts, and to `closed/` when it is done or cancelled; always move the whole folder, never copy it into two subfolders.
- Keep the lifecycle subfolder and the `status` frontmatter consistent: `new/` → `new`/`ready`/`blocked`, `open/` → `in progress`/`in review`/`blocked`, `closed/` → `done`/`cancelled`.
- Use `blocked` in `new/` when a not-yet-started task is blocked, and in `open/` when an in-flight task is blocked; do not move a task to `closed/` just because it is blocked.
- If a task is simple and well-defined, execute it directly instead of forcing a planning ritual first.
- Treat mundane chores such as creating a branch, running a simple command, or applying a narrow typo fix as simple unless they reveal broader decisions or blockers.
- Treat feature development, broad refactors, multi-file skill or workflow changes, cross-repo updates, and tasks with meaningful tradeoffs as complex.
- If a task is broad, ambiguous, or underdefined, ask the missing questions first and treat that clarification as part of the task rather than guessing; keep its `status: new` until it is refined to `ready`.
- If a task needs refinement before implementation, create the `README.md` and capture the clarified goal, assumptions, and subtasks there before starting execution.
- If the work still cannot be executed cleanly after initial clarification, run an interactive breakdown with the user and record the resulting subtasks in the task `README.md`.
- If a task relies on an incorrect assumption, state the problem calmly, explain the misunderstanding, and correct it with the user before proceeding.
- When a complex task is completed or blocked, the user-facing answer should state what was done, what was not done, how the work was approached, why notable decisions were made, what validation ran, and what caveats or next steps remain.
- Do not inflate simple tasks with a long closeout. A short status and validation note is enough when there were no meaningful decisions or residual risks.
- Prefer task- or PR-style, kebab-case folder names such as `.agents/tasks/new/add-button-for-language/`.
- When a temporary helper script or generated scratch file is needed, put it under `.agents/playground/` and create or edit it with the edit tools rather than shell heredocs, redirection, or inline terminal-generated files.
- Every tracked task folder should carry a `README.md` with `status` frontmatter so its lifecycle state is explicit; quick items that stay in `TODO.md` do not need one.
- If a local note becomes durable repo guidance, promote it into a committed doc, skill, or code comment instead of leaving it only under `.agents/tasks/`.
- Do not overwrite unrelated task folders when the active task changes; keep local notes scoped to the task they belong to.

## Gotchas

- `.agents/tasks/` is normally gitignored, so other collaborators and future clones will not see it unless the content is promoted elsewhere.
- Local tracking can drift from the code if it is not updated after scope changes.
- A task's lifecycle subfolder and its `status` frontmatter can drift apart if the folder is moved without updating `status`, or vice versa; keep them in sync.
- A temporary draft under `.agents/tasks/` is not a substitute for updating the actual repo source of truth when the information becomes permanent.
- Broad task text is not authorization to improvise missing requirements; refine it first when the scope is unclear.
- A broken premise in a task should be corrected, not silently worked around.

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
- Every tracked task folder under `new/`, `open/`, or `closed/` has a `README.md` with a `status` frontmatter value valid for its subfolder.
- No tracked task folder is in a subfolder whose lifecycle contradicts its `status` (e.g. `closed/` with `status: in progress`, or `new/` with `status: done`).
- After a major shift in scope, confirm that the active task folder's location, `status`, and `README.md` still describe the same task you are actually performing.
- Before concluding a task, check whether any durable guidance discovered in local notes should be moved into committed repo files.
- Before concluding a complex task, confirm the user-facing answer explains done, not done, how, why, validation, and remaining caveats at the level the task deserves.
