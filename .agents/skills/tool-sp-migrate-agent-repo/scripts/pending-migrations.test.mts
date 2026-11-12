import { describe, expect, test } from '@jest/globals';
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
});
