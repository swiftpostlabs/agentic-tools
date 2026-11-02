import { stripVTControlCharacters } from 'node:util';
import { createConsola } from 'consola';

/**
 * Where commands write user-facing lines. Injected so tests can capture output. `info` is a command's
 * result, for stdout; `warn` and `error` are diagnostics, for stderr.
 */
export type Output = {
  info: (line: string) => void;
  warn: (line: string) => void;
  error: (line: string) => void;
};

/** citty colours usage and its own messages without checking for a terminal; pipes and logs get plain text. */
const forStream = (stream: NodeJS.WriteStream, line: string): string =>
  stream.isTTY ? line : stripVTControlCharacters(line);

export const createConsoleOutput = (): Output => {
  // Every setting is explicit, so CI, TEST, NODE_ENV, and CONSOLA_LEVEL cannot change or drop a line.
  const diagnostics = createConsola({
    fancy: false,
    stdout: process.stderr,
    stderr: process.stderr,
    level: 3,
    throttle: 0,
  });
  return {
    info: (line) => {
      process.stdout.write(`${forStream(process.stdout, line)}\n`);
    },
    warn: (line) => {
      diagnostics.warn(forStream(process.stderr, line));
    },
    error: (line) => {
      diagnostics.error(forStream(process.stderr, line));
    },
  };
};

export type CapturedOutput = Output & {
  lines: string[];
  warnings: string[];
  errors: string[];
};

export const createCapturedOutput = (): CapturedOutput => {
  const lines: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  return {
    lines,
    warnings,
    errors,
    info: (line) => lines.push(line),
    warn: (line) => warnings.push(line),
    error: (line) => errors.push(line),
  };
};
