import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { ToolError } from '../../core/errors.ts';
import { exists, isFile } from '../../core/fs.ts';
import {
  errorMessage,
  isJsonObject,
  parseWith,
  toJsonText,
  type JsonObject,
} from '../../core/json.ts';
import {
  agentsFileNames,
  agentsPaths,
  resolveUserPath,
} from '../../core/paths.ts';
import { deduplicate, toRepoRoot } from './manifest.ts';

const skillsSection = 'skills';

export type ConfiguredSource = {
  from: string;
  skills: string[];
  url: string | undefined;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/** One `sources[]` entry. Messages name the source so a long config stays debuggable. */
const sourceSchema = (index: number) =>
  z
    .looseObject({
      from: z.unknown().optional(),
      url: z.unknown().optional(),
      skills: z.unknown().optional(),
    })
    .transform((source, context): ConfiguredSource => {
      if (!isNonEmptyString(source.from)) {
        context.addIssue({
          code: 'custom',
          message: `Skills config source #${index} is missing a non-empty 'from' value.`,
        });
        return z.NEVER;
      }
      const label = `Skills config source '${source.from}' skills`;
      if (!Array.isArray(source.skills)) {
        context.addIssue({
          code: 'custom',
          message: `${label} must be an array of strings.`,
        });
        return z.NEVER;
      }
      if (!source.skills.every(isNonEmptyString)) {
        context.addIssue({
          code: 'custom',
          message: `${label} must contain only non-empty strings.`,
        });
        return z.NEVER;
      }
      if (source.skills.length === 0) {
        context.addIssue({
          code: 'custom',
          message: `${label} must not be empty.`,
        });
        return z.NEVER;
      }
      return {
        from: source.from,
        skills: source.skills,
        url: isNonEmptyString(source.url) ? source.url.trim() : undefined,
      };
    });

const fail = (message: string): never => {
  throw new ToolError(message);
};

/** Parse a skills config: either `.agents/config.json` with a `skills` section, or a bare one. */
export const parseConfiguredSources = (text: string): ConfiguredSource[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return fail(`Skills config is not valid JSON: ${errorMessage(error)}`);
  }
  if (!isJsonObject(parsed)) {
    return fail('Skills config must be a JSON object.');
  }
  const section = skillsSection in parsed ? parsed[skillsSection] : parsed;
  if (!isJsonObject(section)) {
    return fail('Agents config skills must be a JSON object.');
  }
  const rawSources = section['sources'];
  if (!Array.isArray(rawSources) || rawSources.length === 0) {
    return fail("Skills config must define a non-empty 'sources' array.");
  }

  return rawSources.map((rawSource: unknown, offset) => {
    const index = offset + 1;
    if (!isJsonObject(rawSource)) {
      return fail(`Skills config source #${index} must be a JSON object.`);
    }
    return parseWith(sourceSchema(index), rawSource);
  });
};

export const loadConfiguredSources = (
  configPath: string,
): ConfiguredSource[] => {
  if (!exists(configPath)) {
    return fail(`Could not find skills config at ${configPath}`);
  }
  if (!isFile(configPath)) {
    return fail(`Skills config path is not a file: ${configPath}`);
  }
  return parseConfiguredSources(fs.readFileSync(configPath, 'utf8'));
};

const agentsConfigHasSkills = (configPath: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return !isJsonObject(parsed) || isJsonObject(parsed[skillsSection]);
  } catch {
    return true;
  }
};

/** `--config` wins; otherwise `.agents/config.json`, falling back to the legacy `.agents/skills.json`. */
export const resolveSyncConfigPath = (options: {
  destination: string;
  useGlobal: boolean;
  rawConfig: string | undefined;
  cwd: string;
  home: string;
}): string => {
  if (options.rawConfig !== undefined) {
    return resolveUserPath(options.rawConfig, options.cwd, options.home);
  }
  if (options.useGlobal) {
    return fail('sync with --global requires --config');
  }
  const repoRoot = toRepoRoot(options.destination);
  const agentsConfig = path.join(repoRoot, agentsPaths.config);
  const legacyConfig = path.join(repoRoot, agentsPaths.skillsConfig);
  if (
    isFile(agentsConfig) &&
    (agentsConfigHasSkills(agentsConfig) || !isFile(legacyConfig))
  ) {
    return agentsConfig;
  }
  return isFile(legacyConfig) ? legacyConfig : agentsConfig;
};

/** Relative sources resolve from the repo that owns the config, not from the shell's directory. */
export const configBaseRoot = (configPath: string): string => {
  const parent = path.dirname(configPath);
  return path.basename(parent) === agentsFileNames.root ?
      path.dirname(parent)
    : parent;
};

/**
 * Rewrite pre-rename skill names in the config to their canonical names, so the stored name
 * converges instead of relying on the alias forever.
 */
export const applyConfigAliasRenames = (
  configPath: string,
  renamesBySource: Map<number, Map<string, string>>,
  dryRun: boolean,
): string[] => {
  if (renamesBySource.size === 0) {
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as JsonObject;
  const section = isJsonObject(raw[skillsSection]) ? raw[skillsSection] : raw;
  const sources = section['sources'] as Array<{ skills: string[] }>;

  const messages: string[] = [];
  let changed = false;
  for (const [index, renames] of renamesBySource) {
    const source = sources[index];
    if (source === undefined) {
      continue;
    }
    const updated = deduplicate(
      source.skills.map((name) => renames.get(name) ?? name),
    );
    if (
      updated.length === source.skills.length &&
      updated.every((name, position) => name === source.skills[position])
    ) {
      continue;
    }
    for (const [oldName, newName] of renames) {
      messages.push(
        `${dryRun ? 'Would update' : 'Updated'} config: '${oldName}' -> '${newName}'`,
      );
    }
    if (!dryRun) {
      source.skills = updated;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(configPath, toJsonText(raw), 'utf8');
  }
  return messages;
};
