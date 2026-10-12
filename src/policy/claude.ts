import { z } from "zod";
import { isJsonObject, type JsonObject } from "../core/json.ts";
import type { SettingsDocument } from "./schema.ts";

/** The keys of `.claude/settings.json` this tool reads; the rest round-trip untouched. */
export const claudeManagedSchema = z.object({
  permissions: z.looseObject({ deny: z.array(z.string()).optional() }).nullish(),
});

export const claudeManagedOrder = ["permissions"] as const;

const managedRulePrefix = "Read(";

/**
 * Replace the `Read(...)` deny rules with one per protected pattern. Other deny rules and every
 * other permission key are preserved; an emptied `permissions` block is dropped.
 */
export const applyPolicyToClaudeSettings = (settings: SettingsDocument, protectedFiles: string[]): SettingsDocument => {
  const existing = settings.managed["permissions"];
  const permissions: JsonObject = isJsonObject(existing) ? existing : {};
  const currentDeny = Array.isArray(permissions["deny"]) ? (permissions["deny"] as string[]) : [];
  const deny = [
    ...currentDeny.filter((entry) => !entry.startsWith(managedRulePrefix)),
    ...protectedFiles.map((pattern) => `${managedRulePrefix}${pattern})`),
  ];

  const { deny: _previousDeny, ...otherPermissions } = permissions;
  const updated: JsonObject = { deny, ...otherPermissions };
  const hasContent = deny.length > 0 || Object.keys(otherPermissions).length > 0;
  return {
    managed: { ...settings.managed, permissions: hasContent ? updated : null },
    extras: settings.extras,
  };
};
