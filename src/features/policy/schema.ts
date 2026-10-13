import { z } from 'zod';
import { ToolError } from '../../core/errors.ts';
import {
  isJsonObject,
  parseWith,
  readJson5File,
  toJsonText,
  type JsonObject,
} from '../../core/json.ts';
import {
  describeSupportedServices,
  normalizeServiceName,
  supportedServices,
  type SupportedService,
} from './services.ts';

/** VS Code accepts a boolean or an object such as `{"approve": true, "matchCommandLine": true}`. */
const terminalApprovalValue = z.union([
  z.boolean(),
  z.record(z.string(), z.boolean()),
]);
export type TerminalApprovalValue = z.infer<typeof terminalApprovalValue>;

const stringList = (field: string) =>
  z.unknown().transform((value, context): string[] => {
    if (value === null || value === undefined) {
      return [];
    }
    if (!Array.isArray(value)) {
      context.addIssue({
        code: 'custom',
        message: `Policy '${field}' must be an array of strings.`,
      });
      return z.NEVER;
    }
    if (!value.every((entry) => typeof entry === 'string')) {
      context.addIssue({
        code: 'custom',
        message: `Policy '${field}' must contain only strings.`,
      });
      return z.NEVER;
    }
    return value;
  });

const services = z.unknown().transform((value, context): SupportedService[] => {
  if (value === null || value === undefined) {
    return [...supportedServices];
  }
  if (!Array.isArray(value)) {
    context.addIssue({
      code: 'custom',
      message: "Policy 'services' must be an array of strings.",
    });
    return z.NEVER;
  }
  const normalized: SupportedService[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      context.addIssue({
        code: 'custom',
        message: "Policy 'services' must contain only non-empty strings.",
      });
      return z.NEVER;
    }
    const service = normalizeServiceName(entry);
    if (service === undefined) {
      context.addIssue({
        code: 'custom',
        message: `Unsupported policy service '${entry}'. Supported values: ${describeSupportedServices()}.`,
      });
      return z.NEVER;
    }
    if (!normalized.includes(service)) {
      normalized.push(service);
    }
  }
  return normalized;
});

/**
 * The `policy` section of `.agents/config.json`. Fields left out of the file stay `undefined`, so
 * writing the policy back reproduces only what the author set.
 */
export const aiPolicySchema = z.strictObject({
  services: services.optional(),
  protectedFiles: stringList('protectedFiles').optional(),
  excludedFiles: stringList('excludedFiles').optional(),
  terminalAutoApprove: z.record(z.string(), terminalApprovalValue).optional(),
  editAutoApprove: z.record(z.string(), z.boolean()).optional(),
});

export type AiPolicy = z.output<typeof aiPolicySchema>;

/** A policy with every default applied, for the sync logic to read. */
export type EffectivePolicy = {
  services: SupportedService[];
  protectedFiles: string[];
  excludedFiles: string[];
  terminalAutoApprove: Record<string, TerminalApprovalValue>;
  editAutoApprove: Record<string, boolean>;
};

export const withDefaults = (policy: AiPolicy): EffectivePolicy => ({
  services: policy.services ?? [...supportedServices],
  protectedFiles: policy.protectedFiles ?? [],
  excludedFiles: policy.excludedFiles ?? [],
  terminalAutoApprove: policy.terminalAutoApprove ?? {},
  editAutoApprove: policy.editAutoApprove ?? {},
});

export const parseAiPolicy = (
  value: unknown,
  context: string,
  pathPrefix: readonly string[] = [],
): AiPolicy => parseWith(aiPolicySchema, value ?? {}, context, pathPrefix);

/** The policy as JSON, keeping only the fields that were set. */
export const policyToJson = (policy: AiPolicy): JsonObject => {
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(policy)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

/**
 * A settings document that is ours to update in part. `managed` holds the keys this tool owns, in
 * the order they are written; every other key round-trips untouched after them.
 */
export type SettingsDocument = { managed: JsonObject; extras: JsonObject };

export const splitSettings = (
  value: unknown,
  managedKeys: readonly string[],
  context: string,
): SettingsDocument => {
  if (value === undefined) {
    return { managed: {}, extras: {} };
  }
  if (!isJsonObject(value)) {
    throw new ToolError(`${context} must be a JSON object.`);
  }
  const managed: JsonObject = {};
  const extras: JsonObject = {};
  for (const [key, entry] of Object.entries(value)) {
    (managedKeys.includes(key) ? managed : extras)[key] = entry;
  }
  return { managed, extras };
};

/** Render managed keys first, then extras, dropping top-level nulls. Empty renders as nothing. */
export const renderSettings = (
  managedOrder: readonly string[],
  document: SettingsDocument,
): string | undefined => {
  const payload: JsonObject = {};
  for (const key of managedOrder) {
    const value = document.managed[key];
    if (value !== undefined && value !== null) {
      payload[key] = value;
    }
  }
  for (const [key, value] of Object.entries(document.extras)) {
    if (value !== null) {
      payload[key] = value;
    }
  }
  return Object.keys(payload).length === 0 ? undefined : toJsonText(payload);
};

export const hasContent = (document: SettingsDocument): boolean =>
  [...Object.values(document.managed), ...Object.values(document.extras)].some(
    (value) => value !== null && value !== undefined,
  );

/** Load a settings file, validating the keys this tool manages and keeping the rest as-is. */
export const loadSettings = (
  target: string,
  managedSchema: z.ZodObject,
  context: string,
): SettingsDocument => {
  const document = splitSettings(
    readJson5File(target, context),
    Object.keys(managedSchema.shape),
    context,
  );
  parseWith(managedSchema, document.managed, context);
  return document;
};
