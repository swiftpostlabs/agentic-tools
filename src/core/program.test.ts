import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { repeatedOption } from './command.ts';
import { createCapturedOutput } from './output.ts';
import { runCli } from './program.ts';
import { makeTempDir, writeJson, writeSkill } from './testFixtures.ts';

const run = async (argv: string[], cwd = makeTempDir()) => {
  const output = createCapturedOutput();
  const code = await runCli(argv, { cwd, home: makeTempDir(), output });
  return { code, output };
};

describe('runCli', () => {
  test('prints usage and exits 1 without a command, 0 when asked', async () => {
    expect((await run([])).code).toBe(1);
    const { code, output } = await run(['--help']);
    expect(code).toBe(0);
    expect(output.lines[0]).toContain('agentic-tools');
    expect(output.lines[0]).toContain('--workspace');
  });

  test("prints a group's usage without a subcommand", async () => {
    const { code, output } = await run(['policy']);
    expect(code).toBe(1);
    expect(output.errors[0]).toContain('import-vscode');
  });

  test("prints a command's usage under its full name", async () => {
    const { code, output } = await run(['skills', 'link', '--help']);
    expect(code).toBe(0);
    expect(output.lines[0]).toContain('agentic-tools skills link');
    expect(output.lines[0]).toContain('--dry-run');
  });

  test('rejects unknown groups, commands, and options as usage errors', async () => {
    expect((await run(['nope'])).code).toBe(2);
    expect((await run(['skills', 'nope'])).code).toBe(2);
    const bogus = await run(['skills', 'list', '--bogus']);
    expect(bogus.code).toBe(2);
    expect(bogus.output.errors[0]).toContain("Unknown option '--bogus'");
    expect((await run(['skills', 'link'])).code).toBe(2);
  });

  test('runs a command from --workspace', async () => {
    const workspace = makeTempDir();
    writeSkill(path.join(workspace, '.agents', 'skills'), 'ref-x', {
      domain: 'dev',
      visibility: 'public',
    });
    const { code, output } = await run([
      '--workspace',
      workspace,
      'skills',
      'list',
    ]);
    expect(code).toBe(0);
    expect(output.lines).toEqual([
      'ref-x: domain dev; visibility public; requires -',
    ]);
  });

  test('dispatches policy sync and turns expected failures into exit 1', async () => {
    const workspace = makeTempDir();
    writeJson(path.join(workspace, '.agents', 'config.json'), {
      policy: { services: ['claude'], protectedFiles: ['.env'] },
    });
    expect((await run(['policy', 'sync'], workspace)).code).toBe(0);
    expect(
      fs.existsSync(path.join(workspace, '.claude', 'settings.json')),
    ).toBe(true);
    writeJson(path.join(workspace, '.agents', 'config.json'), {
      policy: { services: ['cursor'] },
    });
    const failed = await run(['policy', 'check'], workspace);
    expect(failed.code).toBe(1);
    expect(failed.output.errors[0]).toContain(
      "Unsupported policy service 'cursor'",
    );
  });

  test('a missing workspace is an error', async () => {
    expect(
      (await run(['-w', '/definitely/missing', 'skills', 'list'])).code,
    ).toBe(1);
  });

  test('collects repeated options', async () => {
    const workspace = makeTempDir();
    const skills = path.join(workspace, '.agents', 'skills');
    writeSkill(skills, 'ref-a', { domain: 'dev', visibility: 'public' });
    writeSkill(skills, 'ref-b', { domain: 'dev', visibility: 'public' });
    writeSkill(skills, 'ref-c', { domain: 'dev', visibility: 'public' });
    const { output } = await run(
      ['export', 'build', '--dry-run', '--exclude', 'ref-a', '--exclude=ref-b'],
      workspace,
    );
    expect(output.lines[0]).toContain('Selected 1 skills');
  });

  test('passes every positional to a variadic command', async () => {
    const source = makeTempDir();
    const skills = path.join(source, '.agents', 'skills');
    writeSkill(skills, 'ref-a', { domain: 'dev', visibility: 'public' });
    writeSkill(skills, 'ref-b', { domain: 'dev', visibility: 'public' });
    const destination = makeTempDir();
    const { code } = await run([
      'skills',
      'link',
      'ref-a',
      'ref-b',
      '--from',
      source,
      '--to',
      destination,
    ]);
    expect(code).toBe(0);
    expect(
      fs.readdirSync(path.join(destination, '.agents', 'skills')).sort(),
    ).toEqual(['ref-a', 'ref-b']);
  });
});

describe('runCli argument validation', () => {
  // Each case was a regression found by review: the pre-citty CLI refused it (exit 2) or accepted
  // it (exit 0), and so must this one. Run in an empty workspace, so nothing is written.
  const cases: readonly (readonly [string, readonly string[], number])[] = [
    ['a string option missing its value', ['skills', 'list', '--from'], 2],
    [
      'a string option followed by a flag',
      ['export', 'build', '--exclude', '--dry-run'],
      2,
    ],
    ['a negated string option', ['skills', 'list', '--no-from'], 2],
    ['a negated boolean', ['skills', 'sync', '--no-force'], 2],
    ['a value on a boolean', ['skills', 'sync', '--force=false'], 2],
    ['an unknown option before the group', ['--bogus', 'skills', 'list'], 2],
    ['an unknown option after the group', ['skills', '--bogus', 'list'], 2],
    ['a negated root option', ['--no-workspace', 'skills', 'list'], 2],
    [
      'the workspace option after the command',
      ['skills', 'list', '-w', '.'],
      2,
    ],
    ['a workspace option missing its value', ['-w'], 2],
    ['an unexpected positional', ['skills', 'list', 'extra'], 2],
    ['a positional after --', ['skills', 'list', '--', '--bogus'], 2],
    ['help with an unknown option', ['skills', 'list', '--bogus', '--help'], 2],
    ['a value on help', ['skills', 'list', '--help=1'], 2],
    ['-- before the group', ['--', 'skills', 'list'], 2],
    ['an attached short value', ['skills', 'list', '-f.'], 0],
    ['help before the group', ['--help', 'skills', 'list'], 0],
  ];

  test.each(cases)('%s', async (_label, argv, expected) => {
    const workspace = makeTempDir();
    fs.mkdirSync(path.join(workspace, '.agents', 'skills'), {
      recursive: true,
    });
    const { code } = await run([...argv], workspace);
    expect(code).toBe(expected);
    expect(fs.readdirSync(workspace)).toEqual(['.agents']);
  });

  test('combined short flags reach the command', async () => {
    const source = makeTempDir();
    writeSkill(path.join(source, '.agents', 'skills'), 'ref-a', {
      domain: 'dev',
      visibility: 'public',
    });
    const destination = makeTempDir();
    const { code, output } = await run([
      'skills',
      'link',
      'ref-a',
      '-f',
      source,
      '-t' + destination,
      '--dry-run',
    ]);
    expect(code).toBe(0);
    expect(output.lines[0]).toContain('Would link');
  });
});

describe('repeatedOption', () => {
  test('collects spaced and inline values', () => {
    expect(
      repeatedOption(
        ['--exclude', 'a', '--exclude=b', '--', '--exclude', 'c'],
        'exclude',
      ),
    ).toEqual(['a', 'b']);
  });
});
