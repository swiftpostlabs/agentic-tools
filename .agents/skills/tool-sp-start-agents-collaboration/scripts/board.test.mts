import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createRoom,
  findBoard,
  init,
  isFor,
  listMessageFiles,
  listRooms,
  parseMessage,
  post,
  readRoom,
  resolveRoom,
  unreadLines,
  writeRoom,
} from './board.mts';

const tempDir = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), 'agent-board-'));

const boardIn = (repo: string): string =>
  path.join(repo, '.agents', 'local', 'collaboration');

const newBoard = (): string => {
  const board = boardIn(tempDir());
  init(board);
  return board;
};

const day = new Date(2026, 0, 2, 12);

describe('agent board', () => {
  test('init creates an empty board and leaves existing files alone', () => {
    const board = boardIn(tempDir());
    expect(init(board)).toHaveLength(4);
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

  test('a room is dated, lists its creator, and records its task', () => {
    const board = newBoard();
    const room = createRoom(board, 'retry-queue', 'abc123', {
      task: '2026-01-02-retry-queue',
      now: day,
    });
    expect(room.name).toBe('2026-01-02-retry-queue');
    expect(readRoom(board, room.name)).toEqual({
      name: '2026-01-02-retry-queue',
      title: 'retry queue',
      status: 'open',
      task: '2026-01-02-retry-queue',
      members: ['abc123'],
    });
    expect(() =>
      createRoom(board, 'retry-queue', 'abc123', { now: day }),
    ).toThrow('already exists');
    expect(() => createRoom(board, 'Bad Name', 'abc123')).toThrow('kebab');
  });

  test('a room is found by its full name or the part after the date', () => {
    const board = newBoard();
    createRoom(board, 'retry-queue', 'abc123', { now: day });
    createRoom(board, 'retry-ui', 'abc123', { now: day });
    expect(resolveRoom(board, 'retry-queue').name).toBe(
      '2026-01-02-retry-queue',
    );
    expect(() => resolveRoom(board, 'retry')).toThrow('several rooms');
    expect(() => resolveRoom(board, 'nothing')).toThrow('no room');
  });

  test("a post goes to its room and appears in that room's CHAT.md", () => {
    const board = newBoard();
    const { name } = createRoom(board, 'retry-queue', 'abc123', { now: day });
    const label = post(
      board,
      'acct / my session / abc123',
      'def456,all',
      'Hello there.\nSecond line.',
      {
        room: 'retry-queue',
        sent: '2026-01-02T03:04:05.678Z',
      },
    );
    expect(label).toBe(
      `rooms/${name}/messages/2026-01-02T030405678Z-abc123.md`,
    );
    const room = { kind: 'room', room: readRoom(board, name) } as const;
    expect(listMessageFiles(board, room)).toEqual([
      '2026-01-02T030405678Z-abc123.md',
    ]);
    expect(
      fs.readFileSync(path.join(board, 'rooms', name, 'CHAT.md'), 'utf8'),
    ).toContain('Hello there.');
  });

  test('posting needs an open room once the board has rooms', () => {
    const board = newBoard();
    const room = createRoom(board, 'retry-queue', 'abc123', { now: day });
    expect(() => post(board, 'a / s / abc123', 'all', 'Hi')).toThrow(
      'open rooms: 2026-01-02-retry-queue',
    );
    writeRoom(board, { ...room, status: 'closed' });
    expect(() =>
      post(board, 'a / s / abc123', 'all', 'Hi', { room: room.name }),
    ).toThrow('reopen');
  });

  test("all reaches only the room's members; a direct message reaches anyone", () => {
    const board = newBoard();
    const room = createRoom(board, 'retry-queue', 'abc123', { now: day });
    writeRoom(board, { ...room, members: ['abc123', 'def456'] });
    const since = '2026-01-01T00:00:00Z';
    post(board, 'a / s / abc123', 'all', 'To members.', {
      room: room.name,
      sent: '2026-01-02T00:00:01Z',
    });
    post(board, 'a / s / abc123', 'zzz999', 'Invite.', {
      room: room.name,
      sent: '2026-01-02T00:00:02Z',
    });
    expect(unreadLines(board, 'def456', since)).toHaveLength(1);
    expect(unreadLines(board, 'zzz999', since)[0]).toContain('Invite.');
    expect(unreadLines(board, 'abc123', since)).toEqual([]);
  });

  test('closed rooms are skipped unless named', () => {
    const board = newBoard();
    const room = createRoom(board, 'retry-queue', 'abc123', { now: day });
    post(board, 'a / s / def456', 'all', 'Hi', {
      room: room.name,
      sent: '2026-01-02T00:00:01Z',
    });
    writeRoom(board, { ...room, status: 'closed' });
    const since = '2026-01-01T00:00:00Z';
    expect(unreadLines(board, 'abc123', since)).toEqual([]);
    expect(unreadLines(board, 'abc123', since, room.name)).toHaveLength(1);
    expect(listRooms(board).map((listed) => listed.status)).toEqual(['closed']);
  });

  test('a board from before rooms keeps reading and posting its top-level messages', () => {
    const board = newBoard();
    fs.mkdirSync(path.join(board, 'messages'));
    createRoom(board, 'retry-queue', 'abc123', { now: day });
    expect(
      post(board, 'a / s / def456', 'all', 'Old style.', {
        sent: '2026-01-02T00:00:01Z',
      }),
    ).toBe('messages/2026-01-02T000001Z-def456.md');
    expect(unreadLines(board, 'zzz999', '2026-01-01T00:00:00Z')).toHaveLength(
      1,
    );
    expect(fs.existsSync(path.join(board, 'CHAT.md'))).toBe(true);
  });

  test('a message is never for its sender', () => {
    const message = parseMessage(
      'm.md',
      '---\r\nfrom: a / s / abc123\r\nto: def456\r\nsent: t\r\n---\r\n\r\nHi\r\n',
    );
    expect(isFor(message, 'def456', [])).toBe(true);
    expect(isFor(message, 'zzz999', ['zzz999'])).toBe(false);
    const broadcast = { ...message, to: ['all'] };
    expect(isFor(broadcast, 'zzz999', ['zzz999'])).toBe(true);
    expect(isFor(broadcast, 'zzz999', [])).toBe(false);
    expect(isFor(broadcast, 'zzz999')).toBe(true);
    expect(isFor(broadcast, 'abc123', ['abc123'])).toBe(false);
  });
});
