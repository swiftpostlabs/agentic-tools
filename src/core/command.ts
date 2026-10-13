import type { ParseArgsOptionsConfig } from 'node:util';
import type { ArgsDef, Resolvable } from 'citty';
import type { Output } from './output.ts';

/**
 * Everything a command needs from its environment, injected so tests run without a real shell.
 * `cwd` already reflects `--workspace` when a command runs.
 */
export type CommandContext = {
  cwd: string;
  home: string;
  output: Output;
  setExitCode: (code: number) => void;
};

/** citty's `Resolvable`: a value, a promise of it, or a function returning either. */
export const resolveValue = async <T>(value: Resolvable<T>): Promise<T> =>
  typeof value === 'function' ? (value as () => T | Promise<T>)() : value;

/**
 * Strict `node:util` `parseArgs` options for a citty args definition, plus `-h, --help`. citty's
 * own parser is lenient (unknown options pass, a missing value takes the next flag), so the
 * program validates every level with these instead. Only one-letter aliases are supported.
 */
export const toParseArgsOptions = (args: ArgsDef): ParseArgsOptionsConfig => {
  const options: ParseArgsOptionsConfig = {
    help: { type: 'boolean', short: 'h' },
  };
  for (const [name, arg] of Object.entries(args)) {
    if (arg.type === 'positional') {
      continue;
    }
    const aliases = 'alias' in arg ? [arg.alias ?? []].flat() : [];
    const short = aliases.find((alias) => alias.length === 1);
    const shortOption = short === undefined ? {} : { short };
    options[name] =
      arg.type === 'boolean' ?
        { type: 'boolean', ...shortOption }
      : {
          type: 'string',
          ...shortOption,
          ...(typeof arg.default === 'string' ? { default: arg.default } : {}),
        };
  }
  return options;
};

/** True when `args` declares a positional argument. */
export const takesPositionals = (args: ArgsDef): boolean =>
  Object.values(args).some((arg) => arg.type === 'positional');

/**
 * Every value given for a repeatable option, such as `--exclude a --exclude=b`. The program keeps
 * only the last one in `args`; call this from `run`, where the arguments are already validated.
 */
export const repeatedOption = (
  rawArgs: readonly string[],
  name: string,
): string[] => {
  const values: string[] = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index] ?? '';
    if (token === '--') {
      break;
    }
    if (token === `--${name}`) {
      const value = rawArgs[index + 1];
      if (value !== undefined) {
        values.push(value);
      }
      index += 1;
    } else if (token.startsWith(`--${name}=`)) {
      values.push(token.slice(`--${name}=`.length));
    }
  }
  return values;
};
