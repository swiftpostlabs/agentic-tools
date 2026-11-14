import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ToolError } from '../../core/errors.ts';
import {
  isJsonObject,
  parseWith,
  readJson5File,
  type JsonObject,
} from '../../core/json.ts';
import type { SettingsDocument } from './schema.ts';
import { vscodeManagedOrder } from './vscode.ts';

export const syncRecordVersion = 1;

/**
 * What `policy sync` last wrote into each generated file: the managed entries, plus a hash of
 * `.aiexclude`. Committed beside the policy, so a teammate's first sync after a pull knows which
 * entries are the tool's own and which a person added.
 */
export type SyncRecord = {
  version: typeof syncRecordVersion;
  claude: { deny: string[] };
  vscode: Record<string, JsonObject>;
  aiexclude: string | null;
};

const syncRecordSchema = z.object({
  version: z.literal(syncRecordVersion),
  claude: z.object({ deny: z.array(z.string()) }),
  vscode: z.record(z.string(), z.record(z.string(), z.unknown())),
  aiexclude: z.string().nullable(),
});

const objectOrEmpty = (value: unknown): JsonObject =>
  isJsonObject(value) ? value : {};

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ?
    value.filter((entry): entry is string => typeof entry === 'string')
  : [];

const hashText = (text: string | undefined): string | null =>
  text === undefined ? null : (
    `sha256:${createHash('sha256').update(text).digest('hex')}`
  );

/** The record of a set of generated files, as they are on disk or as sync is about to write them. */
export const buildSyncRecord = (files: {
  claude: SettingsDocument;
  vscode: SettingsDocument;
  aiexclude: string | undefined;
}): SyncRecord => ({
  version: syncRecordVersion,
  claude: {
    deny: stringList(
      objectOrEmpty(files.claude.managed['permissions'])['deny'],
    ),
  },
  vscode: Object.fromEntries(
    vscodeManagedOrder
      .map((key) => [key, objectOrEmpty(files.vscode.managed[key])] as const)
      .filter(([, entries]) => Object.keys(entries).length > 0),
  ),
  aiexclude: hashText(files.aiexclude),
});

export const readSyncRecord = (
  target: string,
  label: string,
): SyncRecord | undefined => {
  const raw = readJson5File(target, label);
  if (raw === undefined) {
    return undefined;
  }
  if (isJsonObject(raw) && raw['version'] !== syncRecordVersion) {
    throw new ToolError(
      `${label} has format version ${JSON.stringify(raw['version'])}; this tool reads version ${String(syncRecordVersion)}. Update agentic-tools, or delete the file and sync with --force.`,
    );
  }
  return parseWith(syncRecordSchema, raw, label);
};

const aiexcludeKey = '.aiexclude';

/** Flatten a record to one comparable value per managed entry, keyed by how it is reported. */
const recordEntries = (record: SyncRecord): Map<string, string> => {
  const entries = new Map<string, string>();
  for (const rule of record.claude.deny) {
    entries.set(`.claude/settings.json: deny rule ${rule}`, 'true');
  }
  for (const [key, values] of Object.entries(record.vscode)) {
    for (const [entry, value] of Object.entries(values)) {
      entries.set(
        `.vscode/settings.json: ${key} "${entry}"`,
        JSON.stringify(value),
      );
    }
  }
  if (record.aiexclude !== null) {
    entries.set(aiexcludeKey, record.aiexclude);
  }
  return entries;
};

const describeLoss = (
  key: string,
  onDisk: string | undefined,
  next: string | undefined,
): string => {
  if (key === aiexcludeKey) {
    return (
      onDisk === undefined ?
        '.aiexclude was deleted by hand and would be restored'
      : next === undefined ?
        '.aiexclude was edited by hand and would be removed'
      : '.aiexclude was edited by hand and would be replaced'
    );
  }
  return (
    onDisk === undefined ? `${key} was removed by hand and would be restored`
    : next === undefined ? `${key} would be removed`
    : `${key} would change from ${onDisk} to ${next}`
  );
};

/**
 * Hand edits that syncing would undo. An entry is hand-written when the file differs from what
 * sync last wrote; it is lost when the new output differs from the file. With no record yet,
 * an entry in the file counts as the tool's own only when the current policy writes it as is.
 */
export const findLosses = (options: {
  onDisk: SyncRecord;
  lastWritten: SyncRecord | undefined;
  next: SyncRecord;
}): string[] => {
  const onDisk = recordEntries(options.onDisk);
  const next = recordEntries(options.next);
  const lastWritten =
    options.lastWritten === undefined ?
      new Map([...onDisk].filter(([key, value]) => next.get(key) === value))
    : recordEntries(options.lastWritten);
  const keys = new Set([
    ...onDisk.keys(),
    ...lastWritten.keys(),
    ...next.keys(),
  ]);
  return [...keys]
    .filter(
      (key) =>
        onDisk.get(key) !== lastWritten.get(key) &&
        next.get(key) !== onDisk.get(key),
    )
    .sort()
    .map((key) => describeLoss(key, onDisk.get(key), next.get(key)));
};

/** Comments and trailing commas that rewriting the file as plain JSON would strip. */
export const lostFormatting = (
  label: string,
  text: string | undefined,
): string[] => {
  if (text === undefined) {
    return [];
  }
  try {
    JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    return [];
  } catch {
    return [`${label}: comments or trailing commas would be removed`];
  }
};

/** Top-level keys set to `null` by hand, which rendering drops. Managed keys are the tool's own. */
export const lostNulls = (label: string, before: SettingsDocument): string[] =>
  Object.entries(before.extras)
    .filter(([, value]) => value === null)
    .map(([key]) => `${label}: "${key}": null would be removed`);
