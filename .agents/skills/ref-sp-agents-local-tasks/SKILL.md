---
name: ref-sp-agents-local-tasks
description: "Reference guidance for using `.agents/tasks/` as a gitignored local workspace: a lightweight `TODO.md` notes list plus date-prefixed tracked task folders that move through the `10-new/`, `20-open/`, and `90-closed/` lifecycle subfolders, each carrying `status`, `created`, `updated`, and (once closed) a prose `outcome` in frontmatter. Use when: reading or updating `.agents/tasks/TODO.md`, creating or moving a tracked task folder between `10-new/`, `20-open/`, and `90-closed/`, setting a task's frontmatter `status` or `outcome`, naming a task folder, writing a task brief and deciding how much of a proposed solution belongs in it, or checking whether local agent task notes still match the active work."
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
- **Tracked task folders** — one date-prefixed, kebab-case folder per substantial task, each carrying a `README.md` whose frontmatter records `status`, `created`, `updated`, and (once closed) a prose `outcome`. Each folder lives in exactly one lifecycle subfolder — `10-new/`, `20-open/`, or `90-closed/` — and moves between them as the task progresses.

Treat `.agents/tasks/` for task tracking and `.agents/playground/` for scratch artifacts as the default paired local workspaces unless the current repo explicitly documents a different convention.

## When to use this skill

- Reading or updating `.agents/tasks/TODO.md`.
- Creating a tracked task folder under `.agents/tasks/10-new/<YYYY-MM-DD>-<task-name>/`, or moving one between `10-new/`, `20-open/`, and `90-closed/`.
- Setting or updating a task's frontmatter `status`, `updated`, or `outcome`.
- Storing temporary working files such as `pr-description.md`, `notes.md`, `validation.md`, or `plan.md` inside a task folder.
- Reviewing whether local task files still match the active work.

## Scope boundaries

This skill owns the **format and conventions** of `.agents/tasks/`: the directory model, the
lifecycle subfolders, folder naming, `TODO.md` syntax, and the frontmatter fields.

- `tool-sp-handle-agents-local-tasks` — actually working the backlog: picking the next item, doing
  it, moving the folder. Read this skill for the format; invoke that one to run the loop.
- `ref-sp-dev-repo-conventions` — where `.agents/tasks/` and `.agents/playground/` sit in this repo's
  layout.
- Issue trackers, project boards, and anything outside `.agents/tasks/` are out of scope. This is the
  local, gitignored workspace only.

## Core Workflow

1. Check `.agents/tasks/TODO.md` for quick notes and small items, and scan `10-new/`, `20-open/`, and `90-closed/` for tracked task folders.
2. Decide whether the item is a quick note (leave it in `TODO.md`) or substantial enough to become a tracked task folder.
3. For substantial work, create `.agents/tasks/10-new/<YYYY-MM-DD>-<task-name>/` with a `README.md` whose frontmatter sets `status:` (`new`, `ready`, or `blocked`) plus `created:` and `updated:`.
4. When work begins, move the folder to `20-open/` and update `status` to `in-progress` (or `in-review` / `blocked`).
5. Keep the `README.md` brief current — objective, status, blockers, assumptions, and next steps — as the task changes, bumping `updated` in the same edit. Default that brief to describing the problem rather than prescribing its fix; see [Task README body](#task-readme-body).
6. When the task finishes, move the folder to `90-closed/`, set `status` to `done` or `cancelled`, and write the prose `outcome`.
7. For complex tasks, prepare a concise closeout answer that explains what was done, what was not done, how and why important decisions were made, validation, and any remaining caveats.
8. Remove or refresh stale local files once a task is done or no longer relevant.

## Directory Model

| Path | Role |
| --- | --- |
| `.agents/tasks/TODO.md` | Lightweight notes and small tasks that do not need lifecycle tracking. |
| `.agents/tasks/10-new/<date>-<task-name>/` | Tracked task not started yet (`status: new \| ready \| blocked`). |
| `.agents/tasks/20-open/<date>-<task-name>/` | Tracked task being worked (`status: in-progress \| in-review \| blocked`). |
| `.agents/tasks/90-closed/<date>-<task-name>/` | Finished tracked task (`status: done \| cancelled`). |
| `.agents/tasks/<lifecycle>/<date>-<task-name>/README.md` | Living brief with frontmatter, plan, and context. |
| `.agents/tasks/<lifecycle>/<date>-<task-name>/pr-description.md` | Temporary draft content for a PR or summary. |
| `.agents/tasks/<lifecycle>/<date>-<task-name>/notes.md`, `validation.md`, `plan.md` | Scratch notes, validation results, or a focused local plan. |
| `.agents/playground/` | Scratch space for temporary helper scripts or generated local artifacts that should be created with edit tools instead of terminal file-writing commands. |

### Naming and ordering

The lifecycle subfolders carry a fixed-width numeric prefix — `10-new/`, `20-open/`, `90-closed/` —
so a plain `ls` shows them in lifecycle order instead of alphabetical order, which would put `closed`
first. The gaps leave room to insert a stage without renumbering. This is the Linux `.d`-directory
convention; `ref-sp-dev-projects-architecture` records where it comes from and why fixed width
matters. Nothing parses these numbers — they exist only to make the sort match the sequence.

Task folders are named `<YYYY-MM-DD>-<task-name>/`, where the date is the day the task was created
and matches the date part of `created` in frontmatter. The prefix sorts each subfolder
chronologically, so a stale backlog item is visible at a glance in `10-new/`. Match a task by topic
with a glob (`10-new/*wordpress*`) rather than by typing the date.

## Task Lifecycle

A tracked task is a folder that lives in exactly one lifecycle subfolder at a time. As the task progresses, **move the whole folder** and update the `status` frontmatter to a value valid for the new subfolder.

| Subfolder | Meaning | Valid `status` values |
| --- | --- | --- |
| `10-new/` | Backlog — identified but not being worked yet. | `new`, `ready`, `blocked` |
| `20-open/` | Active — currently being worked. | `in-progress`, `in-review`, `blocked` |
| `90-closed/` | Finished — no further work expected. | `done`, `cancelled` |

**Core invariant — the subfolder and the `status` must always agree.** The subfolder is the source of truth for the lifecycle stage, and a task's `status` must be one of the values valid for the subfolder it currently sits in. The only allowed combinations are exactly those three rows above; any other pairing is invalid and must be corrected. Concretely:

- A folder in `10-new/` may only be `new`, `ready`, or `blocked` — never `in-progress`, `in-review`, `done`, or `cancelled`.
- A folder in `20-open/` may only be `in-progress`, `in-review`, or `blocked` — never `new`, `ready`, `done`, or `cancelled`.
- A folder in `90-closed/` may only be `done` or `cancelled` — never anything else.
- Whenever you move a folder to a new subfolder, update its `status` in the same step; whenever you change a task's `status`, confirm it is still valid for the subfolder (and move the folder if not). Never do one without the other.

Notes:

- `blocked` is the one status valid in **two** subfolders — `10-new/` and `20-open/`. Keep a blocked task in whichever subfolder reflects whether work has begun: `10-new/` if it never started, `20-open/` if it was in flight. A blocked task is never moved to `90-closed/`; `90-closed/` is only for `done` or `cancelled`.
- `new` means not yet triaged/refined; `ready` means refined and ready to pick up.

### Task README frontmatter

Each tracked task's `README.md` starts with YAML frontmatter:

```markdown
---
status: in-progress
created: 2026-07-11T21:56:06+02:00
updated: 2026-07-25T11:11:26+02:00
---

# Task Title

Objective, plan, blockers, next steps…
```

A task in `90-closed/` adds a prose `outcome`:

```markdown
---
status: done
created: 2026-07-15T21:53:15+02:00
updated: 2026-07-15T22:04:32+02:00
outcome: "Both fixes landed, but the auto-merge path was never re-verified end to end because CI
  was red on an unrelated error. Closed on its fixes, not on full verification."
---
```

The fields:

- `status` — the lifecycle position, which must agree with the subfolder. Multi-word values are
  hyphenated (`in-progress`, `in-review`) so they need no quoting and match cleanly.
- `created` — ISO 8601 timestamp with offset, from `date -Iseconds`. Its date part must match the
  folder-name prefix.
- `updated` — same format, bumped whenever the `README.md` is edited or the folder moves.
- `outcome` — **prose, not an enum**, required once a task reaches `90-closed/`. One or two sentences
  saying how the task actually ended, including what was *not* done and why.

`outcome` is prose because `done` and `cancelled` already carry the machine-readable part, and the
part worth reading is the qualification — "closed on its fixes, not on full verification" is the
signal an enum destroys. Keep it to a sentence or two and leave the full reasoning in the body:
frontmatter is what a `grep` or `head` across the directory surfaces, not where a long argument
belongs. YAML has no markdown rendering and is indentation-sensitive, so anything with bullets or
multiple paragraphs belongs in the body instead.

Nothing validates these files — they are gitignored and the skill validators only cover `SKILL.md`.
The invariants hold only because this checklist is followed. `updated` is the field most likely to
drift; when it looks wrong, the filesystem is the fallback ground truth, but note that a folder's
`mtime` tracks child add/remove rather than content edits, so compare against the files inside it.

### Task README body

Frontmatter carries the lifecycle; the body carries the brief. Default the body to **descriptive,
not prescriptive**: state the problem, its context, and why it matters, and leave deciding the fix to
whoever picks the task up.

Filing a task and working it are usually separated by weeks and by a changed repo. A README that
prescribes an implementation freezes a judgment made with the information available on the day it was
filed, and whoever picks it up inherits the conclusion without the evidence behind it. Describing the
problem well is what survives; prescribing the fix usually does not.

This is a default about content shape, not a ban on solution material. Solution content belongs in
the body, framed so it does not bind:

- **Record as fact** what was verified: the current state, the evidence, the sources behind each
  claim.
- **Record as decided** only what was actually settled, and say that it was settled rather than
  derived. A decision someone made explicitly is context, not prescription.
- **Record as open** the questions nobody answered, so the next reader knows they are still live.
- **Record everything else as options**, under a heading that says so. Notes, examples, candidate
  approaches, and half-formed leads are worth keeping; they just must not read as instructions.

What to leave out is implementation detail invented while filing: step sequences, file layouts, and
function or flag names that nothing has validated. Those read like findings and are not.

A task whose brief explicitly asks for a prescriptive plan overrides this default. Say so in the task
rather than leaving the next reader to infer it.

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
| Create `.agents/tasks/10-new/<date>-<task-name>/` | Open a tracked task folder in the `10-new/` backlog with `status`, `created`, and `updated` frontmatter. | Substantial work needs its own lifecycle-tracked workspace separate from quick notes. | When an item is large enough to need running notes, a brief, or lifecycle tracking. | The task has a date-prefixed folder under `10-new/` with an initial `status`. |
| Move a task between `10-new/`, `20-open/`, `90-closed/` | Relocate the whole task folder and update its `status` to a value valid for the new subfolder, bumping `updated`. | The subfolder and `status` are the source of truth for where a task is in its lifecycle. | When work starts (`10-new/`→`20-open/`) or finishes (`20-open/`→`90-closed/`), or a task is cancelled. | The folder location and `status` agree and reflect reality. |
| Triage one tracked task | Decide whether the task can be executed directly or needs clarification first, and set `status` (`new`→`ready`, or `blocked`). | Simple tasks should not be over-processed, while broad or underdefined tasks should not be executed on guesswork. | When picking up a task from `10-new/`. | The next step is explicit and the `status` reflects readiness. |
| Write a task's `outcome` on close | Record in prose how the task actually ended, including what was not done and why. | The qualification around a `done` is the part worth reading later; the status enum cannot carry it. | When moving a task to `90-closed/`. | A future reader can tell what really happened without opening the body. |
| Add or update the task `README.md` | Keep a running summary of objective, status, blockers, and next steps, with current `status` frontmatter. | Multi-step work becomes hard to recover if the local context is scattered across chat only. | When the task has enough moving parts that a single summary file will reduce drift. | Another pass can resume the task from the local file without reconstructing context from scratch. |
| Store a temporary artifact such as `pr-description.md` or `validation.md` | Save work product that is useful during the task but does not belong in the committed repo. | Temporary drafts and scratch outputs should stay near the task they support. | When you need a local draft, notes, or validation log for the active task. | The artifact is easy to find and scoped to the right task folder. |
| Prepare a complex-task closeout answer | Summarize done, not done, how, why, validation, and residual caveats. | Complex tasks create context and tradeoffs that should not disappear into local notes. | When a TODO led to feature work, significant edits, cross-skill changes, or important design/quality decisions. | The user can understand the outcome without rereading the whole transcript or local task files. |
| Prune stale local files | Remove or update local tracking that no longer reflects real work. | Gitignored local notes become misleading if they outlive the task or drift from the code. | After scope changes, task completion, or abandonment. | `.agents/tasks/` stays useful instead of becoming a graveyard of stale notes. |

## Decision Rules

- Treat `.agents/tasks/` as local working state, not as committed product documentation.
- Use `.agents/tasks/` and `.agents/playground/` together as the default local workspace pair unless the current repo explicitly documents a different convention.
- Keep `.agents/tasks/` gitignored and promote durable guidance elsewhere instead of relying on local notes to survive cloning or review.
- Keep quick notes and small items in `TODO.md`; promote work into a tracked task folder once it is substantial enough to need lifecycle tracking or a running brief.
- Place a new tracked task folder in `10-new/`, move it to `20-open/` when work starts, and to `90-closed/` when it is done or cancelled; always move the whole folder, never copy it into two subfolders.
- Keep the lifecycle subfolder and the `status` frontmatter consistent: `10-new/` → `new`/`ready`/`blocked`, `20-open/` → `in-progress`/`in-review`/`blocked`, `90-closed/` → `done`/`cancelled`.
- Use `blocked` in `10-new/` when a not-yet-started task is blocked, and in `20-open/` when an in-flight task is blocked; do not move a task to `90-closed/` just because it is blocked.
- Bump `updated` in the same edit that changes the `README.md` or moves the folder, exactly as `status` is kept in step with the subfolder.
- Write `outcome` as prose when closing a task, and say plainly what was left undone rather than rounding a partial result up to `done`.
- Default a task `README.md` body to describing the problem, its context, and why it matters; keep solution material as clearly labelled options, notes, or examples, and record only what was explicitly settled as settled.
- If a task is simple and well-defined, execute it directly instead of forcing a planning ritual first.
- Treat mundane chores such as creating a branch, running a simple command, or applying a narrow typo fix as simple unless they reveal broader decisions or blockers.
- Treat feature development, broad refactors, multi-file skill or workflow changes, cross-repo updates, and tasks with meaningful tradeoffs as complex.
- If a task is broad, ambiguous, or underdefined, ask the missing questions first and treat that clarification as part of the task rather than guessing; keep its `status: new` until it is refined to `ready`.
- If a task needs refinement before implementation, create the `README.md` and capture the clarified goal, assumptions, and subtasks there before starting execution.
- If the work still cannot be executed cleanly after initial clarification, run an interactive breakdown with the user and record the resulting subtasks in the task `README.md`.
- If a task relies on an incorrect assumption, state the problem calmly, explain the misunderstanding, and correct it with the user before proceeding.
- When a complex task is completed or blocked, the user-facing answer should state what was done, what was not done, how the work was approached, why notable decisions were made, what validation ran, and what caveats or next steps remain.
- Do not inflate simple tasks with a long closeout. A short status and validation note is enough when there were no meaningful decisions or residual risks.
- Prefer task- or PR-style, kebab-case folder names behind the date prefix, such as `.agents/tasks/10-new/2026-07-25-add-button-for-language/`.
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
- A task `README.md` that prescribes an implementation freezes a judgment made on the day it was filed; whoever works it weeks later inherits the conclusion without the evidence, and against a repo that has since moved.
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
- Every tracked task folder under `10-new/`, `20-open/`, or `90-closed/` has a `README.md` with a `status` frontmatter value valid for its subfolder, plus `created` and `updated`.
- No tracked task folder is in a subfolder whose lifecycle contradicts its `status` (e.g. `90-closed/` with `status: in-progress`, or `10-new/` with `status: done`).
- Every folder name is `<YYYY-MM-DD>-<task-name>`, and the date matches the date part of `created`.
- Every task in `90-closed/` has a prose `outcome` that names what was not done, not only what was.
- After a major shift in scope, confirm that the active task folder's location, `status`, and `README.md` still describe the same task you are actually performing.
- Before concluding a task, check whether any durable guidance discovered in local notes should be moved into committed repo files.
- Before concluding a complex task, confirm the user-facing answer explains done, not done, how, why, validation, and remaining caveats at the level the task deserves.
