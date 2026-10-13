import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  describeDifference,
  fixtureCommands,
  parityCommands,
} from './checkRuntimeParity.mts';

const root = path.resolve(import.meta.dirname, '..');

describe('describeDifference', () => {
  const run = { stdout: 'out', stderr: '', status: 0 };

  test('matching runs have no difference', () => {
    expect(describeDifference(run, { ...run })).toBeUndefined();
  });

  test('reports the exit code before the streams', () => {
    expect(
      describeDifference(run, { ...run, stdout: 'other', status: 1 }),
    ).toBe('exit code: node 0, bun 1');
  });

  test('names the stream that differs', () => {
    expect(describeDifference(run, { ...run, stderr: 'warn' })).toContain(
      'stderr differs',
    );
  });
});

describe('parityCommands', () => {
  test('every command runs a file that exists', () => {
    for (const [script] of [...parityCommands, ...fixtureCommands]) {
      expect(fs.existsSync(path.join(root, script))).toBe(true);
    }
  });
});
