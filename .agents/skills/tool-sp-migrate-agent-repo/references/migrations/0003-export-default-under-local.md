# 0003: Move export output to the playground under .agents/local

## Why

`agentic-tools export build` wrote to `.agents/playground/export/<target>` by default even after
migration 0001 moved the playground to `.agents/local/playground/`, so each run without `--out`
recreated the old folder. The default is now `.agents/local/playground/export/<target>`. Runs that
pass `--out` are not affected.

## Check

Done when `.agents/playground/export/` does not exist, or `.agents/playground` is a link (a
symlink, or a junction on Windows) to `.agents/local/playground`, as migration 0001 may leave it:
the old default then already lands in the new place.

## Apply

From the repo root:

1. Create `.agents/local/playground/export/` if it does not exist.
2. Move each entry of `.agents/playground/export/` into it (POSIX:
   `mv .agents/playground/export/<entry> .agents/local/playground/export/`; PowerShell:
   `Move-Item .agents\playground\export\<entry> .agents\local\playground\export\`). When a name
   exists in both, stop and ask the user which to keep: both are generated, but the older one may
   be what was uploaded.
3. Remove `.agents/playground/export/`, then `.agents/playground/` too if it is now empty and git
   tracks nothing in it (`git ls-files .agents/playground` prints nothing).
4. Search the repo's own scripts and docs for `.agents/playground/export` and point them at the new
   path, or pass `--out` explicitly where the old place must stay.

## Verify

- `.agents/playground/export/` is gone, or reached through a link to `.agents/local/playground`.
- Every export the old folder held is under `.agents/local/playground/export/`.
- `git status --short .agents` shows no deleted or new untracked files.
