import { InvalidArgumentError } from 'commander';
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

/** Refuses `--to --dry-run`, which commander would otherwise read as a destination named `--dry-run`. */
export const value = (raw: string): string => {
  if (raw.startsWith('-') && raw !== '-') {
    throw new InvalidArgumentError('Expected a value, got a flag.');
  }
  return raw;
};

/** For a repeatable option, of which commander would otherwise keep only the last value. */
export const collect = (raw: string, previous: string[] = []): string[] => [
  ...previous,
  value(raw),
];
