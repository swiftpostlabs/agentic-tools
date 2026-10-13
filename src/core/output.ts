import { consola } from 'consola';

/** Where commands write user-facing lines. Injected so tests can capture output. */
export type Output = {
  info: (line: string) => void;
  error: (line: string) => void;
};

export const createConsoleOutput = (): Output => ({
  info: (line) => {
    consola.log(line);
  },
  error: (line) => {
    consola.error(line);
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
