import fs from 'node:fs';
import path from 'node:path';
import { ToolError } from '../../core/errors.ts';
import { parseFrontmatter } from '../../core/frontmatter.ts';
import { exists, isDirectory, isFile, listSorted } from '../../core/fs.ts';
import { isJsonObject } from '../../core/json.ts';
import { agentsFileNames, agentsPaths } from '../../core/paths.ts';
import { isDirectoryLink } from './links.ts';

export const skillFileName = 'SKILL.md';
export const exportableVisibility: ReadonlySet<string> = new Set([
  'public',
  'organization',
]);

/**
 * Frozen transition shim: skills authored against the pre-namespace schema still resolve. Each
 * canonical `shareable-skills.*` key maps to the bare key it replaced; the namespaced key wins when
 * both are present. The set is closed. See `ref-sp-agents-shareable-skills/references/spec.md` §9.
 */
const legacyMetadataKeys = {
  'shareable-skills.domain': 'scope',
  'shareable-skills.visibility': 'visibility',
  'shareable-skills.requires': 'requires',
  'shareable-skills.reason': 'reason',
} as const;

type PortabilityField = keyof typeof legacyMetadataKeys;

/** The old two-tier "shareable" did not separate org-wide from public, so it maps conservatively. */
const legacyVisibilityValues: Readonly<Record<string, string>> = {
  shareable: 'organization',
};

const aliasRegistryPath = [
  'ref-sp-agents-shareable-skills',
  'references',
  'registry.json',
] as const;

export type SkillManifest = {
  name: string;
  directory: string;
  domain: string | undefined;
  visibility: string | undefined;
  requires: string[];
  reason: string | undefined;
  /** Read through a legacy bare key or legacy visibility value: not yet migrated. */
  usesLegacyMetadata: boolean;
  /** The skill directory is a link (symlink or junction), i.e. linked in from a source we own. */
  isLink: boolean;
};

export type ManifestMap = Map<string, SkillManifest>;
export type AliasMap = Map<string, string>;

/** `requires` is whitespace- or comma-delimited, matching the sharing spec and validator. */
export const splitRequires = (value: string | undefined): string[] =>
  value === undefined ?
    []
  : value
      .replaceAll(',', ' ')
      .split(/\s+/)
      .filter((entry) => entry !== '');

const readPortabilityField = (
  metadata: Map<string, string>,
  field: PortabilityField,
): { value: string | undefined; legacy: boolean } => {
  const value = metadata.get(`metadata.${field}`);
  if (value !== undefined) {
    return { value, legacy: false };
  }
  const legacyValue = metadata.get(`metadata.${legacyMetadataKeys[field]}`);
  return legacyValue === undefined ?
      { value: undefined, legacy: false }
    : { value: legacyValue, legacy: true };
};

const isSkillsRoot = (target: string): boolean =>
  path.basename(target) === agentsFileNames.skills &&
  path.basename(path.dirname(target)) === agentsFileNames.root;

export const toSkillsRoot = (target: string): string =>
  isSkillsRoot(target) ? target : path.join(target, agentsPaths.skills);

export const toRepoRoot = (target: string): string =>
  isSkillsRoot(target) ? path.dirname(path.dirname(target)) : target;

const containsSkills = (directory: string): boolean =>
  isDirectory(directory) &&
  fs
    .readdirSync(directory)
    .some((child) => isFile(path.join(directory, child, skillFileName)));

/** Accept a repo root, an exact `.agents/skills` directory, or any directory holding skill folders. */
export const resolveSourceSkillsRoot = (source: string): string => {
  const skillsRoot = toSkillsRoot(source);
  if (exists(skillsRoot)) {
    if (!isDirectory(skillsRoot)) {
      throw new ToolError(
        `Skills directory path is not a directory: ${skillsRoot}`,
      );
    }
    return skillsRoot;
  }
  if (containsSkills(source)) {
    return source;
  }
  throw new ToolError(`Could not find skills directory at ${skillsRoot}`);
};

export const readSkillManifest = (skillDirectory: string): SkillManifest => {
  const fields = parseFrontmatter(
    fs.readFileSync(path.join(skillDirectory, skillFileName), 'utf8'),
  );
  const name = fields.get('name');
  if (name === undefined || name === '') {
    throw new ToolError(`Skill at ${skillDirectory} is missing a valid name.`);
  }
  const directoryName = path.basename(skillDirectory);
  if (name !== directoryName) {
    throw new ToolError(
      `Skill name '${name}' does not match directory '${directoryName}'.`,
    );
  }

  const domain = readPortabilityField(fields, 'shareable-skills.domain');
  const visibility = readPortabilityField(
    fields,
    'shareable-skills.visibility',
  );
  const legacyVisibilityValue =
    visibility.value === undefined ?
      undefined
    : legacyVisibilityValues[visibility.value];
  const requires = readPortabilityField(fields, 'shareable-skills.requires');
  const reason = readPortabilityField(fields, 'shareable-skills.reason');

  return {
    name,
    directory: skillDirectory,
    domain: domain.value,
    visibility: legacyVisibilityValue ?? visibility.value,
    requires: splitRequires(requires.value),
    reason: reason.value,
    usesLegacyMetadata:
      domain.legacy ||
      visibility.legacy ||
      legacyVisibilityValue !== undefined ||
      requires.legacy ||
      reason.legacy,
    isLink: isDirectoryLink(skillDirectory),
  };
};

export const discoverSkillManifests = (source: string): ManifestMap => {
  const skillsRoot = resolveSourceSkillsRoot(source);
  const manifests: ManifestMap = new Map();
  for (const child of listSorted(skillsRoot)) {
    const directory = path.join(skillsRoot, child);
    if (
      !isDirectory(directory) ||
      !exists(path.join(directory, skillFileName))
    ) {
      continue;
    }
    const manifest = readSkillManifest(directory);
    manifests.set(manifest.name, manifest);
  }
  return manifests;
};

/**
 * Read the source's rename registry so pre-rename names still resolve. A missing or malformed
 * registry degrades to no aliases rather than failing on its own.
 */
export const loadSkillAliases = (source: string): AliasMap => {
  const registryPath = path.join(
    resolveSourceSkillsRoot(source),
    ...aliasRegistryPath,
  );
  const aliases: AliasMap = new Map();
  if (!isFile(registryPath)) {
    return aliases;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch {
    return aliases;
  }
  const rawAliases = isJsonObject(parsed) ? parsed['aliases'] : undefined;
  if (!isJsonObject(rawAliases)) {
    return aliases;
  }
  for (const [oldName, newName] of Object.entries(rawAliases)) {
    if (typeof newName === 'string') {
      aliases.set(oldName, newName);
    }
  }
  return aliases;
};

export const lookupManifest = (
  name: string,
  manifests: ManifestMap,
  aliases: AliasMap,
): SkillManifest | undefined => {
  const direct = manifests.get(name);
  if (direct !== undefined) {
    return direct;
  }
  const canonical = aliases.get(name);
  return canonical === undefined ? undefined : manifests.get(canonical);
};

export const deduplicate = (items: Iterable<string>): string[] => [
  ...new Set(items),
];

/** Map each requested pre-rename name to the canonical skill it resolves to. */
export const collectAliasRenames = (
  requested: Iterable<string>,
  manifests: ManifestMap,
  aliases: AliasMap,
): Map<string, string> => {
  const renames = new Map<string, string>();
  for (const name of deduplicate(requested)) {
    const canonical = aliases.get(name);
    if (
      !manifests.has(name) &&
      canonical !== undefined &&
      manifests.has(canonical)
    ) {
      renames.set(name, canonical);
    }
  }
  return renames;
};
