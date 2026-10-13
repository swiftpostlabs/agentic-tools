#!/usr/bin/env node
/**
 * List recent Claude Code sessions on this machine with the name each one should have.
 *
 * Reads the local transcripts under ~/.claude/projects and `claude agents --json --all`, then
 * prints one row per transcript: the proper name (the last name the user set), the name shown
 * now, whether a live process runs it, its claude.ai session id when live (from
 * ~/.claude/sessions), and the command that resumes it. Rows sharing a proper name and folder are marked so only one copy is kept.
 *
 * Read-only: this script never resumes, renames, or deletes anything.
 *
 *     node find-sessions.mts [--days N] [--all] [--json] [--projects DIR] [--agents-json FILE]
 *
 * Unnamed transcripts with no live process (subagents, one-off runs) are hidden unless --all.
 *
 * Exit status: 0 on success, 2 on a usage or environment error, including when
 * `claude agents` can't be read, since every session would then look dead.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

type Agent = {
  pid?: number;
  id?: string;
  sessionId?: string;
  name?: string;
  cwd?: string;
  state?: string;
};

type Row = {
  sessionId: string;
  shortId: string;
  cwd: string;
  properName: string;
  nameSource: 'custom-title' | 'ai-title' | 'agent-name' | 'none';
  shownName: string;
  state: string;
  lastReply: string;
  lastActivity: string;
  mtimeMs: number;
  live: boolean;
  remoteId: string;
  copy: 'keep' | 'older-copy';
  resume: string;
};

type Records = Record<string, unknown>[];

const usage = `Usage: node find-sessions.mts [--days N] [--all] [--json] [--projects DIR] [--agents-json FILE]

  --days N            Only transcripts modified in the last N days (default 3).
  --all               Also list unnamed transcripts with no live process.
  --json              Print rows as JSON instead of a table.
  --projects DIR      Transcript root (default ~/.claude/projects).
  --agents-json FILE  Read agents from FILE instead of running \`claude agents --json --all\`.
  -h, --help          Show this help.`;

const findString = (records: Records, key: string, last: boolean): string => {
  const ordered = last ? [...records].reverse() : records;
  for (const record of ordered) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return '';
};

const lastAssistantText = (records: Records): string => {
  for (const record of [...records].reverse()) {
    if (record.type !== 'assistant') {
      continue;
    }
    const content = (record.message as { content?: unknown } | undefined)
      ?.content;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const part of content as { type?: string; text?: string }[]) {
      if (part.type === 'text' && typeof part.text === 'string') {
        const text = part.text.trim().replace(/\s+/g, ' ');
        if (text !== '') {
          return text.slice(0, 160);
        }
      }
    }
  }
  return '';
};

const readTranscript = (file: string): Records => {
  const records: Records = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (line.trim() === '') {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(line);
      if (parsed !== null && typeof parsed === 'object') {
        records.push(parsed as Record<string, unknown>);
      }
    } catch {
      // A partially written last line is normal while a session runs.
    }
  }
  return records;
};

const loadAgents = (agentsJson: string | undefined): Agent[] | undefined => {
  const raw =
    agentsJson !== undefined ?
      fs.readFileSync(agentsJson, 'utf8')
    : spawnSync('claude', ['agents', '--json', '--all'], { encoding: 'utf8' })
        .stdout;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Agent[]) : undefined;
  } catch {
    return undefined;
  }
};

// Each running session writes ~/.claude/sessions/<pid>.json with its claude.ai id.
const loadRemoteIds = (sessionsDir: string): Map<string, string> => {
  const ids = new Map<string, string>();
  if (!fs.existsSync(sessionsDir)) {
    return ids;
  }
  for (const entry of fs.readdirSync(sessionsDir)) {
    if (!entry.endsWith('.json')) {
      continue;
    }
    try {
      const parsed = JSON.parse(
        fs.readFileSync(path.join(sessionsDir, entry), 'utf8'),
      ) as { sessionId?: unknown; bridgeSessionId?: unknown };
      if (
        typeof parsed.sessionId === 'string' &&
        typeof parsed.bridgeSessionId === 'string'
      ) {
        ids.set(parsed.sessionId, parsed.bridgeSessionId);
      }
    } catch {
      // A registry file can be mid-write; skip it.
    }
  }
  return ids;
};

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;

const localTime = (ms: number): string =>
  new Date(ms - new Date(ms).getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');

export const buildRows = (
  projectsDir: string,
  days: number,
  agents: Agent[],
): Row[] => {
  const cutoff = Date.now() - days * 86_400_000;
  const rows: Row[] = [];
  for (const project of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!project.isDirectory()) {
      continue;
    }
    const dir = path.join(projectsDir, project.name);
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith('.jsonl')) {
        continue;
      }
      const file = path.join(dir, entry);
      const mtimeMs = fs.statSync(file).mtimeMs;
      if (mtimeMs < cutoff) {
        continue;
      }
      const records = readTranscript(file);
      const sessionId = entry.slice(0, -'.jsonl'.length);
      const liveAgent = agents.find(
        (a) => a.sessionId === sessionId && a.pid !== undefined,
      );
      const agent = liveAgent ?? agents.find((a) => a.sessionId === sessionId);
      const customTitle = findString(records, 'customTitle', true);
      const aiTitle = findString(records, 'aiTitle', true);
      const agentName = findString(records, 'agentName', true);
      // The first cwd is where the session started; --resume looks the transcript up from there.
      const cwd = findString(records, 'cwd', false) || (agent?.cwd ?? '');
      const [properName, nameSource] =
        customTitle !== '' ? [customTitle, 'custom-title' as const]
        : aiTitle !== '' ? [aiTitle, 'ai-title' as const]
        : agentName !== '' ? [agentName, 'agent-name' as const]
        : ['', 'none' as const];
      rows.push({
        sessionId,
        shortId: sessionId.slice(0, 8),
        cwd,
        properName,
        nameSource,
        shownName: agent?.name ?? agentName,
        state: liveAgent?.state ?? '',
        lastReply: lastAssistantText(records),
        lastActivity: localTime(mtimeMs),
        mtimeMs,
        live: liveAgent !== undefined,
        remoteId: '',
        copy: 'keep',
        resume:
          cwd === '' ? '' : (
            `cd ${shellQuote(cwd)} && claude --bg --remote-control --resume ${sessionId} </dev/null`
          ),
      });
    }
  }
  rows.sort((a, b) => b.mtimeMs - a.mtimeMs);
  // Copies share a user-set name and folder. A live copy wins over a newer dead one; otherwise
  // the newest transcript wins.
  const seen = new Set<string>();
  for (const row of [
    ...rows.filter((r) => r.live),
    ...rows.filter((r) => !r.live),
  ]) {
    if (row.nameSource !== 'custom-title') {
      continue;
    }
    const key = `${row.cwd}\n${row.properName}`;
    if (seen.has(key)) {
      row.copy = 'older-copy';
    }
    seen.add(key);
  }
  return rows;
};

const cell = (value: string): string =>
  value === '' ? '—' : value.replace(/\|/g, '\\|');

const printTable = (rows: Row[]): void => {
  const lines = [
    '| Short id | Proper name | Source | Shown now | Live | State | Copy | claude.ai id | Last activity (local) | Folder |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) =>
      [
        r.shortId,
        cell(r.properName),
        r.nameSource,
        cell(r.shownName),
        r.live ? 'yes' : 'no',
        cell(r.state),
        r.copy,
        cell(r.remoteId),
        r.lastActivity,
        cell(path.basename(r.cwd)),
      ].join(' | '),
    ),
  ];
  process.stdout.write(
    `${lines.map((l, i) => (i < 2 ? l : `| ${l} |`)).join('\n')}\n`,
  );
};

const main = (argv: string[]): number => {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        days: { type: 'string', default: '3' },
        all: { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        projects: {
          type: 'string',
          default: path.join(os.homedir(), '.claude', 'projects'),
        },
        'agents-json': { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
    }));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n${usage}\n`);
    return 2;
  }
  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return 0;
  }
  const days = Number(values.days);
  if (!Number.isFinite(days) || days <= 0) {
    process.stderr.write(`--days must be a positive number\n${usage}\n`);
    return 2;
  }
  if (!fs.existsSync(values.projects)) {
    process.stderr.write(`no transcript folder at ${values.projects}\n`);
    return 2;
  }
  const agents = loadAgents(values['agents-json']);
  if (agents === undefined) {
    process.stderr.write(
      'could not read `claude agents --json --all`, so live sessions are unknown\n',
    );
    return 2;
  }
  const rows = buildRows(values.projects, days, agents).filter(
    (r) => values.all || r.live || r.nameSource !== 'none',
  );
  const remoteIds = loadRemoteIds(
    path.join(path.dirname(values.projects), 'sessions'),
  );
  for (const row of rows) {
    if (row.live) {
      row.remoteId = remoteIds.get(row.sessionId) ?? '';
    }
  }
  if (values.json) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  } else {
    printTable(rows);
  }
  return 0;
};

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === import.meta.filename
) {
  process.exitCode = main(process.argv.slice(2));
}
