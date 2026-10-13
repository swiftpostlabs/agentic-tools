# src/core

The front controller, plus what every feature shares. Nothing here holds a feature's logic.

## What it holds

- `cli.mts`: the run-only bin entry. Handles a closed stdout pipe, runs the program, and sets
  `process.exitCode`. Compiled to `dist/core/cli.mjs`, the npm `bin`, and run directly by the
  Python shim.
- `program.ts`: `runCli`, the importable program and the front controller. It mounts each
  feature's command, then walks root, group, and command itself, validating each level with
  strict `node:util` `parseArgs`: `--workspace` only before the group, each command's options
  after its name. Only then does it resolve the workspace and call the command's `run`. citty's
  own parser is lenient (unknown options pass, a missing value takes the next flag), so citty
  supplies the command definitions and usage text, never the parsing. Exit codes: 0 success;
  1 for a `ToolError` or a group run without a command; 2 for any usage error.
- `command.ts`: the command contract. `CommandContext` (`cwd`, `home`, `output`, `setExitCode`),
  `toParseArgsOptions` (a citty args definition as strict `parseArgs` options; one-letter aliases
  only), and `repeatedOption` for repeatable flags, whose `args` value holds only the last one.
- `errors.ts`: `ToolError`, an expected failure the CLI reports by message alone.
- `output.ts`: the injectable `Output`, backed by consola, plus a capturing one for tests.
- `paths.ts`, `fs.ts`, `json.ts`, `frontmatter.ts`: workspace locations, filesystem checks, JSON
  and zod helpers (`parseWith`), and `SKILL.md` frontmatter parsing.
- `testFixtures.ts`: temp directories and skill fixtures for tests. Excluded from `dist/` and the
  wheel.

## Rules

- **Commands are registered here and implemented in `features/`.** A new command group is one
  import and one line in `program.ts`.
- **Every command and group is citty's `defineCommand`.** Strictness lives in `program.ts`, so a
  command never parses or checks its own arguments.
- **Commands never read `process.cwd()`, `os.homedir()`, or write to stdout themselves.** They use
  the `CommandContext` they are given, so tests stay hermetic.
- **Keep it small.** A change here affects every command.
