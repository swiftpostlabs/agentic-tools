# CLI Setup

A strict, predictable setup for a Node CLI with subcommands, safe for people and for agents that
parse its output. Verified 2026-11-02 with commander 15.0.0 and consola 3.4.2 on Node 24 and Bun
1.4.3. For plain JavaScript, drop the type annotations.

Contents: Output, Arguments, What commander already refuses, What commander still accepts, Why not
the alternatives.

## Output

Command results go to stdout. Everything else, including errors and debug lines, goes to stderr, so
`--debug` never corrupts output that is piped or parsed.

```ts
import { createConsola } from 'consola';

export const createLogger = (debug: boolean) =>
  createConsola({
    fancy: false, // plain `[error] message` lines, the same in every environment
    stdout: process.stderr, // consola sends info and debug to stdout by default
    stderr: process.stderr,
    level: debug ? 4 : 3, // explicit, so NODE_ENV, TEST, and CONSOLA_LEVEL cannot change it
    throttle: 0, // never collapse repeated lines
  });

// Results never go through consola.
process.stdout.write(`${result}\n`);
```

- Log `error.message`, not the `Error` object. The object prints a stack trace, which shows internal
  paths and differs between runtimes. Keep the stack for `--debug`.
- A multi-line message gets the `[error]` prefix on its first line only.

## Arguments

```ts
import { Command, CommanderError, InvalidArgumentError } from 'commander';

// Refuses `--to --dry-run`, which would otherwise take the flag as the destination.
const value = (raw: string): string => {
  if (raw.startsWith('-') && raw !== '-') {
    throw new InvalidArgumentError('expected a value, got a flag.');
  }
  return raw;
};

const collect = (raw: string, previous: string[] = []): string[] => [
  ...previous,
  value(raw),
];

// Commander reads `-to` as `-t` with the value `o`. A letter that takes a value must end its group,
// with the value as the next argument; `-fg` and `-gt out` stay valid.
const refuseAttachedValues =
  (argv: string[]) => (_program: Command, action: Command) => {
    const options = [];
    for (let command: Command | null = action; command; command = command.parent) {
      options.push(...command.options);
    }
    const end = argv.indexOf('--');
    for (const token of end === -1 ? argv : argv.slice(0, end)) {
      if (!/^-[^-]./.test(token)) {
        continue;
      }
      const letters = token.slice(1, -1);
      const attached = options.find(
        (option) =>
          option.short !== undefined &&
          letters.includes(option.short.slice(1)) &&
          (option.required || option.optional),
      );
      if (attached !== undefined) {
        action.error(
          `error: '${token}': ${attached.short} takes a value, so pass it separately or use ${attached.long}=value.`,
          { exitCode: 2, code: 'attachedValue' },
        );
      }
    }
  };

const createProgram = (argv: string[]) => {
  const program = new Command('my-tool')
    .exitOverride() // throw instead of exiting, so the entry point sets the code
    .enablePositionalOptions() // program options only before the subcommand
    .hook('preAction', refuseAttachedValues(argv))
    .option('--debug', 'show debug output');
  program
    .command('copy <name>')
    .option('--to <path>', 'destination', value)
    .option('--exclude <name>', 'skip this name, repeatable', collect)
    .option('--dry-run', 'report without writing')
    .action((name: string, options: unknown) => {
      // Validate `options`, then call the feature.
    });
  return program;
};

/** 0 for success and help, 1 for a group without a command, 2 for a usage error; commander prints its own messages. */
export const run = async (argv: string[]): Promise<number> => {
  try {
    await createProgram(argv).parseAsync(argv, { from: 'user' });
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.exitCode === 0) {
        return 0;
      }
      // A group without a command prints its help and fails, which is not a malformed line.
      return error.code === 'commander.help' ? 1 : 2;
    }
    throw error;
  }
};
```

- Create subcommands from `program.command(...)` after `.exitOverride()`, so they inherit it.
- Pass `value` to every option that takes a value, and `collect` to repeatable ones. Commander does
  neither by default: a required value takes the next token even if it starts with `-`, and a
  repeated option keeps only the last value.
- Leave `value` off an option that legitimately takes values starting with `-`, such as negative
  numbers. It also refuses the `--to=--x` form. `-` alone stays allowed, for stdin or stdout.
- Define every option as `-x, --full-name` or `--full-name`. Commander refuses `-to` as a definition
  but accepts `--t`, so a one-letter long name is yours to avoid.
- `refuseAttachedValues` keeps standard grouping (`-fg`, `-gt out`) and refuses only a value-taking
  letter with something after it (`-to`, `-tout`, `-tg`). Attached values are legal in POSIX and
  common in tools like `gcc -lm`, but here `-to` is far more likely a typo for `--to`. A negative
  number needs `--count=-10` on an option without `value`, or `--` before a positional.
- Treat `options` as `unknown` and validate it with zod, or use the `@commander-js/extra-typings`
  companion package for inferred types. Plain commander types options loosely.
- Handle an expected runtime failure inside the action: log it and set exit code 1.

For a single-command script on `parseArgs`, pass `tokens: true` and refuse any token with
`kind === 'option'`, `inlineValue === true`, and a `rawName` not starting with `--`. Its error for an
unknown letter inside a group differs between runtimes (`-x` on Node, `x` on Bun); the failure itself
does not.

## What commander already refuses

No configuration needed: unknown options (with a spelling suggestion), including `-help` and `--h`,
extra positionals, a missing required positional, an option with no value, `=value` on a boolean
option, and `--no-x` unless `--no-x` is declared. `-h, --help` is built in.

## What commander still accepts

Checked on commander 15.0.0 on Node, 2026-11-04. Refuse these yourself if the CLI promises exit 2 for
any usage error:

- **Help beside a mistake.** `copy --bogus --help` and `copy extra --help` show help and exit 0,
  because help is checked before unknown options and extra positionals. `preAction` hooks do not run
  on help, so `refuseAttachedValues` misses `-to --help` too. Walk the levels before the real parse
  with `command.parseOptions(tokens)`, on a separate program because it records option values. After
  an unknown option, everything lands in `unknown`, including the group and command names, so
  `--help copy` has `copy` there and must stay valid.
- **A command after `--`.** `-- copy x` runs `copy` rather than refusing it. In the same walk, parse
  only the tokens before `--`, and refuse when a group level has a `--` and no command before it.
- **A `help` subcommand on a group.** `.helpCommand(false)` on the root does not reach groups, so
  `group help` still prints help. Call it on each group as well.

## Why not the alternatives

- **citty:** its parser hardcodes `strict: false`, so unknown options pass silently, a missing value
  becomes an empty string, repeated options keep the last value, and `--no-x` applies to any option.
  None of this can be configured.
- **consola's default instance:** it chooses its style from CI and test detection, not from whether
  output is a terminal, and it drops `log` and `info` lines when `NODE_ENV=test`, `TEST`, or a low
  `CONSOLA_LEVEL` is set, while the command still exits 0.
- **`debug`, pino, winston, signale:** `debug` covers only debug lines and is driven by an
  environment variable; pino and winston are structured loggers for services; signale's last release
  was in 2019.
