import fs from 'node:fs';
import path from 'node:path';
import { ToolError } from '../../core/errors.ts';
import { exists, isDirectory, isFile } from '../../core/fs.ts';
import type { Output } from '../../core/output.ts';
import { agentsPaths, resolveUserPath } from '../../core/paths.ts';
import {
  applyConfigAliasRenames,
  configBaseRoot,
  loadConfiguredSources,
  resolveSyncConfigPath,
} from './config.ts';
import {
  listExportFolders,
  parseGitSource,
  readExportMarker,
  removeExport,
  toolsHomeDirectory,
  withLock,
  type LockWait,
} from './git.ts';
import { prepareGitSource, sourcesDirectory } from './gitSources.ts';
import { lockFilePath, lockText, readLock, type SkillsLock } from './lock.ts';
import {
  createDirectoryLink,
  isDirectoryLink,
  removeDirectoryLink,
  resolveLinkTarget,
  resolveLoose,
} from './links.ts';
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
} from './manifest.ts';
import { findOwnPackageRoot, resolveConfiguredSourceRoot } from './sources.ts';

const shareabilityWizard = 'tool-sp-make-skill-shareable';
const repoUrl = 'https://github.com/swiftpostlabs/agentic-tools';
const gitignoreFileName = '.gitignore';

/** Where a command runs and who it talks to. `home` is injectable so tests never touch `~`. */
export type SkillsContext = {
  cwd: string;
  home: string;
  output: Output;
  ownRoot?: string;
  /** Where bare clones live; defaults to `$AGENTIC_TOOLS_HOME` or `~/.agents/agentic-tools`. */
  toolsHome?: string;
  /** How long to wait for another sync's lock; tests set it low. */
  lockWaitMs?: number;
};

const makeShareableHint = (name: string): string =>
  `Recommended next step: use /${shareabilityWizard} on '${name}' to decide whether it should be shareable ` +
  'or repo-local and to add domain, visibility, requires, and reason if needed.';

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
  (
    manifest.usesLegacyMetadata &&
    !manifest.isLink &&
    manifest.visibility !== 'public'
  ) ?
    `Warning: ${legacyMigrationHint(manifest.name)}`
  : undefined;

const ensureShareable = (
  manifest: SkillManifest,
  manifests: ManifestMap,
  aliases: AliasMap,
): void => {
  if (manifest.visibility === undefined) {
    throw new ToolError(
      `Skill '${manifest.name}' is missing shareability metadata. ${makeShareableHint(manifest.name)}`,
    );
  }
  if (!exportableVisibility.has(manifest.visibility)) {
    const reason = manifest.reason ?? 'No reason was provided.';
    throw new ToolError(
      `Skill '${manifest.name}' is not shareable. ${reason} ${makeShareableHint(manifest.name)}`,
    );
  }
  // A public skill goes to the world, so it must be on the current schema before it is exported.
  if (
    manifest.usesLegacyMetadata &&
    !manifest.isLink &&
    manifest.visibility === 'public'
  ) {
    throw new ToolError(
      `Skill '${manifest.name}' is public but still uses the legacy metadata schema. ${legacyMigrationHint(manifest.name)}`,
    );
  }
  for (const dependencyName of manifest.requires) {
    const dependency = lookupManifest(dependencyName, manifests, aliases);
    if (dependency === undefined) {
      throw new ToolError(
        `Skill '${manifest.name}' depends on unknown skill '${dependencyName}'.`,
      );
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
      throw new ToolError(
        `Circular skill dependency detected at '${manifest.name}'.`,
      );
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
    return 'No skills found.';
  }
  return [...manifests.keys()]
    .sort()
    .map((name) => {
      const manifest = manifests.get(name) as SkillManifest;
      const requires =
        manifest.requires.length > 0 ? manifest.requires.join(' ') : '-';
      let line =
        `${manifest.name}: domain ${manifest.domain ?? 'missing'}; visibility ${manifest.visibility ?? 'missing'}; ` +
        `requires ${requires}`;
      if (manifest.reason !== undefined && manifest.reason !== '') {
        line = `${line}; reason ${manifest.reason}`;
      }
      if (manifest.usesLegacyMetadata && !manifest.isLink) {
        line = `${line}; legacy metadata — migrate to shareable-skills.*`;
      }
      return line;
    })
    .join('\n');
};

/**
 * A link into one of this repo's own git exports (a folder carrying the export marker) is the
 * tool's to move when the pin changes; any other link still needs --force.
 */
const isExportLink = (
  target: string,
  sourcesDir: string | undefined,
): boolean => {
  if (sourcesDir === undefined) {
    return false;
  }
  const relative = path.relative(sourcesDir, target);
  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    return false;
  }
  const exportFolder = path.join(
    sourcesDir,
    relative.split(path.sep)[0] as string,
  );
  // A link into an export that is gone (an emptied .agents/local) is the tool's own dead link.
  return !exists(exportFolder) || readExportMarker(exportFolder) !== undefined;
};

const linkSkillDirectory = (
  manifest: SkillManifest,
  destinationDir: string,
  options: { dryRun: boolean; force: boolean; replaceableRoot?: string },
) => {
  const destination = path.join(destinationDir, manifest.name);
  const target = resolveLoose(manifest.directory);
  // A dry run makes the same checks as a real one and stops before the first write.
  if (isDirectoryLink(destination)) {
    const existingTarget = resolveLinkTarget(destination);
    if (existingTarget === target) {
      return `Already linked ${destination} -> ${target}`;
    }
    if (
      !options.force &&
      !isExportLink(existingTarget, options.replaceableRoot)
    ) {
      throw new ToolError(
        `Destination '${destination}' already points to '${existingTarget}'. Use --force to replace it.`,
      );
    }
    if (options.dryRun) {
      return `Would replace ${destination} -> ${target}`;
    }
    removeDirectoryLink(destination);
  } else if (exists(destination)) {
    throw new ToolError(
      `Destination '${destination}' already exists and is not a symlink. Remove it manually before linking.`,
    );
  }

  if (options.dryRun) {
    return `Would link ${destination} -> ${target}`;
  }
  fs.mkdirSync(destinationDir, { recursive: true });
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
    throw new ToolError(
      `Destination '${destination}' points to '${existingTarget}', not '${options.expectedTarget}'.`,
    );
  }
  removeDirectoryLink(destination);
  return `Unlinked ${destination} -> ${existingTarget}`;
};

const listLinks = (destinationDir: string): string[] => {
  if (!fs.existsSync(destinationDir)) {
    return [];
  }
  if (!isDirectory(destinationDir)) {
    throw new ToolError(
      `Destination skills path is not a directory: ${destinationDir}`,
    );
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

const cleanupUnconfiguredLinks = (
  destinationDir: string,
  configured: ReadonlySet<string>,
  dryRun: boolean,
): string[] =>
  listLinks(destinationDir)
    .filter((link) => !configured.has(path.basename(link)))
    // A dead link is already reported, and in a real run removed, by cleanupDeadLinks.
    .filter((link) => exists(resolveLinkTarget(link)))
    .map((link) => {
      const target = resolveLinkTarget(link);
      if (dryRun) {
        return `Would remove unconfigured link ${link} -> ${target}`;
      }
      removeDirectoryLink(link);
      return `Removed unconfigured link ${link} -> ${target}`;
    });

export const buildSyncedSkillsGitignore = (
  skillNames: Iterable<string>,
  sourceUrls: readonly string[] = [],
): string => {
  const lines = [
    '# Generated by agentic-tools `skills sync` — do not edit by hand.',
    `# ${repoUrl}`,
  ];
  const urls = deduplicate(sourceUrls);
  if (urls.length > 0) {
    lines.push('# Skills synced from:', ...urls.map((url) => `#   ${url}`));
  }
  lines.push(
    '# Ignores skill symlinks synced into this directory.',
    ...[...skillNames].sort(),
  );
  return `${lines.join('\n')}\n`;
};

const writeSyncedSkillsGitignore = (
  destinationDir: string,
  skillNames: Iterable<string>,
  sourceUrls: readonly string[],
  dryRun: boolean,
): string[] => {
  const gitignorePath = path.join(destinationDir, gitignoreFileName);
  const content = buildSyncedSkillsGitignore(skillNames, sourceUrls);
  if (
    isFile(gitignorePath) &&
    fs.readFileSync(gitignorePath, 'utf8') === content
  ) {
    return [];
  }
  if (dryRun) {
    return [`Would update ${gitignorePath}`];
  }
  fs.mkdirSync(destinationDir, { recursive: true });
  fs.writeFileSync(gitignorePath, content, 'utf8');
  return [`Updated ${gitignorePath}`];
};

export type DestinationOptions = {
  destination: string | undefined;
  useGlobal: boolean;
};

const resolveDestinationDir = (
  context: SkillsContext,
  options: DestinationOptions,
): string => {
  if (options.useGlobal && options.destination !== undefined) {
    throw new ToolError('cannot combine --global with --to');
  }
  if (options.useGlobal) {
    return path.join(context.home, agentsPaths.skills);
  }
  return toSkillsRoot(
    resolveUserPath(options.destination ?? '.', context.cwd, context.home),
  );
};

const resolveSource = (
  context: SkillsContext,
  source: string | undefined,
): string => resolveUserPath(source ?? '.', context.cwd, context.home);

const describeAliasRedirects = (
  requested: readonly string[],
  manifests: ManifestMap,
  aliases: AliasMap,
): string[] =>
  [...collectAliasRenames(requested, manifests, aliases)].map(
    ([oldName, newName]) =>
      `Note: skill '${oldName}' was renamed to '${newName}'; update your configuration to use the new name.`,
  );

export const runSkillsList = (
  context: SkillsContext,
  source: string | undefined,
): void => {
  context.output.info(
    describeSkills(discoverSkillManifests(resolveSource(context, source))),
  );
};

export const runSkillsLink = (
  context: SkillsContext,
  options: DestinationOptions & {
    skills: string[];
    source: string | undefined;
    dryRun: boolean;
    force: boolean;
  },
): void => {
  const destinationDir = resolveDestinationDir(context, options);
  const sourcePath = resolveSource(context, options.source);
  const manifests = discoverSkillManifests(sourcePath);
  const aliases = loadSkillAliases(sourcePath);
  const requested = deduplicate(options.skills);

  describeAliasRedirects(requested, manifests, aliases).forEach(
    context.output.warn,
  );
  for (const manifest of resolveSelectedSkills(manifests, requested, aliases)) {
    const warning = legacyMetadataWarning(manifest);
    if (warning !== undefined) {
      context.output.warn(warning);
    }
    context.output.info(linkSkillDirectory(manifest, destinationDir, options));
  }
};

export const runSkillsUnlink = (
  context: SkillsContext,
  options: DestinationOptions & {
    skills: string[];
    source: string | undefined;
    dryRun: boolean;
  },
): void => {
  const destinationDir = resolveDestinationDir(context, options);
  const sourcePath = resolveSource(context, options.source);
  for (const name of deduplicate(options.skills)) {
    const skillDirectory = path.join(resolveSourceSkillsRoot(sourcePath), name);
    if (!exists(path.join(skillDirectory, skillFileName))) {
      throw new ToolError(
        `Could not find source skill '${name}' at ${skillDirectory}`,
      );
    }
    context.output.info(
      unlinkSkillDirectory(name, destinationDir, {
        dryRun: options.dryRun,
        expectedTarget: resolveLoose(skillDirectory),
      }),
    );
  }
};

const describeBySource = (
  heading: string,
  entries: Array<[string, string[]]>,
): string =>
  [
    heading,
    ...entries.map(
      ([source, names]) => `- source '${source}': ${names.join(', ')}`,
    ),
  ].join('\n');

/** Which git sources `skills update` re-resolves: every one, or those named. */
export type RefreshSelection = 'all' | ReadonlySet<string>;

const isRefreshed = (
  refresh: RefreshSelection | undefined,
  from: string,
): boolean => refresh === 'all' || (refresh !== undefined && refresh.has(from));

/**
 * Remove exports this config's lock no longer uses: only folders carrying this tool's marker, and
 * only for sources this lock pins or pinned, so another config's exports in the folder are kept.
 */
const cleanupStaleExports = (
  sourcesDir: string,
  keep: ReadonlySet<string>,
  trackedSources: ReadonlySet<string>,
  dryRun: boolean,
  wait: LockWait,
): string[] =>
  listExportFolders(sourcesDir)
    .filter((folder) => !keep.has(folder))
    .filter((folder) => {
      const marker = readExportMarker(folder);
      return marker !== undefined && trackedSources.has(marker.from);
    })
    .map((folder) => {
      if (dryRun) {
        return `Would remove unused export ${folder}`;
      }
      removeExport(folder, wait);
      return `Removed unused export ${folder}`;
    });

/**
 * Link every skill declared in the skills config, prune dead and unconfigured links, heal renamed
 * names in the config, and regenerate the destination's `.gitignore`. Git sources are pinned in
 * `.agents/agentic-tools.lock` and exported to `.agents/local/sources/` first.
 */
export const runSkillsSync = (
  context: SkillsContext,
  options: DestinationOptions & {
    config: string | undefined;
    dryRun: boolean;
    force: boolean;
    locked?: boolean;
    refresh?: RefreshSelection;
  },
): void => {
  const destinationDir = resolveDestinationDir(context, options);
  const destination = resolveUserPath(
    options.destination ?? '.',
    context.cwd,
    context.home,
  );
  const configPath = resolveSyncConfigPath({
    destination,
    useGlobal: options.useGlobal,
    rawConfig: options.config,
    cwd: context.cwd,
    home: context.home,
  });
  const ownRoot = context.ownRoot ?? findOwnPackageRoot();
  const frozen = options.locked ?? false;
  if (frozen && options.refresh !== undefined) {
    throw new ToolError('cannot combine --locked with skills update');
  }
  const configRoot = configBaseRoot(configPath);
  const lockPath = lockFilePath(configPath);
  const sourcesDir = sourcesDirectory(configPath, configRoot);
  const toolsHome = context.toolsHome ?? toolsHomeDirectory(context.home);
  const configuredSources = loadConfiguredSources(configPath);

  const gitFroms = new Set<string>();
  for (const configured of configuredSources) {
    const gitSource = parseGitSource(configured.from);
    if (gitSource === undefined && configured.ref !== undefined) {
      throw new ToolError(
        `Skills config source '${configured.from}' has a 'ref', but only git: and github: sources take one.`,
      );
    }
    if (gitSource !== undefined) {
      if (gitFroms.has(configured.from)) {
        throw new ToolError(
          `Git source '${configured.from}' is configured more than once; list all its skills in one entry.`,
        );
      }
      gitFroms.add(configured.from);
    }
  }
  if (options.refresh !== undefined && options.refresh !== 'all') {
    const unknown = [...options.refresh].filter((from) => !gitFroms.has(from));
    if (unknown.length > 0) {
      throw new ToolError(
        `Not a configured git source: ${unknown.join(', ')}. Configured git sources: ${[...gitFroms].join(', ') || 'none'}.`,
      );
    }
  }

  const lockWait = {
    waitMs: context.lockWaitMs,
    onWait: context.output.warn,
  };

  // Everything from reading the lock to cleaning up exports, so two syncs of one config cannot
  // overwrite each other's pins or remove an export the other just linked.
  const syncSources = (): void => {
    const lock = readLock(lockPath);
    const nextLock: SkillsLock = { version: lock.version, sources: {} };
    const missingBySource: Array<[string, string[]]> = [];
    const skippedBySource: Array<[string, string[]]> = [];
    const manifestsToLink: SkillManifest[] = [];
    const renamesBySource = new Map<number, Map<string, string>>();
    const sourceUrls: string[] = [];
    const linkedNames = new Set<string>();
    const keptExports = new Set<string>();
    const gitMessages: string[] = [];
    const unexportedSources: string[] = [];
    const unpinnedSources: string[] = [];
    const createdExports: string[] = [];
    const replaceable = resolveLoose(sourcesDir);
    let nextLockText: string | undefined;
    let lockChanges: boolean;

    try {
      configuredSources.forEach((configured, index) => {
        const gitSource = parseGitSource(configured.from);
        let sourceRoot: string;
        if (gitSource === undefined) {
          sourceRoot = resolveConfiguredSourceRoot({
            source: configured.from,
            configPath,
            home: context.home,
            ownRoot,
          });
        } else {
          const prepared = prepareGitSource({
            source: gitSource,
            ref: configured.ref,
            locked: lock.sources[configured.from],
            refresh: isRefreshed(options.refresh, configured.from),
            frozen,
            dryRun: options.dryRun,
            toolsHome,
            sourcesDir,
            lockPath,
            wait: lockWait,
          });
          gitMessages.push(...prepared.messages);
          if (prepared.created && prepared.root !== undefined) {
            createdExports.push(prepared.root);
          }
          if (prepared.pin === undefined) {
            unpinnedSources.push(configured.from);
          }
          const previous = lock.sources[configured.from];
          const pin = prepared.pin ?? previous;
          if (pin !== undefined) {
            nextLock.sources[configured.from] = pin;
          }
          if (configured.url === undefined) {
            sourceUrls.push(gitSource.url);
          }
          if (prepared.root === undefined) {
            // A dry run cannot read skills it has not exported; keep their links out of the cleanup.
            unexportedSources.push(configured.from);
            configured.skills.forEach((name) => linkedNames.add(name));
            return;
          }
          keptExports.add(prepared.root);
          sourceRoot = prepared.root;
        }
        const manifests = discoverSkillManifests(sourceRoot);
        const aliases = loadSkillAliases(sourceRoot);
        const requested = deduplicate(configured.skills);

        const missing = requested.filter(
          (name) => lookupManifest(name, manifests, aliases) === undefined,
        );
        if (missing.length > 0) {
          missingBySource.push([configured.from, missing]);
          return;
        }

        // A directly requested skill that exists but is not shippable is reported and skipped. A
        // non-shippable skill pulled in as a dependency is different: resolveSelectedSkills fails hard.
        const unshippable = requested.filter((name) => {
          const visibility = lookupManifest(
            name,
            manifests,
            aliases,
          )?.visibility;
          return (
            visibility === undefined || !exportableVisibility.has(visibility)
          );
        });
        if (unshippable.length > 0) {
          skippedBySource.push([configured.from, unshippable]);
        }
        const shippable = requested.filter(
          (name) => !unshippable.includes(name),
        );

        const renames = collectAliasRenames(shippable, manifests, aliases);
        if (renames.size > 0) {
          renamesBySource.set(index, renames);
        }
        if (configured.url !== undefined) {
          sourceUrls.push(configured.url);
        }

        for (const manifest of resolveSelectedSkills(
          manifests,
          shippable,
          aliases,
        )) {
          if (linkedNames.has(manifest.name)) {
            throw new ToolError(
              `Skill '${manifest.name}' is configured more than once across sync sources.`,
            );
          }
          manifestsToLink.push(manifest);
          linkedNames.add(manifest.name);
        }
      });
      gitMessages.forEach(context.output.info);

      if (missingBySource.length > 0) {
        throw new ToolError(
          describeBySource(
            'Skills config references missing skills:',
            missingBySource,
          ),
        );
      }
      if (skippedBySource.length > 0) {
        context.output.warn(
          describeBySource(
            'Skipped skills that are not shippable to another repo (repo-local or otherwise non-exportable):',
            skippedBySource,
          ),
        );
      }

      const currentLockText = isFile(lockPath) ? lockText(lock) : undefined;
      nextLockText =
        gitFroms.size === 0 && currentLockText === undefined ?
          undefined
        : lockText(nextLock);
      // A dry run that would resolve a ref cannot show the new pin, but the lock would change.
      lockChanges =
        nextLockText !== currentLockText || unpinnedSources.length > 0;
      if (lockChanges && frozen) {
        throw new ToolError(
          `${lockPath} names sources the config no longer has. Run skills sync without --locked to update it, and commit it.`,
        );
      }

      // Refuse a conflicting link before the first write, so a failed sync changes nothing.
      for (const manifest of manifestsToLink) {
        linkSkillDirectory(manifest, destinationDir, {
          ...options,
          dryRun: true,
          replaceableRoot: replaceable,
        });
      }
    } catch (error) {
      // Exports are written while sources are read; take back the ones this run made. The shared
      // bare clones in the tools home are a cache and may have been fetched.
      for (const folder of createdExports) {
        removeExport(folder, lockWait);
      }
      throw error;
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
        context.output.warn(warning);
      }
      context.output.info(
        linkSkillDirectory(manifest, destinationDir, {
          ...options,
          replaceableRoot: replaceable,
        }),
      );
    }
    writeSyncedSkillsGitignore(
      destinationDir,
      linkedNames,
      sourceUrls,
      options.dryRun,
    ).forEach(context.output.info);
    // The pins change last, once every link points at its new export: a sync that fails midway
    // leaves the old pins, and the next one makes the same changes again.
    if (lockChanges && nextLockText !== undefined) {
      if (options.dryRun) {
        context.output.info(`Would update ${lockPath}`);
      } else {
        fs.mkdirSync(path.dirname(lockPath), { recursive: true });
        fs.writeFileSync(lockPath, nextLockText, 'utf8');
        context.output.info(`Updated ${lockPath}`);
      }
    }
    if (unexportedSources.length === 0) {
      cleanupStaleExports(
        sourcesDir,
        keptExports,
        new Set([...Object.keys(lock.sources), ...gitFroms]),
        options.dryRun,
        lockWait,
      ).forEach(context.output.info);
    }
  };

  if (gitFroms.size > 0 && !options.dryRun) {
    withLock(path.join(sourcesDir, '.sync.lock'), syncSources, lockWait);
  } else {
    syncSources();
  }
};

/** Fetch git sources again, re-resolve their refs, rewrite the lock, and relink. */
export const runSkillsUpdate = (
  context: SkillsContext,
  options: DestinationOptions & {
    config: string | undefined;
    sources: string[];
    dryRun: boolean;
    force: boolean;
  },
): void => {
  runSkillsSync(context, {
    ...options,
    refresh: options.sources.length === 0 ? 'all' : new Set(options.sources),
  });
};
