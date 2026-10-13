import fs from "node:fs";
import path from "node:path";
import { ToolError } from "../../core/errors.ts";
import { exists, isDirectory, isFile } from "../../core/fs.ts";
import type { Output } from "../../core/output.ts";
import { agentsPaths, resolveUserPath } from "../../core/paths.ts";
import { applyConfigAliasRenames, loadConfiguredSources, resolveSyncConfigPath } from "./config.ts";
import { createDirectoryLink, isDirectoryLink, removeDirectoryLink, resolveLinkTarget, resolveLoose } from "./links.ts";
import {
  collectAliasRenames,
  deduplicate,
  discoverSkillManifests,
  exportableVisibility,
  loadSkillAliases,
  lookupManifest,
  resolveSourceSkillsRoot,
  skillFileName,
  toSkillsRoot,
  type AliasMap,
  type ManifestMap,
  type SkillManifest,
} from "./manifest.ts";
import { findOwnPackageRoot, resolveConfiguredSourceRoot } from "./sources.ts";

const shareabilityWizard = "tool-sp-make-skill-shareable";
const repoUrl = "https://github.com/swiftpostlabs/agentic-tools";
const gitignoreFileName = ".gitignore";

/** Where a command runs and who it talks to. `home` is injectable so tests never touch `~`. */
export type SkillsContext = { cwd: string; home: string; output: Output; ownRoot?: string };

const makeShareableHint = (name: string): string =>
  `Recommended next step: use /${shareabilityWizard} on '${name}' to decide whether it should be shareable ` +
  "or repo-local and to add domain, visibility, requires, and reason if needed.";

const contactOwnerHint = (name: string): string =>
  `Recommended next step: contact the owner of '${name}' (see that skill's metadata.shareable-skills.owner) ` +
  `to raise its visibility or to split out a shareable core, or use /${shareabilityWizard} on '${name}'.`;

const legacyMigrationHint = (name: string): string =>
  `Skill '${name}' uses the legacy metadata schema; migrate its frontmatter to the ` +
  `metadata.shareable-skills.* namespace (${repoUrl}).`;

/**
 * A soft nudge for a consumer's own non-public legacy skill. Public legacy skills fail at the export
 * gate, and linked skills are the source owner's migration burden, so neither is warned about here.
 */
const legacyMetadataWarning = (manifest: SkillManifest): string | undefined =>
  manifest.usesLegacyMetadata && !manifest.isLink && manifest.visibility !== "public"
    ? `Warning: ${legacyMigrationHint(manifest.name)}`
    : undefined;

const ensureShareable = (manifest: SkillManifest, manifests: ManifestMap, aliases: AliasMap): void => {
  if (manifest.visibility === undefined) {
    throw new ToolError(`Skill '${manifest.name}' is missing shareability metadata. ${makeShareableHint(manifest.name)}`);
  }
  if (!exportableVisibility.has(manifest.visibility)) {
    const reason = manifest.reason ?? "No reason was provided.";
    throw new ToolError(`Skill '${manifest.name}' is not shareable. ${reason} ${makeShareableHint(manifest.name)}`);
  }
  // A public skill goes to the world, so it must be on the current schema before it is exported.
  if (manifest.usesLegacyMetadata && !manifest.isLink && manifest.visibility === "public") {
    throw new ToolError(
      `Skill '${manifest.name}' is public but still uses the legacy metadata schema. ${legacyMigrationHint(manifest.name)}`,
    );
  }
  for (const dependencyName of manifest.requires) {
    const dependency = lookupManifest(dependencyName, manifests, aliases);
    if (dependency === undefined) {
      throw new ToolError(`Skill '${manifest.name}' depends on unknown skill '${dependencyName}'.`);
    }
    if (dependency.visibility === undefined) {
      throw new ToolError(
        `Skill '${manifest.name}' depends on '${dependencyName}', but that skill is missing shareability metadata. ` +
          makeShareableHint(dependencyName),
      );
    }
    if (!exportableVisibility.has(dependency.visibility)) {
      throw new ToolError(
        `Skill '${manifest.name}' depends on '${dependencyName}', which is not shareable (visibility ` +
          `'${dependency.visibility}'). A shareable skill must not hard-depend on a lower-visibility skill, so this ` +
          `dependency cannot be shipped. ${contactOwnerHint(dependencyName)}`,
      );
    }
  }
};

/** Requested skills plus their `requires` closure, dependencies first, each checked as shareable. */
export const resolveSelectedSkills = (
  manifests: ManifestMap,
  requested: readonly string[],
  aliases: AliasMap = new Map(),
): SkillManifest[] => {
  const resolved: SkillManifest[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (name: string): void => {
    const manifest = lookupManifest(name, manifests, aliases);
    if (manifest === undefined) {
      throw new ToolError(`Unknown skill '${name}'.`);
    }
    if (visited.has(manifest.name)) {
      return;
    }
    if (visiting.has(manifest.name)) {
      throw new ToolError(`Circular skill dependency detected at '${manifest.name}'.`);
    }
    ensureShareable(manifest, manifests, aliases);
    visiting.add(manifest.name);
    manifest.requires.forEach(visit);
    visiting.delete(manifest.name);
    visited.add(manifest.name);
    resolved.push(manifest);
  };

  requested.forEach(visit);
  return resolved;
};

export const describeSkills = (manifests: ManifestMap): string => {
  if (manifests.size === 0) {
    return "No skills found.";
  }
  return [...manifests.keys()]
    .sort()
    .map((name) => {
      const manifest = manifests.get(name) as SkillManifest;
      const requires = manifest.requires.length > 0 ? manifest.requires.join(" ") : "-";
      let line =
        `${manifest.name}: domain ${manifest.domain ?? "missing"}; visibility ${manifest.visibility ?? "missing"}; ` +
        `requires ${requires}`;
      if (manifest.reason !== undefined && manifest.reason !== "") {
        line = `${line}; reason ${manifest.reason}`;
      }
      if (manifest.usesLegacyMetadata && !manifest.isLink) {
        line = `${line}; legacy metadata — migrate to shareable-skills.*`;
      }
      return line;
    })
    .join("\n");
};

const linkSkillDirectory = (manifest: SkillManifest, destinationDir: string, options: { dryRun: boolean; force: boolean }) => {
  const destination = path.join(destinationDir, manifest.name);
  const target = resolveLoose(manifest.directory);
  if (options.dryRun) {
    return `Would link ${destination} -> ${target}`;
  }
  fs.mkdirSync(destinationDir, { recursive: true });

  if (isDirectoryLink(destination)) {
    const existingTarget = resolveLinkTarget(destination);
    if (existingTarget === target) {
      return `Already linked ${destination} -> ${target}`;
    }
    if (!options.force) {
      throw new ToolError(
        `Destination '${destination}' already points to '${existingTarget}'. Use --force to replace it.`,
      );
    }
    removeDirectoryLink(destination);
  } else if (exists(destination)) {
    throw new ToolError(
      `Destination '${destination}' already exists and is not a symlink. Remove it manually before linking.`,
    );
  }

  createDirectoryLink(destination, target);
  return `Linked ${destination} -> ${target}`;
};

const unlinkSkillDirectory = (
  name: string,
  destinationDir: string,
  options: { dryRun: boolean; expectedTarget: string },
): string => {
  const destination = path.join(destinationDir, name);
  if (options.dryRun) {
    return `Would unlink ${destination} -> ${options.expectedTarget}`;
  }
  if (!isDirectoryLink(destination)) {
    if (exists(destination)) {
      throw new ToolError(
        `Destination '${destination}' exists and is not a symlink. Remove it manually if that is intended.`,
      );
    }
    throw new ToolError(`Skill '${name}' is not linked at '${destination}'.`);
  }
  const existingTarget = resolveLinkTarget(destination);
  if (existingTarget !== resolveLoose(options.expectedTarget)) {
    throw new ToolError(`Destination '${destination}' points to '${existingTarget}', not '${options.expectedTarget}'.`);
  }
  removeDirectoryLink(destination);
  return `Unlinked ${destination} -> ${existingTarget}`;
};

const listLinks = (destinationDir: string): string[] => {
  if (!fs.existsSync(destinationDir)) {
    return [];
  }
  if (!isDirectory(destinationDir)) {
    throw new ToolError(`Destination skills path is not a directory: ${destinationDir}`);
  }
  return fs
    .readdirSync(destinationDir)
    .sort()
    .map((child) => path.join(destinationDir, child))
    .filter(isDirectoryLink);
};

const cleanupDeadLinks = (destinationDir: string, dryRun: boolean): string[] =>
  listLinks(destinationDir).flatMap((link) => {
    const target = resolveLinkTarget(link);
    if (exists(target)) {
      return [];
    }
    if (dryRun) {
      return [`Would remove dead link ${link} -> ${target}`];
    }
    removeDirectoryLink(link);
    return [`Removed dead link ${link} -> ${target}`];
  });

const cleanupUnconfiguredLinks = (destinationDir: string, configured: ReadonlySet<string>, dryRun: boolean): string[] =>
  listLinks(destinationDir)
    .filter((link) => !configured.has(path.basename(link)))
    .map((link) => {
      const target = resolveLinkTarget(link);
      if (dryRun) {
        return `Would remove unconfigured link ${link} -> ${target}`;
      }
      removeDirectoryLink(link);
      return `Removed unconfigured link ${link} -> ${target}`;
    });

export const buildSyncedSkillsGitignore = (skillNames: Iterable<string>, sourceUrls: readonly string[] = []): string => {
  const lines = ["# Generated by agentic-tools `skills sync` — do not edit by hand.", `# ${repoUrl}`];
  const urls = deduplicate(sourceUrls);
  if (urls.length > 0) {
    lines.push("# Skills synced from:", ...urls.map((url) => `#   ${url}`));
  }
  lines.push("# Ignores skill symlinks synced into this directory.", ...[...skillNames].sort());
  return `${lines.join("\n")}\n`;
};

const writeSyncedSkillsGitignore = (
  destinationDir: string,
  skillNames: Iterable<string>,
  sourceUrls: readonly string[],
  dryRun: boolean,
): string[] => {
  const gitignorePath = path.join(destinationDir, gitignoreFileName);
  const content = buildSyncedSkillsGitignore(skillNames, sourceUrls);
  if (isFile(gitignorePath) && fs.readFileSync(gitignorePath, "utf8") === content) {
    return [];
  }
  if (dryRun) {
    return [`Would update ${gitignorePath}`];
  }
  fs.mkdirSync(destinationDir, { recursive: true });
  fs.writeFileSync(gitignorePath, content, "utf8");
  return [`Updated ${gitignorePath}`];
};

export type DestinationOptions = { destination: string | undefined; useGlobal: boolean };

const resolveDestinationDir = (context: SkillsContext, options: DestinationOptions): string => {
  if (options.useGlobal && options.destination !== undefined) {
    throw new ToolError("cannot combine --global with --to");
  }
  if (options.useGlobal) {
    return path.join(context.home, agentsPaths.skills);
  }
  return toSkillsRoot(resolveUserPath(options.destination ?? ".", context.cwd, context.home));
};

const resolveSource = (context: SkillsContext, source: string | undefined): string =>
  resolveUserPath(source ?? ".", context.cwd, context.home);

const describeAliasRedirects = (requested: readonly string[], manifests: ManifestMap, aliases: AliasMap): string[] =>
  [...collectAliasRenames(requested, manifests, aliases)].map(
    ([oldName, newName]) =>
      `Note: skill '${oldName}' was renamed to '${newName}'; update your configuration to use the new name.`,
  );

export const runSkillsList = (context: SkillsContext, source: string | undefined): void => {
  context.output.info(describeSkills(discoverSkillManifests(resolveSource(context, source))));
};

export const runSkillsLink = (
  context: SkillsContext,
  options: DestinationOptions & { skills: string[]; source: string | undefined; dryRun: boolean; force: boolean },
): void => {
  const destinationDir = resolveDestinationDir(context, options);
  const sourcePath = resolveSource(context, options.source);
  const manifests = discoverSkillManifests(sourcePath);
  const aliases = loadSkillAliases(sourcePath);
  const requested = deduplicate(options.skills);

  describeAliasRedirects(requested, manifests, aliases).forEach(context.output.info);
  for (const manifest of resolveSelectedSkills(manifests, requested, aliases)) {
    const warning = legacyMetadataWarning(manifest);
    if (warning !== undefined) {
      context.output.info(warning);
    }
    context.output.info(linkSkillDirectory(manifest, destinationDir, options));
  }
};

export const runSkillsUnlink = (
  context: SkillsContext,
  options: DestinationOptions & { skills: string[]; source: string | undefined; dryRun: boolean },
): void => {
  const destinationDir = resolveDestinationDir(context, options);
  const sourcePath = resolveSource(context, options.source);
  for (const name of deduplicate(options.skills)) {
    const skillDirectory = path.join(resolveSourceSkillsRoot(sourcePath), name);
    if (!exists(path.join(skillDirectory, skillFileName))) {
      throw new ToolError(`Could not find source skill '${name}' at ${skillDirectory}`);
    }
    context.output.info(
      unlinkSkillDirectory(name, destinationDir, { dryRun: options.dryRun, expectedTarget: resolveLoose(skillDirectory) }),
    );
  }
};

const describeBySource = (heading: string, entries: Array<[string, string[]]>): string =>
  [heading, ...entries.map(([source, names]) => `- source '${source}': ${names.join(", ")}`)].join("\n");

/**
 * Link every skill declared in the skills config, prune dead and unconfigured links, heal renamed
 * names in the config, and regenerate the destination's `.gitignore`.
 */
export const runSkillsSync = (
  context: SkillsContext,
  options: DestinationOptions & { config: string | undefined; dryRun: boolean; force: boolean },
): void => {
  const destinationDir = resolveDestinationDir(context, options);
  const destination = resolveUserPath(options.destination ?? ".", context.cwd, context.home);
  const configPath = resolveSyncConfigPath({
    destination,
    useGlobal: options.useGlobal,
    rawConfig: options.config,
    cwd: context.cwd,
    home: context.home,
  });
  const ownRoot = context.ownRoot ?? findOwnPackageRoot();

  const missingBySource: Array<[string, string[]]> = [];
  const skippedBySource: Array<[string, string[]]> = [];
  const manifestsToLink: SkillManifest[] = [];
  const renamesBySource = new Map<number, Map<string, string>>();
  const sourceUrls: string[] = [];
  const linkedNames = new Set<string>();

  loadConfiguredSources(configPath).forEach((configured, index) => {
    const sourceRoot = resolveConfiguredSourceRoot({ source: configured.from, configPath, home: context.home, ownRoot });
    const manifests = discoverSkillManifests(sourceRoot);
    const aliases = loadSkillAliases(sourceRoot);
    const requested = deduplicate(configured.skills);

    const missing = requested.filter((name) => lookupManifest(name, manifests, aliases) === undefined);
    if (missing.length > 0) {
      missingBySource.push([configured.from, missing]);
      return;
    }

    // A directly requested skill that exists but is not shippable is reported and skipped. A
    // non-shippable skill pulled in as a dependency is different: resolveSelectedSkills fails hard.
    const unshippable = requested.filter((name) => {
      const visibility = lookupManifest(name, manifests, aliases)?.visibility;
      return visibility === undefined || !exportableVisibility.has(visibility);
    });
    if (unshippable.length > 0) {
      skippedBySource.push([configured.from, unshippable]);
    }
    const shippable = requested.filter((name) => !unshippable.includes(name));

    const renames = collectAliasRenames(shippable, manifests, aliases);
    if (renames.size > 0) {
      renamesBySource.set(index, renames);
    }
    if (configured.url !== undefined) {
      sourceUrls.push(configured.url);
    }

    for (const manifest of resolveSelectedSkills(manifests, shippable, aliases)) {
      if (linkedNames.has(manifest.name)) {
        throw new ToolError(`Skill '${manifest.name}' is configured more than once across sync sources.`);
      }
      manifestsToLink.push(manifest);
      linkedNames.add(manifest.name);
    }
  });

  if (missingBySource.length > 0) {
    throw new ToolError(describeBySource("Skills config references missing skills:", missingBySource));
  }
  if (skippedBySource.length > 0) {
    context.output.info(
      describeBySource(
        "Skipped skills that are not shippable to another repo (repo-local or otherwise non-exportable):",
        skippedBySource,
      ),
    );
  }

  const messages = [
    ...applyConfigAliasRenames(configPath, renamesBySource, options.dryRun),
    ...cleanupDeadLinks(destinationDir, options.dryRun),
    ...cleanupUnconfiguredLinks(destinationDir, linkedNames, options.dryRun),
  ];
  messages.forEach(context.output.info);

  for (const manifest of manifestsToLink) {
    const warning = legacyMetadataWarning(manifest);
    if (warning !== undefined) {
      context.output.info(warning);
    }
    context.output.info(linkSkillDirectory(manifest, destinationDir, options));
  }
  writeSyncedSkillsGitignore(destinationDir, linkedNames, sourceUrls, options.dryRun).forEach(context.output.info);
};
