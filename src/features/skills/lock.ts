import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { ToolError } from '../../core/errors.ts';
import { isFile } from '../../core/fs.ts';
import { errorMessage, parseWith, toJsonText } from '../../core/json.ts';

const lockVersion = 1;

/** The pin for one git source: the ref the config asked for and the full commit it resolved to. */
export type LockedSource = { ref?: string | undefined; commit: string };

export type SkillsLock = { version: 1; sources: Record<string, LockedSource> };

const lockSchema = z.object({
  version: z.literal(lockVersion),
  sources: z.record(
    z.string(),
    z.object({
      ref: z.string().optional(),
      commit: z
        .string()
        .regex(/^[0-9a-f]{40}$/, 'must be a full 40-character commit sha'),
    }),
  ),
});

const defaultConfigNames = new Set(['config.json', 'skills.json']);

/**
 * One lock per config, committed beside it, so every clone of the consumer pins the same commits
 * and syncing another config never rewrites this one's pins: `.agents/config.json` (or the legacy
 * `.agents/skills.json`) pins in `.agents/agentic-tools.lock`; any other config `<name>.json` in
 * `<name>.lock` next to it.
 */
export const lockFilePath = (configPath: string): string => {
  const directory = path.dirname(configPath);
  const name = path.basename(configPath);
  if (path.basename(directory) === '.agents' && defaultConfigNames.has(name)) {
    return path.join(directory, 'agentic-tools.lock');
  }
  return path.join(
    directory,
    `${path.basename(name, path.extname(name))}.lock`,
  );
};

export const emptyLock = (): SkillsLock => ({
  version: lockVersion,
  sources: {},
});

export const readLock = (lockPath: string): SkillsLock => {
  if (!isFile(lockPath)) {
    return emptyLock();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch (error) {
    throw new ToolError(
      `${lockPath} is not valid JSON: ${errorMessage(error)}`,
    );
  }
  try {
    return parseWith(lockSchema, parsed);
  } catch (error) {
    throw new ToolError(
      `${lockPath} is not a version ${String(lockVersion)} skills lock: ${errorMessage(error)}`,
    );
  }
};

/** Sources sorted by name, so the file changes only when a pin does. */
export const lockText = (lock: SkillsLock): string => {
  const sources: Record<string, LockedSource> = {};
  for (const from of Object.keys(lock.sources).sort()) {
    const entry = lock.sources[from] as LockedSource;
    sources[from] =
      entry.ref === undefined ?
        { commit: entry.commit }
      : { ref: entry.ref, commit: entry.commit };
  }
  return toJsonText({ version: lock.version, sources });
};
