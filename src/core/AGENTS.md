# src/core

The front controller, plus what every feature shares. Nothing here holds a feature's logic.

## What it holds

- `cli.mts`: the run-only bin entry. Handles a closed stdout pipe, runs the program, and sets
  `process.exitCode`. Compiled to `dist/core/cli.mjs`, the npm `bin`, and run directly by the
  Python shim.
- `program.ts`: `runCli`, the importable program and the front controller. It builds one commander
  program, with `--workspace` only before the group and each command's options after its name, and
  resolves the workspace in a `preAction` hook, once every argument has been validated. It first
  refuses what commander accepts: help beside another mistake, and a command after `--`. Exit codes:
  0 success and help; 1 for a `ToolError` or a group run without a command; 2 for any usage error.
- `command.ts`: the command contract. `CommandContext` (`cwd`, `home`, `output`, `setExitCode`), and
  the `value` and `collect` option parsers, without which commander takes a flag as a value and keeps
  only the last of a repeated option.
- `errors.ts`: `ToolError`, an expected failure the CLI reports by message alone.
- `output.ts`: the injectable `Output`, plus a capturing one for tests. `info` is a command's result,
  written straight to stdout; `warn` and `error` are diagnostics, written to stderr through one
  explicitly configured consola, so the environment cannot change or drop a line.
- `paths.ts`, `fs.ts`, `json.ts`, `frontmatter.ts`: workspace locations, filesystem checks, JSON
  and zod helpers (`parseWith`), and `SKILL.md` frontmatter parsing.
- `testFixtures.ts`: temp directories and skill fixtures for tests. Excluded from `dist/` and the
  wheel.

## Rules

- **Commands are registered here and implemented in `features/`.** A new command group is one
  import and one line in `program.ts`.
- **Every command and group is a commander command under the one program.** Strictness lives in
  `program.ts` and the option parsers, so a command never checks its own arguments by hand.
- **Commands never read `process.cwd()`, `os.homedir()`, or write to stdout themselves.** They use
  the `CommandContext` they are given, so tests stay hermetic.
- **Keep it small.** A change here affects every command.
