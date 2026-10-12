import { z } from "zod";
import { isJsonObject, type JsonObject } from "../core/json.ts";
import type { SettingsDocument, TerminalApprovalValue } from "./schema.ts";

const restrictedLanguage = "copilot-restricted-file";

const keys = {
  associations: "files.associations",
  copilotEnable: "github.copilot.enable",
  terminalAutoApprove: "chat.tools.terminal.autoApprove",
  editAutoApprove: "chat.tools.edits.autoApprove",
} as const;

export const vscodeManagedOrder = [
  keys.associations,
  keys.copilotEnable,
  keys.terminalAutoApprove,
  keys.editAutoApprove,
] as const;

export const vscodeManagedSchema = z.object({
  [keys.associations]: z.record(z.string(), z.string()).nullish(),
  [keys.copilotEnable]: z.record(z.string(), z.boolean()).nullish(),
  [keys.terminalAutoApprove]: z.record(z.string(), z.union([z.boolean(), z.record(z.string(), z.boolean())])).nullish(),
  [keys.editAutoApprove]: z.record(z.string(), z.boolean()).nullish(),
});

const objectOrEmpty = (value: unknown): JsonObject => (isJsonObject(value) ? value : {});
const nullIfEmpty = (value: JsonObject): JsonObject | null => (Object.keys(value).length === 0 ? null : value);

/** Protected patterns become a restricted language, which Copilot is then disabled for. */
const mergeAssociations = (existing: unknown, protectedFiles: string[]): JsonObject | null => {
  const preserved = Object.fromEntries(
    Object.entries(objectOrEmpty(existing)).filter(([, language]) => language !== restrictedLanguage),
  );
  const managed = Object.fromEntries(protectedFiles.map((pattern) => [pattern, restrictedLanguage]));
  return nullIfEmpty({ ...preserved, ...managed });
};

const mergeCopilotEnable = (existing: unknown, protectedFiles: string[]): JsonObject | null => {
  const enable = Object.fromEntries(Object.entries(objectOrEmpty(existing)).filter(([key]) => key !== restrictedLanguage));
  if (protectedFiles.length > 0) {
    enable[restrictedLanguage] = false;
  }
  return nullIfEmpty(enable);
};

export const applyPolicyToVscodeSettings = (
  settings: SettingsDocument,
  options: {
    protectedFiles: string[];
    terminalAutoApprove: Record<string, TerminalApprovalValue>;
    editAutoApprove: Record<string, boolean>;
  },
): SettingsDocument => ({
  managed: {
    ...settings.managed,
    [keys.associations]: mergeAssociations(settings.managed[keys.associations], options.protectedFiles),
    [keys.copilotEnable]: mergeCopilotEnable(settings.managed[keys.copilotEnable], options.protectedFiles),
    [keys.terminalAutoApprove]: nullIfEmpty(options.terminalAutoApprove),
    [keys.editAutoApprove]: nullIfEmpty(options.editAutoApprove),
  },
  extras: settings.extras,
});

/** The approval maps a person edited in VS Code, ready to merge back into the policy. */
export const extractApprovalMaps = (settings: SettingsDocument): JsonObject => ({
  terminalAutoApprove: { ...objectOrEmpty(settings.managed[keys.terminalAutoApprove]) },
  editAutoApprove: { ...objectOrEmpty(settings.managed[keys.editAutoApprove]) },
});
