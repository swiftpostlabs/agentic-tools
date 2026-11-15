# Worker Worktrees

How each worker keeps its edits apart from the shared checkout and from the other workers.

## Why a worktree

Sessions sharing one checkout share one git index, so one agent's `git add` can sweep another's
staged files into its commit. Sessions also run live files from that checkout (the board script, a
hook), so a half-saved edit breaks every one of them.

## The rules

- **One worktree per worker and piece,** at `.agents/local/worktrees/<id>-<topic>/`, created
  locked: `git worktree add --lock --reason "<id>, from <WSL|Windows>" --detach <path>`, or
  `-b <branch>` in place of `--detach` when the coordinator names one. Commit there;
  the coordinator brings the commits into the shared checkout, which only it rebases or pulls.
- **Inside the gitignored `.agents/local/`,** the main checkout's git ignores the worktree, and
  `board.mts` run there still finds the main board. Check once per repo that the main checkout's
  test and lint runs skip `.agents/local/`.
- **The folder holds worktrees only.** Logs, screenshots, drafts, and test clones go in
  `.agents/local/playground/` (`ref-sp-agents-local-tasks`), and the worker deletes them when the
  piece is done. Anything else left in `worktrees/` looks like someone's work, so nobody dares
  remove it.
- **Remove your worktree once its commits are merged:** `git worktree unlock <path>`, then
  `git worktree remove <path>`. A rebased merge gives the commits new hashes, so `git branch -d`
  refuses the branch. When `git cherry <main> <branch>` prints no line starting with `+`, every
  commit is on main: delete the branch with `git branch -D <branch>`. A detached worktree has no
  branch to delete.
- **Never run `git clean -x` in the shared checkout:** it deletes the board, tasks, and retros, and
  with `-ff` the worktrees too.

## Worktrees across WSL and Windows

A checkout on a Windows drive can be used from both WSL and Windows, but each git writes worktree
paths in its own form. Windows git reads a worktree created by WSL git (`/mnt/c/...`) as missing
and lists it as `prunable`; `git worktree prune` from Windows then deletes its records at once, and
the worktree stops working as one (`git gc` does the same about three months later). A worktree
created by Windows git stores `C:/...` paths, which WSL git cannot follow either.

- **Locking at creation prevents this:** prune and gc skip locked worktrees. To protect one created
  without the lock, run `git worktree lock --reason "<why>" <path>`.
- **Never run `git worktree prune` from the other environment** without checking `git worktree list`
  for worktrees that are not locked.
- **Run git for a worktree from the environment that created it.** Windows git cannot open a
  WSL-created worktree ("fatal: not a git repository").

## Package scripts in a worktree

Node imports find the main checkout's `node_modules` by walking up, but package scripts don't. One
calling a tool by name (`eslint`) needs the main checkout's `node_modules/.bin` first on `PATH`, and
one naming a `node_modules/...` path needs that command rerun with the main checkout's path.
Install in the worktree only if its commits change dependencies.
