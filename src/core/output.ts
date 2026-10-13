import { stripVTControlCharacters } from 'node:util';
import { consola } from 'consola';

/** Where commands write user-facing lines. Injected so tests can capture output. */
export type Output = {
  info: (line: string) => void;
  error: (line: string) => void;
};

/** citty colours usage and its own messages without checking for a terminal; pipes and logs get plain text. */
const forStream = (stream: NodeJS.WriteStream, line: string): string =>
  stream.isTTY ? line : stripVTControlCharacters(line);

export const createConsoleOutput = (): Output => ({
  info: (line) => {
    consola.log(forStream(process.stdout, line));
  },
  error: (line) => {
    consola.error(forStream(process.stderr, line));
  },
});

export type CapturedOutput = Output & { lines: string[]; errors: string[] };

export const createCapturedOutput = (): CapturedOutput => {
  const lines: string[] = [];
  const errors: string[] = [];
  return {
    lines,
    errors,
    info: (line) => lines.push(line),
    error: (line) => errors.push(line),
  };
};
