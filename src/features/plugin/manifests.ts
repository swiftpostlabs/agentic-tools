/**
 * Build the plugin and marketplace manifests from the skills catalog.
 *
 * No agent client has a concept of skill-level visibility: a plugin publishes exactly the skill
 * directories its manifest enumerates. This enumeration is therefore the only thing keeping a
 * `repo-local` skill out of a published plugin, which is why it is generated from
 * `shareable-skills.visibility` rather than maintained by hand. See
 * `ref-sp-agents-plugin-marketplaces`.
 *
 * The manifests live under `.claude-plugin/`, which Claude Code, GitHub Copilot CLI, and VS Code all
 * detect, so one generated set serves every client.
 */
import fs from 'node:fs';
import path from 'node:path';
import JSON5 from 'json5';
import { z } from 'zod';
import { ToolError } from '../../core/errors.ts';
import { parseFrontmatter } from '../../core/frontmatter.ts';
import {
  isDirectory,
  isFile,
  listSorted,
  readTextOrUndefined,
  writeText,
} from '../../core/fs.ts';
import {
  errorMessage,
  isJsonObject,
  parseWith,
  toJsonText,
  type JsonObject,
} from '../../core/json.ts';
import { agentsPaths } from '../../core/paths.ts';

export const pluginManifestPath = '.claude-plugin/plugin.json';
export const marketplaceManifestPath = '.claude-plugin/marketplace.json';
const versionPath = 'VERSION';
const visibilityKey = 'metadata.shareable-skills.visibility';

const pluginConfigSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  marketplace: z.object({
    name: z.string(),
    owner: z.object({
      name: z.string(),
      email: z.string().optional(),
      url: z.string().optional(),
    }),
  }),
  category: z.string().optional(),
  license: z.string().optional(),
  repository: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  skillsRoot: z.string().default('.agents/skills'),
  publishVisibility: z.array(z.string()).default(['public']),
});

export type PluginConfig = z.output<typeof pluginConfigSchema>;
export type PublishableSkill = {
  name: string;
  visibility: string;
  path: string;
};
export type ManifestSet = { plugin: string; marketplace: string };

export const readVersion = (root: string): string =>
  fs.readFileSync(path.join(root, versionPath), 'utf8').trim();

export const readPluginConfig = (root: string): PluginConfig => {
  let parsed: unknown;
  try {
    parsed = JSON5.parse(
      fs.readFileSync(path.join(root, agentsPaths.config), 'utf8'),
    );
  } catch (error) {
    throw new ToolError(
      `${agentsPaths.config} could not be read: ${errorMessage(error)}`,
    );
  }
  if (!isJsonObject(parsed)) {
    throw new ToolError(`${agentsPaths.config} must contain a JSON object`);
  }
  if (parsed['plugin'] === undefined || parsed['plugin'] === null) {
    throw new ToolError(
      `${agentsPaths.config} is missing the 'plugin' section`,
    );
  }
  return parseWith(pluginConfigSchema, parsed['plugin'], 'plugin config');
};

/** Select the skills whose visibility permits publication. */
export const collectPublishableSkills = (
  root: string,
  config: PluginConfig,
): PublishableSkill[] => {
  const skillsRoot = path.join(root, config.skillsRoot);
  if (!isDirectory(skillsRoot)) {
    throw new ToolError(`skills root not found: ${config.skillsRoot}`);
  }

  const allowed = new Set(config.publishVisibility);
  const published: PublishableSkill[] = [];
  for (const name of listSorted(skillsRoot)) {
    const skillFile = path.join(skillsRoot, name, 'SKILL.md');
    if (!isFile(skillFile)) {
      continue;
    }
    let fields: Map<string, string>;
    try {
      fields = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
    } catch (error) {
      throw new ToolError(`${name}: ${errorMessage(error)}`);
    }
    const visibility = fields.get(visibilityKey);
    if (visibility === undefined) {
      throw new ToolError(`${name}: missing shareable-skills.visibility`);
    }
    if (allowed.has(visibility)) {
      published.push({
        name,
        visibility,
        path: `./${config.skillsRoot}/${name}`,
      });
    }
  }

  if (published.length === 0) {
    throw new ToolError('no skills matched the configured publish visibility');
  }
  return published;
};

/**
 * `.claude-plugin/plugin.json`. `version` lives here and only here: Claude resolves plugin.json's
 * version ahead of the marketplace entry's and silently ignores the latter, so declaring it in both
 * would let a stale value mask the real one.
 */
export const buildPluginManifest = (
  config: PluginConfig,
  version: string,
  skills: PublishableSkill[],
): JsonObject => ({
  name: config.name,
  displayName: config.displayName,
  version,
  description: config.description,
  ...(config.license === undefined ? {} : { license: config.license }),
  ...(config.repository === undefined ? {} : { repository: config.repository }),
  ...(config.keywords.length === 0 ? {} : { keywords: config.keywords }),
  skills: skills.map((skill) => skill.path),
});

/**
 * `.claude-plugin/marketplace.json`. The plugin's source is the marketplace root, so the plugin root
 * is the repo root and the enumerated skill paths never traverse outside it.
 */
export const buildMarketplaceManifest = (
  config: PluginConfig,
  version: string,
): JsonObject => {
  const { owner } = config.marketplace;
  return {
    name: config.marketplace.name,
    owner: {
      name: owner.name,
      ...(owner.email === undefined ? {} : { email: owner.email }),
      ...(owner.url === undefined ? {} : { url: owner.url }),
    },
    metadata: { description: config.description, version },
    plugins: [
      {
        name: config.name,
        source: './',
        description: config.description,
        ...(config.category === undefined ? {} : { category: config.category }),
        ...(config.keywords.length === 0 ? {} : { keywords: config.keywords }),
      },
    ],
  };
};

export const buildManifests = (root: string): ManifestSet => {
  const config = readPluginConfig(root);
  const version = readVersion(root);
  return {
    plugin: toJsonText(
      buildPluginManifest(
        config,
        version,
        collectPublishableSkills(root, config),
      ),
    ),
    marketplace: toJsonText(buildMarketplaceManifest(config, version)),
  };
};

const manifestEntries = (manifests: ManifestSet): Array<[string, string]> => [
  [pluginManifestPath, manifests.plugin],
  [marketplaceManifestPath, manifests.marketplace],
];

/** Write both manifests and return the repo-relative paths written. */
export const writeManifests = (
  root: string,
  manifests: ManifestSet,
): string[] =>
  manifestEntries(manifests).map(([relative, content]) => {
    writeText(path.join(root, relative), content);
    return relative;
  });

/** The manifests on disk that differ from a fresh build. */
export const findDriftedManifests = (
  root: string,
  manifests: ManifestSet,
): string[] =>
  manifestEntries(manifests)
    .filter(
      ([relative, expected]) =>
        readTextOrUndefined(path.join(root, relative)) !== expected,
    )
    .map(([relative]) => relative);
