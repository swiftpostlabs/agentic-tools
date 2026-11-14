import { isJsonObject, type JsonObject } from '../../core/json.ts';
import type { SettingsDocument } from './schema.ts';

const managedRulePrefix = 'Read(';
const approvalKeys = [
  'chat.tools.terminal.autoApprove',
  'chat.tools.edits.autoApprove',
] as const;

const objectOrEmpty = (value: unknown): JsonObject =>
  isJsonObject(value) ? value : {};

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ?
    value.filter((entry): entry is string => typeof entry === 'string')
  : [];

/** `Read(...)` deny rules in the file that the policy would remove: a person added them, or a pattern left the policy. */
export const lostClaudeRules = (
  before: SettingsDocument,
  after: SettingsDocument,
): string[] => {
  const kept = new Set(
    stringList(objectOrEmpty(after.managed['permissions'])['deny']),
  );
  return stringList(objectOrEmpty(before.managed['permissions'])['deny'])
    .filter((rule) => rule.startsWith(managedRulePrefix) && !kept.has(rule))
    .map((rule) => `.claude/settings.json: deny rule ${rule} would be removed`);
};

/**
 * Approval entries in VS Code settings that the policy would change or drop. Protected-file
 * associations are not checked: only this tool writes the restricted language they point to.
 */
export const lostVscodeSettings = (
  before: SettingsDocument,
  after: SettingsDocument,
): string[] => {
  const lost: string[] = [];
  for (const key of approvalKeys) {
    const current = objectOrEmpty(before.managed[key]);
    const next = objectOrEmpty(after.managed[key]);
    for (const [entry, value] of Object.entries(current)) {
      if (!(entry in next)) {
        lost.push(`.vscode/settings.json: ${key} "${entry}" would be removed`);
      } else if (JSON.stringify(next[entry]) !== JSON.stringify(value)) {
        lost.push(
          `.vscode/settings.json: ${key} "${entry}" would change from ${JSON.stringify(value)} to ${JSON.stringify(next[entry])}`,
        );
      }
    }
  }
  return lost;
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
    JSON.parse(text);
    return [];
  } catch {
    return [`${label}: comments or trailing commas would be removed`];
  }
};
