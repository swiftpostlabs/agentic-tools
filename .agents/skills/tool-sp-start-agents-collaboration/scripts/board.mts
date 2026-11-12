#!/usr/bin/env node
/**
 * A shared board where agent sessions on one machine talk to each other, split into rooms so
 * several collaborations run at once. Each message is its own file, so concurrent writers
 * (Windows, WSL, SSH) never overwrite each other. Each room's CHAT.md is a generated view.
 *
 * The board is the folder .agents/local/collaboration, found by walking up from the current
 * directory, or the folder given with --board. A board from before rooms keeps its messages in a
 * top-level messages/ folder; the script reads and posts there until that folder is moved into a
 * room.
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

export type Room = {
  name: string;
  title: string;
  status: 'open' | 'closed';
  task: string;
  members: string[];
};

/** Where messages are read and written: a room, or the top-level folder of a board from before rooms. */
type Place = { kind: 'room'; room: Room } | { kind: 'top-level' };

const usage = `Usage: node board.mts <command> [--board DIR] [options]

  init
      Create an empty board in .agents/local/collaboration under the current directory, or in
      --board DIR. Existing files are left as they are.
  room create --name <kebab-name> --me <id> [--title TEXT] [--task <task folder name>]
      Create rooms/<YYYY-MM-DD>-<kebab-name>/ dated today, with you as its first member.
  room join --room <room> --me <id>
      Add <id> to the room's members.
  room link --room <room> --task <task folder name>
      Record the task the room works on.
  room close --room <room>   |   room reopen --room <room>
      Close a room (watchers skip it, posting fails) or open it again.
  room list
      List rooms with status, task, and members.
  post --from "<account> / <session name> / <id>" --to <id|all>[,<id>...] [--room <room>]
       [--body TEXT]
      Write one message file and refresh the room's CHAT.md. The body comes from --body or
      stdin. 'all' reaches the room's members. --room is required once the board has rooms.
  render
      Rebuild every CHAT.md from the message files.
  unread --me <id> --since <ISO time> [--room <room>]
      Print messages for <id> sent after the given time, then exit.
  watch --me <id> [--since <ISO time>] [--room <room>] [--interval SECONDS]
      Keep running; print one line per new message for <id>. Run it under a monitor. With
      --since, first print the ones sent after that time, so a restart misses nothing.
  agents
      List registered agents with when each last checked the board.

  --board DIR   The board folder. Defaults to the nearest .agents/local/collaboration at or
                above the current directory.
  --room ROOM   A room's folder name, or the part after its date when only one room has it.

  A message is for <id> when it names <id>, or names 'all' and <id> is a member of its room.
  Without --room, unread and watch read every open room. They record the check time in
  agents/<id>.seen, so others can tell a live reader.`;

const boardSubpath = path.join('.agents', 'local', 'collaboration');

const boardReadme = `# Collaboration board

Agent sessions on this machine talk to each other here. Read the
\`ref-sp-agents-cross-session-communication\` skill before posting: it holds the rules and file
formats. The \`board.mts\` script that runs this board ships with
\`tool-sp-start-agents-collaboration\`.

- \`agents/<id>.md\`: one status file per agent. Edit only your own.
- \`rooms/<YYYY-MM-DD>-<name>/\`: one folder per collaboration, with \`README.md\` (title, status,
  task, members), \`messages/\` (one file per message, written only by \`post\`, never edited), and
  \`CHAT.md\` (generated; never edit it).

Notes that are true only on this machine (paths per client, account names) go below.
`;

class UsageError extends Error {}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

/**
 * An agent id, checked because ids become file names: anything but letters, digits, and dashes
 * could write outside the board.
 */
export const checkId = (id: string, what: string): string => {
  if (!idPattern.test(id)) {
    throw new UsageError(
      `${what} must be an id of letters, digits, and dashes, not ${JSON.stringify(id)}`,
    );
  }
  return id;
};

// A line break in a header value could forge another header line.
// eslint-disable-next-line no-control-regex -- matching control characters is the point.
const controlCharacters = /[\u0000-\u001f\u007f]/;

export const checkHeaderValue = (value: string, what: string): string => {
  if (controlCharacters.test(value)) {
    throw new UsageError(`${what} must be one line without control characters`);
  }
  return value;
};

const sentPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

const roomsDir = (board: string): string => path.join(board, 'rooms');
const agentsDir = (board: string): string => path.join(board, 'agents');
const topLevelMessagesDir = (board: string): string =>
  path.join(board, 'messages');

const placeDir = (board: string, place: Place): string =>
  place.kind === 'room' ? path.join(roomsDir(board), place.room.name) : board;

const placeMessagesDir = (board: string, place: Place): string =>
  path.join(placeDir(board, place), 'messages');

/** The message file's path relative to the board, as shown to readers. */
const placeLabel = (place: Place, file: string): string =>
  place.kind === 'room' ?
    `rooms/${place.room.name}/messages/${file}`
  : `messages/${file}`;

/** The board folder: the nearest .agents/local/collaboration at or above `start`. */
export const findBoard = (start: string): string | undefined => {
  let directory = path.resolve(start);
  for (;;) {
    const candidate = path.join(directory, boardSubpath);
    if (
      ['rooms', 'agents', 'messages'].some((child) =>
        fs.existsSync(path.join(candidate, child)),
      )
    ) {
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

const parseFrontmatter = (
  text: string,
): { header: Map<string, string>; body: string } => {
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
  return { header, body: match?.[2] ?? normalized };
};

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

const checkRecipients = (to: string): string => {
  const recipients = splitList(checkHeaderValue(to, '--to'));
  if (recipients.length === 0) {
    throw new UsageError('--to needs at least one id, or all');
  }
  for (const recipient of recipients) {
    if (recipient !== 'all') {
      checkId(recipient, 'each --to recipient');
    }
  }
  return recipients.join(',');
};

export const parseMessage = (file: string, text: string): Message => {
  const { header, body } = parseFrontmatter(text);
  return {
    file,
    from: header.get('from') ?? '?',
    to: splitList(header.get('to') ?? 'all'),
    sent: header.get('sent') ?? '?',
    body: body.trim(),
  };
};

/**
 * Whether `me` should see this message: not sent by it, and addressed to it, or to all while it
 * is a member. `members` is undefined on a board from before rooms, where all means everyone.
 */
export const isFor = (
  message: Message,
  me: string,
  members?: readonly string[],
): boolean =>
  sessionIdOf(message.from) !== me &&
  (message.to.includes(me) ||
    (message.to.includes('all') && (members?.includes(me) ?? true)));

export const oneLine = (message: Message, label: string): string =>
  `${message.sent} | ${message.from} -> ${message.to.join(',')} | ${message.body.split('\n')[0] ?? ''} [${label}]`;

const listMarkdown = (directory: string): string[] =>
  fs.existsSync(directory) ?
    fs
      .readdirSync(directory)
      .filter((file) => file.endsWith('.md'))
      .sort()
  : [];

export const readRoom = (board: string, name: string): Room => {
  const readme = path.join(roomsDir(board), name, 'README.md');
  const { header } = parseFrontmatter(
    fs.existsSync(readme) ? fs.readFileSync(readme, 'utf8') : '',
  );
  return {
    name,
    title: header.get('title') ?? name,
    status: header.get('status') === 'closed' ? 'closed' : 'open',
    task: header.get('task') ?? '',
    members: splitList(header.get('members') ?? ''),
  };
};

export const writeRoom = (board: string, room: Room): void => {
  checkHeaderValue(room.title, 'the title');
  checkHeaderValue(room.task, 'the task');
  for (const member of room.members) {
    checkId(member, '--me');
  }
  const directory = path.join(roomsDir(board), room.name);
  const readme = path.join(directory, 'README.md');
  const existing = fs.existsSync(readme) ? fs.readFileSync(readme, 'utf8') : '';
  const body =
    parseFrontmatter(existing).body.trim() ||
    `# ${room.title}\n\nWhat this room is for, and the task it serves.`;
  fs.mkdirSync(path.join(directory, 'messages'), { recursive: true });
  fs.writeFileSync(
    readme,
    `---\ntitle: ${room.title}\nstatus: ${room.status}\ntask: ${room.task}\nmembers: ${room.members.join(', ')}\n---\n\n${body}\n`,
  );
};

export const listRooms = (board: string): Room[] =>
  fs.existsSync(roomsDir(board)) ?
    fs
      .readdirSync(roomsDir(board), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .map((name) => readRoom(board, name))
  : [];

/** The room `wanted` names: its folder name, or the part after the date when only one room has it. */
export const resolveRoom = (board: string, wanted: string): Room => {
  const rooms = listRooms(board);
  const exact = rooms.find((room) => room.name === wanted);
  if (exact !== undefined) {
    return exact;
  }
  const bySuffix = rooms.filter((room) =>
    room.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').startsWith(wanted),
  );
  const [only] = bySuffix;
  if (bySuffix.length === 1 && only !== undefined) {
    return only;
  }
  const names = rooms.map((room) => room.name).join(', ') || 'none';
  throw new UsageError(
    bySuffix.length === 0 ?
      `no room "${wanted}"; rooms: ${names}`
    : `"${wanted}" matches several rooms: ${bySuffix.map((room) => room.name).join(', ')}`,
  );
};

const hasTopLevelMessages = (board: string): boolean =>
  fs.existsSync(topLevelMessagesDir(board));

/** Every place a reader follows: the top-level folder while it exists, then the open rooms. */
const readablePlaces = (board: string): Place[] => [
  ...(hasTopLevelMessages(board) ? [{ kind: 'top-level' } as const] : []),
  ...listRooms(board)
    .filter((room) => room.status === 'open')
    .map((room) => ({ kind: 'room', room }) as const),
];

export const listMessageFiles = (board: string, place: Place): string[] =>
  listMarkdown(placeMessagesDir(board, place));

export const readMessage = (
  board: string,
  place: Place,
  file: string,
): Message =>
  parseMessage(
    file,
    fs.readFileSync(path.join(placeMessagesDir(board, place), file), 'utf8'),
  );

const isForIn = (place: Place, message: Message, me: string): boolean =>
  isFor(message, me, place.kind === 'room' ? place.room.members : undefined);

const renderPlace = (board: string, place: Place): void => {
  const sections = listMessageFiles(board, place).map((file) => {
    const message = readMessage(board, place, file);
    return `## ${message.sent} · ${message.from} → ${message.to.join(', ')}\n\n${message.body}\n`;
  });
  const header =
    '# Chat\n\nGenerated by `board.mts` from `messages/`. Do not edit by hand.\n';
  fs.writeFileSync(
    path.join(placeDir(board, place), 'CHAT.md'),
    [header, ...sections].join('\n'),
  );
};

export const render = (board: string): void => {
  if (hasTopLevelMessages(board)) {
    renderPlace(board, { kind: 'top-level' });
  }
  for (const room of listRooms(board)) {
    renderPlace(board, { kind: 'room', room });
  }
};

/** Create the board's folders and files; returns the paths it created. */
export const init = (board: string): string[] => {
  const created: string[] = [];
  for (const directory of [board, roomsDir(board), agentsDir(board)]) {
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
  return created;
};

const localDate = (now: Date): string =>
  [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

/** Create a room dated `now`, with `me` as its first member; returns the room. */
export const createRoom = (
  board: string,
  name: string,
  me: string,
  options: { title?: string; task?: string; now?: Date } = {},
): Room => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    throw new UsageError(
      '--name must be kebab-case: lowercase letters, digits, and dashes',
    );
  }
  const folder =
    /^\d{4}-\d{2}-\d{2}-/.test(name) ? name : (
      `${localDate(options.now ?? new Date())}-${name}`
    );
  if (fs.existsSync(path.join(roomsDir(board), folder))) {
    throw new UsageError(`room ${folder} already exists; join it instead`);
  }
  const room: Room = {
    name: folder,
    title: options.title ?? name.replaceAll('-', ' '),
    status: 'open',
    task: options.task ?? '',
    members: [me],
  };
  writeRoom(board, room);
  renderPlace(board, { kind: 'room', room });
  return room;
};

/** Where a post goes: the named room, or the top-level folder of a board from before rooms. */
const postPlace = (board: string, roomName: string | undefined): Place => {
  if (roomName !== undefined) {
    const room = resolveRoom(board, roomName);
    if (room.status === 'closed') {
      throw new UsageError(
        `room ${room.name} is closed; reopen it with: room reopen --room ${room.name}`,
      );
    }
    return { kind: 'room', room };
  }
  if (hasTopLevelMessages(board)) {
    return { kind: 'top-level' };
  }
  const open = listRooms(board)
    .filter((room) => room.status === 'open')
    .map((room) => room.name);
  throw new UsageError(
    `post needs --room; open rooms: ${open.join(', ') || 'none (create one with room create)'}`,
  );
};

/** Write one message file and refresh CHAT.md; returns the new file's path relative to the board. */
export const post = (
  board: string,
  from: string,
  to: string,
  body: string,
  options: { room?: string; sent?: string } = {},
): string => {
  const id = checkId(
    sessionIdOf(checkHeaderValue(from, '--from')),
    'the id at the end of --from',
  );
  const recipients = checkRecipients(to);
  const place = postPlace(board, options.room);
  const sent = options.sent ?? new Date().toISOString();
  if (!sentPattern.test(sent)) {
    throw new UsageError(
      `the send time must be an ISO time in UTC, not ${JSON.stringify(sent)}`,
    );
  }
  const file = `${sent.replaceAll(/[:.]/g, '')}-${id}.md`;
  const content = `---\nfrom: ${from}\nto: ${recipients}\nsent: ${sent}\n---\n\n${body}\n`;
  fs.mkdirSync(placeMessagesDir(board, place), { recursive: true });
  fs.writeFileSync(path.join(placeMessagesDir(board, place), file), content, {
    flag: 'wx',
  });
  renderPlace(board, place);
  return placeLabel(place, file);
};

const markSeen = (board: string, me: string): void => {
  checkId(me, '--me');
  fs.mkdirSync(agentsDir(board), { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir(board), `${me}.seen`),
    `${new Date().toISOString()}\n`,
  );
};

const listAgents = (board: string): void => {
  for (const file of listMarkdown(agentsDir(board))) {
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

const listRoomsCommand = (board: string): void => {
  if (hasTopLevelMessages(board)) {
    process.stdout.write(
      '(top level) | open | messages/ from before rooms; all means everyone\n',
    );
  }
  for (const room of listRooms(board)) {
    process.stdout.write(
      `${room.name} | ${room.status} | task: ${room.task || '-'} | members: ${room.members.join(', ') || '-'} | ${room.title}\n`,
    );
  }
};

const changeRoom = (
  board: string,
  roomName: string,
  change: (room: Room) => Room,
): Room => {
  const room = change(resolveRoom(board, roomName));
  writeRoom(board, room);
  return room;
};

/** The places a reader follows: one named room, or every open room plus the top level. */
const placesFor = (board: string, roomName: string | undefined): Place[] =>
  roomName === undefined ?
    readablePlaces(board)
  : [{ kind: 'room', room: resolveRoom(board, roomName) }];

/** Messages for `me` sent after `since`, oldest first. */
export const unreadLines = (
  board: string,
  me: string,
  since: string,
  roomName?: string,
): string[] => {
  checkId(me, '--me');
  const cutoff = Date.parse(since);
  const found: { sent: string; line: string }[] = [];
  for (const place of placesFor(board, roomName)) {
    for (const file of listMessageFiles(board, place)) {
      const message = readMessage(board, place, file);
      if (isForIn(place, message, me) && Date.parse(message.sent) > cutoff) {
        found.push({
          sent: message.sent,
          line: oneLine(message, placeLabel(place, file)),
        });
      }
    }
  }
  return found
    .sort((left, right) => left.sent.localeCompare(right.sent))
    .map((entry) => entry.line);
};

const unread = (
  board: string,
  me: string,
  since: string,
  roomName: string | undefined,
): void => {
  markSeen(board, me);
  for (const line of unreadLines(board, me, since, roomName)) {
    process.stdout.write(`${line}\n`);
  }
};

/** Message file names are unique on a board (send time plus sender id), so they survive a move into a room. */
export const allMessageFiles = (
  board: string,
  roomName: string | undefined,
): string[] =>
  placesFor(board, roomName).flatMap((place) => listMessageFiles(board, place));

/**
 * Lines for messages to `me` whose files are not in `seen`, adding them to it. Files are tracked
 * by name, unique on a board, so moving messages into a room does not announce them again.
 */
export const newMessageLines = (
  board: string,
  me: string,
  roomName: string | undefined,
  seen: Set<string>,
): string[] => {
  const lines: string[] = [];
  // Re-read the places each time, so new rooms, joins, and closes take effect while watching.
  for (const place of placesFor(board, roomName)) {
    for (const file of listMessageFiles(board, place)) {
      if (seen.has(file)) {
        continue;
      }
      seen.add(file);
      const message = readMessage(board, place, file);
      if (isForIn(place, message, me)) {
        lines.push(oneLine(message, placeLabel(place, file)));
      }
    }
  }
  return lines;
};

const watch = (
  board: string,
  me: string,
  since: string | undefined,
  roomName: string | undefined,
  intervalSeconds: number,
): void => {
  const seen = new Set(allMessageFiles(board, roomName));
  if (since !== undefined) {
    unread(board, me, since, roomName);
  }
  // stderr, so a background monitor is not woken just because the watch started.
  process.stderr.write(
    `watching ${roomName === undefined ? 'every open room' : `room ${roomName}`} on ${board} for ${me} every ${String(intervalSeconds)}s\n`,
  );
  markSeen(board, me);
  let lastMark = Date.now();
  setInterval(() => {
    if (Date.now() - lastMark >= 60_000) {
      markSeen(board, me);
      lastMark = Date.now();
    }
    for (const line of newMessageLines(board, me, roomName, seen)) {
      process.stdout.write(`${line}\n`);
    }
  }, intervalSeconds * 1000);
};

const required = (value: string | undefined, message: string): string => {
  if (value === undefined || value.trim() === '') {
    throw new UsageError(message);
  }
  return value;
};

const isoTime = (value: string): string => {
  if (Number.isNaN(Date.parse(value))) {
    throw new UsageError('--since must be an ISO time');
  }
  return value;
};

const readStdin = (): string =>
  process.stdin.isTTY ? '' : fs.readFileSync(0, 'utf8');

type Values = {
  board?: string;
  from?: string;
  to?: string;
  body?: string;
  me?: string;
  since?: string;
  room?: string;
  name?: string;
  title?: string;
  task?: string;
  interval: string;
};

const runRoom = (
  board: string,
  action: string | undefined,
  values: Values,
): void => {
  switch (action) {
    case 'create': {
      const room = createRoom(
        board,
        required(values.name, 'room create needs --name <kebab-name>'),
        checkId(required(values.me, 'room create needs --me <id>'), '--me'),
        { title: values.title, task: values.task },
      );
      process.stdout.write(`created rooms/${room.name}\n`);
      return;
    }
    case 'join': {
      const me = checkId(
        required(values.me, 'room join needs --me <id>'),
        '--me',
      );
      const room = changeRoom(
        board,
        required(values.room, 'room join needs --room <room>'),
        (current) => ({
          ...current,
          members:
            current.members.includes(me) ?
              current.members
            : [...current.members, me],
        }),
      );
      process.stdout.write(`${me} is a member of ${room.name}\n`);
      return;
    }
    case 'link': {
      const task = required(
        values.task,
        'room link needs --task <task folder name>',
      );
      const room = changeRoom(
        board,
        required(values.room, 'room link needs --room <room>'),
        (current) => ({ ...current, task }),
      );
      process.stdout.write(`${room.name} works on task ${task}\n`);
      return;
    }
    case 'close':
    case 'reopen': {
      const status = action === 'close' ? 'closed' : 'open';
      const room = changeRoom(
        board,
        required(values.room, `room ${action} needs --room <room>`),
        (current) => ({ ...current, status }),
      );
      process.stdout.write(`${room.name} is ${status}\n`);
      return;
    }
    case 'list':
      listRoomsCommand(board);
      return;
    default:
      throw new UsageError(
        action === undefined ?
          'room needs an action: create, join, link, close, reopen, or list'
        : `unknown room action "${action}"`,
      );
  }
};

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
      room: { type: 'string' },
      name: { type: 'string' },
      title: { type: 'string' },
      task: { type: 'string' },
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
    case 'room':
      runRoom(board, positionals[1], values);
      return 0;
    case 'post': {
      const from = required(
        values.from,
        'post needs --from "<account> / <session name> / <id>"',
      );
      const to = required(values.to, 'post needs --to <id|all>');
      const place = postPlace(board, values.room);
      const body = required(
        (values.body ?? readStdin()).trim(),
        'post needs a body (--body or stdin)',
      );
      const room = place.kind === 'room' ? place.room.name : undefined;
      process.stdout.write(`posted ${post(board, from, to, body, { room })}\n`);
      return 0;
    }
    case 'render':
      render(board);
      return 0;
    case 'agents':
      listAgents(board);
      return 0;
    case 'unread': {
      const me = checkId(required(values.me, 'unread needs --me <id>'), '--me');
      const since = isoTime(
        required(values.since, 'unread needs --since <ISO time>'),
      );
      unread(board, me, since, values.room);
      return 0;
    }
    case 'watch': {
      const me = checkId(required(values.me, 'watch needs --me <id>'), '--me');
      const since =
        values.since === undefined ? undefined : isoTime(values.since);
      const interval = Number(values.interval);
      if (!Number.isFinite(interval) || interval < 1) {
        throw new UsageError(
          '--interval must be a number of seconds, 1 or more',
        );
      }
      if (values.room !== undefined) {
        resolveRoom(board, values.room);
      }
      watch(board, me, since, values.room, interval);
      return 0;
    }
    default:
      throw new UsageError(`unknown command "${command}"`);
  }
};

/** node:util parseArgs rejects unknown or malformed options with these codes. */
const isParseArgsError = (error: unknown): error is Error =>
  error instanceof Error &&
  'code' in error &&
  typeof error.code === 'string' &&
  error.code.startsWith('ERR_PARSE_ARGS_');

const main = (argv: string[]): number => {
  try {
    return run(argv);
  } catch (error) {
    if (error instanceof UsageError || isParseArgsError(error)) {
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
