import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  findBoard,
  init,
  isFor,
  listMessageFiles,
  parseMessage,
  post,
  readMessage,
} from './board.mts';

const tempDir = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), 'agent-board-'));

const boardIn = (repo: string): string =>
  path.join(repo, '.agents', 'local', 'collaboration');

describe('agent board', () => {
  test('init creates an empty board and leaves existing files alone', () => {
    const board = boardIn(tempDir());
    expect(init(board)).toHaveLength(5);
    fs.writeFileSync(path.join(board, 'AGENTS.md'), 'local rules\n');
    expect(init(board)).toEqual([]);
    expect(fs.readFileSync(path.join(board, 'AGENTS.md'), 'utf8')).toBe(
      'local rules\n',
    );
  });

  test('the board is found from any folder below the repo root', () => {
    const repo = tempDir();
    expect(findBoard(repo)).toBeUndefined();
    init(boardIn(repo));
    const nested = path.join(repo, 'src', 'deep');
    fs.mkdirSync(nested, { recursive: true });
    expect(findBoard(nested)).toBe(boardIn(repo));
  });

  test('a posted message reads back and appears in CHAT.md', () => {
    const board = boardIn(tempDir());
    init(board);
    const file = post(
      board,
      'acct / my session / abc123',
      'def456,all',
      'Hello there.\nSecond line.',
      '2026-01-02T03:04:05.678Z',
    );
    expect(file).toBe('2026-01-02T030405678Z-abc123.md');
    expect(listMessageFiles(board)).toEqual([file]);
    expect(readMessage(board, file)).toEqual({
      file,
      from: 'acct / my session / abc123',
      to: ['def456', 'all'],
      sent: '2026-01-02T03:04:05.678Z',
      body: 'Hello there.\nSecond line.',
    });
    expect(fs.readFileSync(path.join(board, 'CHAT.md'), 'utf8')).toContain(
      'Hello there.',
    );
  });

  test('a message is for its recipients and all, never for its sender', () => {
    const message = parseMessage(
      'm.md',
      '---\r\nfrom: a / s / abc123\r\nto: def456\r\nsent: t\r\n---\r\n\r\nHi\r\n',
    );
    expect(isFor(message, 'def456')).toBe(true);
    expect(isFor(message, 'zzz999')).toBe(false);
    const broadcast = { ...message, to: ['all'] };
    expect(isFor(broadcast, 'zzz999')).toBe(true);
    expect(isFor(broadcast, 'abc123')).toBe(false);
  });
});
