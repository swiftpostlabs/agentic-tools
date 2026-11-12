# 0003: Move export output to the playground under .agents/local

## Why

`agentic-tools export build` wrote to `.agents/playground/export/<target>` by default even after
migration 0001 moved the playground to `.agents/local/playground/`, so each run without `--out`
recreated the old folder. The default is now `.agents/local/playground/export/<target>` (commit
`cd55a8e`, in `src/features/export/build.ts`). Runs that pass `--out` are not affected.

Apply it only once the repo runs an `agentic-tools` that includes `cd55a8e`. An older one still
writes to the old default, so the next `export build` without `--out` recreates the old folder
after this migration is recorded, and nothing lists it as pending again.

## Check

Done when `.agents/playground/export/` does not exist, holds only files git tracks
(`git ls-files .agents/playground/export` lists every file in it), or `.agents/playground` is a link (a
symlink, or a junction on Windows) to `.agents/local/playground`, as migration 0001 may leave it:
the old default then already lands in the new place.

## Apply

From the repo root:

0. List tracked files first: `git ls-files .agents/playground/export`. Leave each tracked file
   where it is and move only the untracked entries; moving a tracked file shows as a deletion in
   git.
1. Create `.agents/local/playground/export/` if it does not exist.
2. Move each untracked entry of `.agents/playground/export/` into it (POSIX:
   `mv .agents/playground/export/<entry> .agents/local/playground/export/`; PowerShell:
   `Move-Item .agents\playground\export\<entry> .agents\local\playground\export\`). When a name
   exists in both, stop and ask the user which to keep: both are generated, but the older one may
   be what was uploaded.
3. Remove `.agents/playground/export/` if it is now empty, then `.agents/playground/` too if it
   is now empty and git tracks nothing in it (`git ls-files .agents/playground` prints nothing).
4. Search the repo's own scripts and docs for `.agents/playground/export` and point them at the new
   path, or pass `--out` explicitly where the old place must stay.

## Verify

- `.agents/playground/export/` is gone, holds only tracked files, or is reached through a link to
  `.agents/local/playground`.
- Every export the old folder held is under `.agents/local/playground/export/`.
- `git status --short .agents` shows no deleted or new untracked files.
