# 0001: Move agent folders under .agents/local

## Why

agentic-tools moved its gitignored agent workspaces under one folder, `.agents/local/`, so one
ignore rule covers them and `.agents/local/AGENTS.md` can describe them (commit `9c51ff8`). The
skills now name only the new paths:

| Old | New |
| --- | --- |
| `.agents/tasks/` | `.agents/local/tasks/` |
| `.agents/retro/` | `.agents/local/retro/` |
| `.agents/playground/` | `.agents/local/playground/` |

## Check

For each row, it is done when the content lives at the new path and the old path is gone, a link
(a symlink, or a junction on Windows) to the new one, or a folder holding only files git tracks
(`git ls-files <old path>` lists every file in it). Any other real folder at the old path means the
row is not done.

## Apply

For each row not done, from the repo root:

0. List tracked files first: `git ls-files .agents/tasks .agents/retro .agents/playground`. Leave
   each tracked file where it is (an older checkout may track `.agents/playground/.gitignore`);
   moving it shows as a deletion in git. The old folder then stays, holding only those files,
   until the repo stops tracking them.
1. If the old folder holds no tracked file and the new path does not exist, create
   `.agents/local/` and move the old folder there whole (`git mv` does not apply: the folders are
   gitignored). POSIX: `mv .agents/tasks .agents/local/tasks`. PowerShell:
   `Move-Item .agents\tasks .agents\local\tasks`.
2. Otherwise, move each untracked entry of the old folder into the new one, creating it if needed
   (POSIX: `mv .agents/tasks/<entry> .agents/local/tasks/`; PowerShell:
   `Move-Item .agents\tasks\<entry> .agents\local\tasks\`). When a name exists in both, stop and
   ask the user which to keep. Remove the old folder only if it is then empty.
3. Leave no link at the old path, unless a session is still working in the old folder right
   now and nothing tracked is left in it. In that case, link the old path to the new one (POSIX:
   `ln -s local/tasks .agents/tasks`; PowerShell, where the target resolves against the current
   folder: `New-Item -ItemType Junction -Path .agents\tasks -Target (Resolve-Path .agents\local\tasks)`)
   and record the migration with `--note links-left`, so a later migration can remove the links
   once nothing uses them.

Then make sure `.gitignore` ignores `/.agents/local/`. Leave any ignore lines for the old paths:
other clones may not have migrated yet.

## Verify

- `.agents/local/tasks`, `.agents/local/retro`, and `.agents/local/playground` exist wherever their
  old folders existed, with the same files.
- Each old path is gone, a link to its new path (with the note `links-left` recorded), or a
  folder holding only tracked files.
- `git status --short .agents` shows no deleted or new untracked files.
