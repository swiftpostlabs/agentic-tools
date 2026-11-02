import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';

const cli = path.resolve(import.meta.dirname, 'cli.mts');
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const environments = [
  {},
  { CI: '1' },
  { TEST: '1' },
  { NODE_ENV: 'test' },
  { CONSOLA_LEVEL: '0' },
];

/** The real CLI on real streams, since tests that inject an `Output` cannot see what consola drops. */
const runCli = (args: string[], environment: Record<string, string>) => {
  const { stdout, stderr, status } = spawnSync(
    process.execPath,
    [cli, ...args],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { PATH: process.env['PATH'], ...environment },
    },
  );
  return { stdout, stderr, status };
};

describe('console output', () => {
  test.each(environments)(
    'prints results to stdout under %j',
    (environment) => {
      const { stdout, stderr, status } = runCli(
        ['skills', 'list'],
        environment,
      );
      expect(stdout).toBe(runCli(['skills', 'list'], {}).stdout);
      expect(stdout).toContain('ref-sp-dev-git-commits');
      expect(stderr).toBe('');
      expect(status).toBe(0);
    },
  );

  test.each(environments)('prints errors to stderr under %j', (environment) => {
    const { stdout, stderr, status } = runCli(
      ['skills', 'list', '--bogus'],
      environment,
    );
    expect(stdout).toBe('');
    expect(stderr).toMatch(/^\[error\] unknown option '--bogus'/);
    expect(status).toBe(2);
  });
});
