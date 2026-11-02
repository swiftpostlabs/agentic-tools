# CLI Setup

A strict, predictable setup for a Node CLI with subcommands, safe for people and for agents that
parse its output. Verified 2026-11-02 with commander 15.0.0 and consola 3.4.2 on Node 24 and Bun
1.4.3. For plain JavaScript, drop the type annotations.

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

const createProgram = () => {
  const program = new Command('my-tool')
    .exitOverride() // throw instead of exiting, so the entry point sets the code
    .enablePositionalOptions() // program options only before the subcommand
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

/** 0 for success and help, 2 for a usage error; commander has already printed the message. */
export const run = async (argv: string[]): Promise<number> => {
  try {
    await createProgram().parseAsync(argv, { from: 'user' });
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode === 0 ? 0 : 2;
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
- Treat `options` as `unknown` and validate it with zod, or use the `@commander-js/extra-typings`
  companion package for inferred types. Plain commander types options loosely.
- Handle an expected runtime failure inside the action: log it and set exit code 1.

## What commander already refuses

No configuration needed: unknown options (with a spelling suggestion), extra positionals, a missing
required positional, an option with no value, `=value` on a boolean option, and `--no-x` unless
`--no-x` is declared.

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
