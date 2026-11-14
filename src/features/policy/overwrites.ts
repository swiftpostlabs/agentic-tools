import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ToolError } from '../../core/errors.ts';
import {
  errorMessage,
  isJsonObject,
  parseWith,
  readJson5File,
  type JsonObject,
} from '../../core/json.ts';
import type { SettingsDocument } from './schema.ts';
import { restrictedLanguage, vscodeManagedOrder } from './vscode.ts';

const managedRulePrefix = 'Read(';

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

/**
 * Only what sync owns: `Read(...)` denies, restricted-file associations, its Copilot switch, and
 * approvals. `everything` keeps the other entries of those keys too, to see what a person changed.
 */
export const buildSyncRecord = (
  files: {
    claude: SettingsDocument;
    vscode: SettingsDocument;
    aiexclude: string | undefined;
  },
  everything = false,
): SyncRecord => {
  const owned = (key: string, entries: JsonObject): JsonObject =>
    Object.fromEntries(
      Object.entries(entries).filter(
        ([entry, value]) =>
          everything ||
          (key === 'files.associations' ? value === restrictedLanguage
          : key === 'github.copilot.enable' ? entry === restrictedLanguage
          : true),
      ),
    );
  return {
    version: syncRecordVersion,
    claude: {
      deny: stringList(
        objectOrEmpty(files.claude.managed['permissions'])['deny'],
      ).filter((rule) => everything || rule.startsWith(managedRulePrefix)),
    },
    vscode: Object.fromEntries(
      vscodeManagedOrder
        .map(
          (key) =>
            [
              key,
              owned(key, objectOrEmpty(files.vscode.managed[key])),
            ] as const,
        )
        .filter(([, entries]) => Object.keys(entries).length > 0),
    ),
    aiexclude: hashText(files.aiexclude),
  };
};

/** Read the record. A missing file is `undefined`; an unreadable one stops with a way out. */
export const readSyncRecord = (
  target: string,
  label: string,
): SyncRecord | undefined => {
  const fix =
    'Resolve it, or delete it so sync treats every entry the policy does not write as hand-written; ' +
    '--force rewrites it but also overwrites every hand edit.';
  let raw: unknown;
  try {
    raw = readJson5File(target, label);
  } catch (error) {
    throw new ToolError(`${errorMessage(error)}. ${fix}`);
  }
  if (raw === undefined) {
    return undefined;
  }
  if (isJsonObject(raw) && raw['version'] !== syncRecordVersion) {
    throw new ToolError(
      `${label} has format version ${JSON.stringify(raw['version'])}; this tool reads version ${String(syncRecordVersion)}. Use the agentic-tools version that wrote it, or: ${fix}`,
    );
  }
  try {
    return parseWith(syncRecordSchema, raw, label);
  } catch (error) {
    throw new ToolError(`${errorMessage(error)}. ${fix}`);
  }
};

const aiexcludeKey = '.aiexclude';

/** JSON with object keys sorted, so the same meaning always compares equal. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) =>
    isJsonObject(inner) ?
      Object.fromEntries(
        Object.keys(inner)
          .sort()
          .map((key) => [key, inner[key]]),
      )
    : inner,
  );

/** Flatten a record to one comparable value per managed entry, keyed by how it is reported. */
const recordEntries = (record: SyncRecord): Map<string, string> => {
  const entries = new Map<string, string>();
  for (const rule of record.claude.deny) {
    entries.set(`.claude/settings.json: deny rule ${rule}`, 'true');
  }
  for (const [key, values] of Object.entries(record.vscode)) {
    for (const [entry, value] of Object.entries(values)) {
      entries.set(`.vscode/settings.json: ${key} "${entry}"`, canonical(value));
    }
  }
  if (record.aiexclude !== null) {
    entries.set(aiexcludeKey, record.aiexclude);
  }
  return entries;
};

const describeLoss = (
  key: string,
  next: string | undefined,
  onDisk: string,
): string =>
  key === aiexcludeKey ?
    `.aiexclude was edited by hand and would be ${next === undefined ? 'removed' : 'replaced'}`
  : next === undefined ? `${key} would be removed`
  : `${key} would change from ${onDisk} to ${next}`;

/**
 * Compare the files with what sync last wrote and is about to write. An entry is hand-written when
 * the file differs from the record; it is lost when the new output differs from the file. An
 * entry a person deleted is restored, and reported, since the policy asks for it and nothing a
 * person wrote is lost. With no record yet, an entry in the file counts as the tool's own only when
 * the current policy writes it as is.
 */
export const compareWithRecord = (options: {
  /** The entries sync owns on disk. */
  onDisk: SyncRecord;
  /** Every entry of the same keys on disk, so a re-pointed association is seen. */
  onDiskAll: SyncRecord;
  lastWritten: SyncRecord | undefined;
  next: SyncRecord;
}): { losses: string[]; restored: string[] } => {
  const next = recordEntries(options.next);
  const ownedOnDisk = recordEntries(options.onDisk);
  const allOnDisk = recordEntries(options.onDiskAll);
  const recorded =
    options.lastWritten === undefined ?
      new Map(
        [...ownedOnDisk].filter(([key, value]) => next.get(key) === value),
      )
    : recordEntries(options.lastWritten);
  const keys = [
    ...new Set([...ownedOnDisk.keys(), ...recorded.keys(), ...next.keys()]),
  ].sort();
  const losses = keys.flatMap((key) => {
    const value = allOnDisk.get(key);
    return (
        value === undefined ||
          value === recorded.get(key) ||
          value === next.get(key)
      ) ?
        []
      : [describeLoss(key, next.get(key), value)];
  });
  const restored = keys.filter(
    (key) =>
      !allOnDisk.has(key) && recorded.has(key) && next.get(key) !== undefined,
  );
  return { losses, restored };
};

const approvalKeys = [
  ['terminalAutoApprove', 'chat.tools.terminal.autoApprove'],
  ['editAutoApprove', 'chat.tools.edits.autoApprove'],
] as const;

type ApprovalMaps = {
  [Key in (typeof approvalKeys)[number][0]]?:
    Record<string, unknown> | undefined;
};

/**
 * Approvals edited in the policy file since the last sync that importing VS Code's maps would
 * undo. The record holds the approvals the policy had at that sync; with no record, every policy
 * approval that differs from VS Code counts, since nothing tells which side was edited.
 */
export const findImportLosses = (options: {
  policyLabel: string;
  before: ApprovalMaps;
  imported: ApprovalMaps;
  lastWritten: SyncRecord | undefined;
}): string[] => {
  return approvalKeys.flatMap(([policyKey, vscodeKey]) => {
    const before = options.before[policyKey] ?? {};
    const imported = options.imported[policyKey] ?? {};
    const recorded =
      options.lastWritten === undefined ?
        imported
      : (options.lastWritten.vscode[vscodeKey] ?? {});
    return Object.entries(before)
      .filter(
        ([entry, value]) =>
          canonical(value) !== canonical(recorded[entry]) &&
          canonical(value) !== canonical(imported[entry]),
      )
      .map(([entry, value]) =>
        entry in imported ?
          `${options.policyLabel}: ${policyKey} "${entry}" would change from ${canonical(value)} to ${canonical(imported[entry])}`
        : `${options.policyLabel}: ${policyKey} "${entry}" would be removed`,
      );
  });
};

/** JSON5 syntax, such as comments and trailing commas, that rewriting as plain JSON would strip. */
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
    return [
      `${label}: JSON5 syntax (comments, trailing commas, quotes) would be rewritten as plain JSON`,
    ];
  }
};

/** Top-level keys set to `null` by hand, which rendering drops. Managed keys are the tool's own. */
export const lostNulls = (label: string, before: SettingsDocument): string[] =>
  Object.entries(before.extras)
    .filter(([, value]) => value === null)
    .map(([key]) => `${label}: "${key}": null would be removed`);
