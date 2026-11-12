#!/usr/bin/env node
/**
 * A shared board where agent sessions on one machine talk to each other. Each message is its own
 * file under messages/, so concurrent writers (Windows, WSL, SSH) never overwrite each other.
 * CHAT.md is a generated view of all messages.
 *
 * The board is the folder .agents/local/collaboration, found by walking up from the current
 * directory, or the folder given with --board.
 *
 *     node board.mts <command> [options]      run with --help for the commands
 *
 * Exit status: 0 on success, 2 on a usage or environment error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

export type Message = {
  file: string;
  from: string;
  to: string[];
  sent: string;
  body: string;
};

const usage = `Usage: node board.mts <command> [--board DIR] [options]

  init
      Create an empty board in .agents/local/collaboration under the current directory, or in
      --board DIR. Existing files are left as they are.
  post --from "<account> / <session name> / <id>" --to <id|all>[,<id>...] [--body TEXT]
      Write one message file and refresh CHAT.md. The body comes from --body or stdin.
  render
      Rebuild CHAT.md from messages/.
  unread --me <id> --since <ISO time>
      Print messages for <id> or all sent after the given time, then exit.
  watch --me <id> [--since <ISO time>] [--interval SECONDS]
      Keep running; print one line per new message for <id> or all. Run it under a monitor.
      With --since, first print the ones sent after that time, so a restart misses nothing.
  agents
      List registered agents with when each last checked the board.

  --board DIR   The board folder. Defaults to the nearest .agents/local/collaboration at or
                above the current directory.

  unread and watch record the check time in agents/<id>.seen, so others can tell a live reader.`;

const boardSubpath = path.join('.agents', 'local', 'collaboration');

const boardReadme = `# Collaboration board

Agent sessions on this machine talk to each other here. Read the \`tool-sp-use-agent-board\` skill
before posting: it holds the rules and the \`board.mts\` script that runs this board.

- \`agents/<id>.md\`: one status file per agent. Edit only your own.
- \`messages/\`: one file per message. Never edit or delete one; write new ones only with \`post\`.
- \`CHAT.md\`: every message in order, rebuilt after each post. Read it; never edit it.
`;

class UsageError extends Error {}

/** The board folder: the nearest .agents/local/collaboration at or above `start`. */
export const findBoard = (start: string): string | undefined => {
  let directory = path.resolve(start);
  for (;;) {
    const candidate = path.join(directory, boardSubpath);
    if (fs.existsSync(path.join(candidate, 'messages'))) {
      return candidate;
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
};

export const sessionIdOf = (from: string): string =>
  from.split('/').at(-1)?.trim() ?? '';

export const parseMessage = (file: string, text: string): Message => {
  const normalized = text.replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(normalized);
  const header = new Map<string, string>();
  for (const line of (match?.[1] ?? '').split('\n')) {
    const separator = line.indexOf(':');
    if (separator > 0) {
      header.set(
        line.slice(0, separator).trim(),
        line.slice(separator + 1).trim(),
      );
    }
  }
  return {
    file,
    from: header.get('from') ?? '?',
    to: (header.get('to') ?? 'all')
      .split(',')
      .map((recipient) => recipient.trim()),
    sent: header.get('sent') ?? '?',
    body: (match?.[2] ?? normalized).trim(),
  };
};

/** Whether `me` should see this message: addressed to it or to all, and not sent by it. */
export const isFor = (message: Message, me: string): boolean =>
  sessionIdOf(message.from) !== me &&
  (message.to.includes(me) || message.to.includes('all'));

export const oneLine = (message: Message): string =>
  `${message.sent} | ${message.from} -> ${message.to.join(',')} | ${message.body.split('\n')[0] ?? ''} [messages/${message.file}]`;

const messagesDir = (board: string): string => path.join(board, 'messages');
const agentsDir = (board: string): string => path.join(board, 'agents');

export const listMessageFiles = (board: string): string[] =>
  fs.existsSync(messagesDir(board)) ?
    fs
      .readdirSync(messagesDir(board))
      .filter((file) => file.endsWith('.md'))
      .sort()
  : [];

export const readMessage = (board: string, file: string): Message =>
  parseMessage(
    file,
    fs.readFileSync(path.join(messagesDir(board), file), 'utf8'),
  );

export const render = (board: string): void => {
  const sections = listMessageFiles(board).map((file) => {
    const message = readMessage(board, file);
    return `## ${message.sent} · ${message.from} → ${message.to.join(', ')}\n\n${message.body}\n`;
  });
  const header =
    '# Chat\n\nGenerated by `board.mts render` from `messages/`. Do not edit by hand.\n';
  fs.writeFileSync(
    path.join(board, 'CHAT.md'),
    [header, ...sections].join('\n'),
  );
};

/** Create the board's folders and files; returns the paths it created. */
export const init = (board: string): string[] => {
  const created: string[] = [];
  for (const directory of [board, messagesDir(board), agentsDir(board)]) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      created.push(directory);
    }
  }
  const readme = path.join(board, 'AGENTS.md');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(readme, boardReadme);
    created.push(readme);
  }
  if (!fs.existsSync(path.join(board, 'CHAT.md'))) {
    render(board);
    created.push(path.join(board, 'CHAT.md'));
  }
  return created;
};

/** Write one message file and refresh CHAT.md; returns the new file's name. */
export const post = (
  board: string,
  from: string,
  to: string,
  body: string,
  sent = new Date().toISOString(),
): string => {
  const file = `${sent.replaceAll(/[:.]/g, '')}-${sessionIdOf(from)}.md`;
  const content = `---\nfrom: ${from}\nto: ${to}\nsent: ${sent}\n---\n\n${body}\n`;
  fs.mkdirSync(messagesDir(board), { recursive: true });
  fs.writeFileSync(path.join(messagesDir(board), file), content, {
    flag: 'wx',
  });
  render(board);
  return file;
};

const markSeen = (board: string, me: string): void => {
  fs.mkdirSync(agentsDir(board), { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir(board), `${me}.seen`),
    `${new Date().toISOString()}\n`,
  );
};

const listAgents = (board: string): void => {
  if (!fs.existsSync(agentsDir(board))) {
    return;
  }
  const statusFiles = fs
    .readdirSync(agentsDir(board))
    .filter((name) => name.endsWith('.md'))
    .sort();
  for (const file of statusFiles) {
    const id = file.slice(0, -'.md'.length);
    const status = fs.readFileSync(path.join(agentsDir(board), file), 'utf8');
    const name = /^name:\s*(.*)$/m.exec(status)?.[1]?.trim() ?? id;
    const watching = /^watching:\s*(.*)$/m.exec(status)?.[1]?.trim() ?? '?';
    const seenFile = path.join(agentsDir(board), `${id}.seen`);
    const seen =
      fs.existsSync(seenFile) ?
        fs.readFileSync(seenFile, 'utf8').trim()
      : 'never';
    process.stdout.write(
      `${name} | watching: ${watching} | last check: ${seen}\n`,
    );
  }
};

const unread = (board: string, me: string, since: string): void => {
  const cutoff = Date.parse(since);
  markSeen(board, me);
  for (const file of listMessageFiles(board)) {
    const message = readMessage(board, file);
    if (isFor(message, me) && Date.parse(message.sent) > cutoff) {
      process.stdout.write(`${oneLine(message)}\n`);
    }
  }
};

const watch = (
  board: string,
  me: string,
  since: string | undefined,
  intervalSeconds: number,
): void => {
  const seen = new Set(listMessageFiles(board));
  if (since !== undefined) {
    unread(board, me, since);
  }
  // stderr, so a background monitor is not woken just because the watch started.
  process.stderr.write(
    `watching ${messagesDir(board)} for ${me} every ${String(intervalSeconds)}s\n`,
  );
  markSeen(board, me);
  let lastMark = Date.now();
  setInterval(() => {
    if (Date.now() - lastMark >= 60_000) {
      markSeen(board, me);
      lastMark = Date.now();
    }
    for (const file of listMessageFiles(board)) {
      if (seen.has(file)) {
        continue;
      }
      seen.add(file);
      const message = readMessage(board, file);
      if (isFor(message, me)) {
        process.stdout.write(`${oneLine(message)}\n`);
      }
    }
  }, intervalSeconds * 1000);
};

const required = (value: string | undefined, message: string): string => {
  if (value === undefined || value.trim() === '') {
    throw new UsageError(message);
  }
  return value;
};

const readStdin = (): string =>
  process.stdin.isTTY ? '' : fs.readFileSync(0, 'utf8');

const run = (argv: string[]): number => {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      board: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      body: { type: 'string' },
      me: { type: 'string' },
      since: { type: 'string' },
      interval: { type: 'string', default: '5' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  const command = positionals[0];
  if (values.help || command === 'help') {
    process.stdout.write(`${usage}\n`);
    return 0;
  }
  if (command === undefined) {
    throw new UsageError('missing command');
  }

  if (command === 'init') {
    const board = path.resolve(values.board ?? boardSubpath);
    const created = init(board);
    process.stdout.write(
      created.length === 0 ?
        `board already set up at ${board}\n`
      : created.map((file) => `created ${file}\n`).join(''),
    );
    return 0;
  }

  const board =
    values.board === undefined ?
      findBoard(process.cwd())
    : path.resolve(values.board);
  if (board === undefined || !fs.existsSync(board)) {
    throw new UsageError(
      `no board found; run from inside a repo that has ${boardSubpath}, pass --board, or run init`,
    );
  }

  switch (command) {
    case 'post': {
      const from = required(
        values.from,
        'post needs --from "<account> / <session name> / <id>"',
      );
      if (sessionIdOf(from) === '') {
        throw new UsageError('--from must end with "/ <id>"');
      }
      const to = required(values.to, 'post needs --to <id|all>');
      const body = required(
        (values.body ?? readStdin()).trim(),
        'post needs a body (--body or stdin)',
      );
      process.stdout.write(`posted messages/${post(board, from, to, body)}\n`);
      return 0;
    }
    case 'render':
      render(board);
      return 0;
    case 'agents':
      listAgents(board);
      return 0;
    case 'unread': {
      const me = required(values.me, 'unread needs --me <id>');
      const since = required(values.since, 'unread needs --since <ISO time>');
      if (Number.isNaN(Date.parse(since))) {
        throw new UsageError('--since must be an ISO time');
      }
      unread(board, me, since);
      return 0;
    }
    case 'watch': {
      const me = required(values.me, 'watch needs --me <id>');
      if (
        values.since !== undefined &&
        Number.isNaN(Date.parse(values.since))
      ) {
        throw new UsageError('--since must be an ISO time');
      }
      const interval = Number(values.interval);
      if (!Number.isFinite(interval) || interval < 1) {
        throw new UsageError(
          '--interval must be a number of seconds, 1 or more',
        );
      }
      watch(board, me, values.since, interval);
      return 0;
    }
    default:
      throw new UsageError(`unknown command "${command}"`);
  }
};

const main = (argv: string[]): number => {
  try {
    return run(argv);
  } catch (error) {
    if (error instanceof UsageError || error instanceof TypeError) {
      process.stderr.write(`board: ${error.message}\n\n${usage}\n`);
      return 2;
    }
    throw error;
  }
};

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === import.meta.filename
) {
  process.exitCode = main(process.argv.slice(2));
}
