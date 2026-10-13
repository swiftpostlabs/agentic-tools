# src/core

The front controller, plus what every feature shares. Nothing here holds a feature's logic.

## What it holds

- `cli.mts`: the run-only bin entry. Handles a closed stdout pipe, runs the program, and sets
  `process.exitCode`. Compiled to `dist/core/cli.mjs`, the npm `bin`, and run directly by the
  Python shim.
- `program.ts`: `runCli`, the importable program. It mounts each feature's command, resolves
  `--workspace` before any command runs, renders usage for `--help`, and maps failures to exit
  codes: `ToolError` exits 1, `UsageError` and citty's own errors exit 2.
- `command.ts`: the command contract. `CommandContext` (`cwd`, `home`, `output`, `setExitCode`)
  and `defineStrictCommand`, which refuses undeclared options because citty ignores them. Also
  `repeatedOption` for repeatable flags, since citty keeps only the last value.
- `errors.ts`: `ToolError` for expected failures, `UsageError` for malformed invocations.
- `output.ts`: the injectable `Output`, backed by consola, plus a capturing one for tests.
- `paths.ts`, `fs.ts`, `json.ts`, `frontmatter.ts`: workspace locations, filesystem checks, JSON
  and zod helpers (`parseWith`), and `SKILL.md` frontmatter parsing.
- `testFixtures.ts`: temp directories and skill fixtures for tests. Excluded from `dist/` and the
  wheel.

## Rules

- **Commands are registered here and implemented in `features/`.** A new command group is one
  import and one line in `program.ts`.
- **A runnable command uses `defineStrictCommand`**; a group that only holds sub-commands uses
  citty's `defineCommand`.
- **Commands never read `process.cwd()`, `os.homedir()`, or write to stdout themselves.** They use
  the `CommandContext` they are given, so tests stay hermetic.
- **Keep it small.** A change here affects every command.
