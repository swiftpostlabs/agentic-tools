import { describe, expect, test } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  listMigrations,
  pendingMigrations,
  readRecord,
} from './pending-migrations.mts';

const tempDir = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), 'pending-migrations-'));

describe('pending migrations', () => {
  test('lists numbered migrations oldest first, titled by their heading', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, '0002-b.md'), '# 0002: Second\n');
    fs.writeFileSync(path.join(dir, '0001-a.md'), '# 0001: First\n');
    fs.writeFileSync(path.join(dir, 'notes.md'), '# Not a migration\n');
    expect(listMigrations(dir)).toEqual([
      { number: '0001', title: '0001: First', file: '0001-a.md' },
      { number: '0002', title: '0002: Second', file: '0002-b.md' },
    ]);
  });

  test('everything is pending without a record, and nothing at or below it', () => {
    const migrations = [
      { number: '0001', title: 'a', file: 'a' },
      { number: '0002', title: 'b', file: 'b' },
    ];
    expect(pendingMigrations(migrations, undefined)).toHaveLength(2);
    expect(
      pendingMigrations(migrations, { applied: '0001', at: 'now' }),
    ).toEqual([{ number: '0002', title: 'b', file: 'b' }]);
  });

  test('a malformed record is refused, a missing one is undefined', () => {
    const repo = tempDir();
    expect(readRecord(repo)).toBeUndefined();
    fs.mkdirSync(path.join(repo, '.agents', 'local'), { recursive: true });
    fs.writeFileSync(
      path.join(repo, '.agents', 'local', 'migrations.json'),
      '{"applied": 1}',
    );
    expect(() => readRecord(repo)).toThrow('must hold');
  });

  test('the skill ships migration 0001', () => {
    expect(listMigrations()[0]?.number).toBe('0001');
  });

  test("reads an early record with one note as that migration's note", () => {
    const repo = tempDir();
    fs.mkdirSync(path.join(repo, '.agents', 'local'), { recursive: true });
    fs.writeFileSync(
      path.join(repo, '.agents', 'local', 'migrations.json'),
      '{"applied": "0001", "at": "now", "note": "links-left"}',
    );
    expect(readRecord(repo)?.notes).toEqual({ '0001': 'links-left' });
  });
});

describe('the pending-migrations command', () => {
  const script = path.join(import.meta.dirname, 'pending-migrations.mts');
  const run = (repo: string, ...args: string[]) =>
    spawnSync(process.execPath, [script, '--repo', repo, ...args], {
      encoding: 'utf8',
    });
  const repoWithAgents = () => {
    const repo = tempDir();
    fs.mkdirSync(path.join(repo, '.agents'));
    return repo;
  };

  test('records only the next pending migration', () => {
    const repo = repoWithAgents();
    const skipped = run(repo, '--record', '0002');
    expect(skipped.status).toBe(2);
    expect(skipped.stderr).toBe(
      'the next migration to record is 0001, not 0002\n',
    );
    expect(run(repo, '--record', '0001').status).toBe(0);
  });

  test('keeps an earlier note when a later migration is recorded', () => {
    const repo = repoWithAgents();
    run(repo, '--record', '0001', '--note', 'links-left');
    run(repo, '--record', '0002');
    expect(readRecord(repo)).toMatchObject({
      applied: '0002',
      notes: { '0001': 'links-left' },
    });
  });

  test('refuses a corrupt record and an .agents that is not a folder', () => {
    const repo = repoWithAgents();
    fs.mkdirSync(path.join(repo, '.agents', 'local'));
    fs.writeFileSync(
      path.join(repo, '.agents', 'local', 'migrations.json'),
      '{',
    );
    const corrupt = run(repo);
    expect(corrupt.status).toBe(2);
    expect(corrupt.stderr).toContain(
      'cannot be read as JSON; fix or delete it.',
    );
    const file = tempDir();
    fs.writeFileSync(path.join(file, '.agents'), '');
    expect(run(file, '--record', '0001').status).toBe(2);
  });
});
