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

For each row, it is done when the content lives at the new path and the old path is either gone
or a link (a symlink, or a junction on Windows) to the new one. A real folder at the old path means
the row is not done.

## Apply

For each row not done:

1. If the new path does not exist, create `.agents/local/` and move the old folder there whole
   (`git mv` does not apply: the folders are gitignored). POSIX: `mv .agents/tasks .agents/local/tasks`.
   PowerShell: `Move-Item .agents\tasks .agents\local\tasks`.
2. If both exist as real folders, move each entry of the old folder into the new one. When a name
   exists in both, stop and ask the user which to keep. Then remove the empty old folder.
3. Leave no link at the old path, unless a session is still working in the old folder right
   now. In that case, link the old path to the new one (POSIX: `ln -s local/tasks .agents/tasks`;
   PowerShell: `New-Item -ItemType Junction -Path .agents\tasks -Target .agents\local\tasks`) and
   record the migration with `--note links-left`, so a later migration can remove the links once
   nothing uses them.

Then make sure `.gitignore` ignores `/.agents/local/`. Leave any ignore lines for the old paths:
other clones may not have migrated yet.

## Verify

- `.agents/local/tasks`, `.agents/local/retro`, and `.agents/local/playground` exist wherever their
  old folders existed, with the same files.
- None of the three old paths exists as a real folder; any that remains is a link to its new
  path, and the record says `links-left`.
- `git status --short .agents` shows no new untracked files.
