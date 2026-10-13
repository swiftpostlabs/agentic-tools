import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildRows } from './find-sessions.mts';

const writeTranscript = (
  root: string,
  id: string,
  lines: object[],
  ageMs: number,
): void => {
  const dir = path.join(root, '-home-me-my-project');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.jsonl`);
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n'));
  const time = new Date(Date.now() - ageMs);
  fs.utimesSync(file, time, time);
};

describe('buildRows', () => {
  test('restores the user-set name and keeps only the live copy', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'find-sessions-'));
    const named = [
      { cwd: '/home/me/my-project' },
      { type: 'custom-title', customTitle: 'my: task' },
      { type: 'ai-title', aiTitle: 'auto name' },
    ];
    writeTranscript(root, 'aaaaaaaa-old', named, 1_000);
    writeTranscript(root, 'bbbbbbbb-live', named, 60_000);
    const rows = buildRows(root, 1, [
      { pid: 1, id: 'bbbbbbbb', sessionId: 'bbbbbbbb-live', name: 'auto name' },
    ]);
    const live = rows.find((r) => r.sessionId === 'bbbbbbbb-live');
    const old = rows.find((r) => r.sessionId === 'aaaaaaaa-old');
    expect(live).toMatchObject({
      properName: 'my: task',
      shownName: 'auto name',
      live: true,
      copy: 'keep',
    });
    expect(old).toMatchObject({ live: false, copy: 'older-copy' });
    expect(old?.resume).toContain("cd '/home/me/my-project'");
  });
});
