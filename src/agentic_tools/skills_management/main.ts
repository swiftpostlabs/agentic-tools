import fs from "node:fs";
import path from "node:path";
import { defineCommand, renderUsage, runCommand } from "citty";
import {
  DEFAULT_GLOBAL_SKILLS_DIR,
  PACKAGE_SOURCE_PREFIX,
  SYNC_CONFIG_FILENAME,
  ToolError,
  createDirectoryLink,
  createExecutionOptions,
  deduplicatePreservingOrder,
  ensureJsonObject,
  isDirectory,
  isDirectoryLink,
  isFile,
  parseFrontmatter,
  pathExists,
  removeDirectoryLink,
  resolveExistingLinkTarget,
  resolvePackageRoot,
  resolvePath,
  type ExecutionOptions,
  type RunOptions,
} from "../node_cli/common.ts";

const SHAREABLE_VISIBILITY = "shareable";
const SHAREABILITY_WIZARD = "tool-make-skill-shareable";

interface SkillManifest {
  name: string;
  directory: string;
  visibility: string | null;
  requires: string[];
  reason: string | null;
}

interface TargetCommandState {
  skills: string[];
  source: string | null;
  destination: string | null;
  useGlobal: boolean;
  dryRun: boolean;
  force: boolean;
  config: string | null;
}

interface CommandArgs {
  _: string[];
  [key: string]: unknown;
}

type SkillManifestMap = Record<string, SkillManifest>;

function splitRequires(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return value.split(/\s+/u).filter(Boolean);
}

function getOptionalStringArg(args: CommandArgs, key: string): string | null {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function getBooleanArg(args: CommandArgs, key: string): boolean {
  return args[key] === true;
}

function isSkillsRootPath(targetPath: string): boolean {
  return (
    path.basename(targetPath) === "skills" &&
    path.basename(path.dirname(targetPath)) === ".agents"
  );
}

function toSkillsRoot(targetPath: string): string {
  return isSkillsRootPath(targetPath)
    ? targetPath
    : path.join(targetPath, ".agents", "skills");
}

function toRepoRoot(targetPath: string): string {
  return isSkillsRootPath(targetPath)
    ? path.dirname(path.dirname(targetPath))
    : targetPath;
}

export function resolveSourceSkillsRoot(sourcePath: string): string {
  const skillsRoot = toSkillsRoot(sourcePath);
  if (isDirectory(skillsRoot)) {
    return skillsRoot;
  }

  if (
    isDirectory(sourcePath) &&
    fs.readdirSync(sourcePath).some((entry) => {
      const candidatePath = path.join(sourcePath, entry);
      return isDirectory(candidatePath) && isFile(path.join(candidatePath, "SKILL.md"));
    })
  ) {
    return sourcePath;
  }

  throw new ToolError(`Could not find skills directory at ${skillsRoot}`);
}

function resolveDestinationSkillsRoot(targetPath: string, useGlobal: boolean): string {
  return useGlobal ? DEFAULT_GLOBAL_SKILLS_DIR : toSkillsRoot(targetPath);
}

function readSkillManifest(skillDirectory: string): SkillManifest {
  const skillFile = path.join(skillDirectory, "SKILL.md");
  const frontmatter = parseFrontmatter(fs.readFileSync(skillFile, "utf8"));
  const rawName = frontmatter.name;
  if (typeof rawName !== "string" || rawName === "") {
    throw new ToolError(`Skill at ${skillDirectory} is missing a valid name.`);
  }

  if (rawName !== path.basename(skillDirectory)) {
    throw new ToolError(
      `Skill name '${rawName}' does not match directory '${path.basename(skillDirectory)}'.`,
    );
  }

  const metadata =
    frontmatter.metadata !== null &&
    !Array.isArray(frontmatter.metadata) &&
    typeof frontmatter.metadata === "object"
      ? ensureJsonObject(frontmatter.metadata, `Skill metadata for '${rawName}'`)
      : {};

  return {
    name: rawName,
    directory: skillDirectory,
    visibility:
      typeof metadata["shareable-skills.visibility"] === "string"
        ? metadata["shareable-skills.visibility"]
        : null,
    requires: splitRequires(metadata["shareable-skills.requires"]),
    reason:
      typeof metadata["shareable-skills.reason"] === "string"
        ? metadata["shareable-skills.reason"]
        : null,
  };
}

export function discoverSkillManifests(sourcePath: string): SkillManifestMap {
  const skillsRoot = resolveSourceSkillsRoot(sourcePath);
  const manifests: SkillManifestMap = {};

  for (const entry of fs.readdirSync(skillsRoot)) {
    const skillDirectory = path.join(skillsRoot, entry);
    if (!isDirectory(skillDirectory) || !isFile(path.join(skillDirectory, "SKILL.md"))) {
      continue;
    }

    const manifest = readSkillManifest(skillDirectory);
    manifests[manifest.name] = manifest;
  }

  return manifests;
}

function buildMakeShareableRecommendation(skillName: string): string {
  return (
    `Recommended next step: use /${SHAREABILITY_WIZARD} on '${skillName}' to decide ` +
    "whether it should be shareable or repo-local and to add " +
    "shareable-skills.visibility, shareable-skills.requires, and " +
    "shareable-skills.reason where needed."
  );
}

function ensureShareableManifest(manifest: SkillManifest, manifests: SkillManifestMap): void {
  if (manifest.visibility !== SHAREABLE_VISIBILITY) {
    const reasonSuffix = manifest.reason ? ` Reason: ${manifest.reason}` : "";
    throw new ToolError(
      `Skill '${manifest.name}' is not shareable.${reasonSuffix} ${buildMakeShareableRecommendation(manifest.name)}`,
    );
  }

  for (const dependencyName of manifest.requires) {
    const dependency = manifests[dependencyName];
    if (dependency === undefined) {
      throw new ToolError(
        `Skill '${manifest.name}' depends on missing skill '${dependencyName}'.`,
      );
    }

    if (dependency.visibility !== SHAREABLE_VISIBILITY) {
      throw new ToolError(
        `Skill '${manifest.name}' depends on '${dependencyName}', which is not shareable.`,
      );
    }
  }
}

export function resolveSelectedSkills(
  manifests: SkillManifestMap,
  requestedNames: string[],
): SkillManifest[] {
  const resolved: SkillManifest[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(skillName: string): void {
    if (visited.has(skillName)) {
      return;
    }
    if (visiting.has(skillName)) {
      throw new ToolError(`Circular skill dependency detected at '${skillName}'.`);
    }

    const manifest = manifests[skillName];
    if (manifest === undefined) {
      throw new ToolError(`Unknown skill '${skillName}'.`);
    }

    ensureShareableManifest(manifest, manifests);

    visiting.add(skillName);
    for (const dependencyName of manifest.requires) {
      visit(dependencyName);
    }
    visiting.delete(skillName);

    visited.add(skillName);
    resolved.push(manifest);
  }

  for (const requestedName of requestedNames) {
    visit(requestedName);
  }

  return resolved;
}

function describeSkills(manifests: SkillManifestMap): string {
  const skillNames = Object.keys(manifests).sort();
  if (skillNames.length === 0) {
    return "No skills found.";
  }

  return skillNames
    .map((skillName) => {
      const manifest = manifests[skillName];
      const visibility = manifest.visibility ?? "missing";
      const requires = manifest.requires.length > 0 ? manifest.requires.join(" ") : "-";
      const reason = manifest.reason ? `; reason ${manifest.reason}` : "";
      return `${manifest.name}: visibility ${visibility}; requires ${requires}${reason}`;
    })
    .join("\n");
}

function resolveSourceSkillDirectory(sourcePath: string, skillName: string): string {
  const skillDirectory = path.join(resolveSourceSkillsRoot(sourcePath), skillName);
  if (!isFile(path.join(skillDirectory, "SKILL.md"))) {
    throw new ToolError(
      `Could not find source skill '${skillName}' at ${skillDirectory}`,
    );
  }

  return path.resolve(skillDirectory);
}

function linkSkillDirectory(
  manifest: SkillManifest,
  destinationSkillsDir: string,
  dryRun: boolean,
  force: boolean,
): string {
  const destination = path.join(destinationSkillsDir, manifest.name);
  const target = path.resolve(manifest.directory);

  if (dryRun) {
    return `Would link ${destination} -> ${target}`;
  }

  fs.mkdirSync(destinationSkillsDir, { recursive: true });

  if (isDirectoryLink(destination)) {
    const existingTarget = resolveExistingLinkTarget(destination);
    if (existingTarget === target) {
      return `Already linked ${destination} -> ${target}`;
    }
    if (!force) {
      throw new ToolError(
        `Destination '${destination}' already points to '${existingTarget}'. Use --force to replace it.`,
      );
    }
    removeDirectoryLink(destination);
  } else if (pathExists(destination)) {
    throw new ToolError(
      `Destination '${destination}' already exists and is not a symlink. Remove it manually before linking.`,
    );
  }

  createDirectoryLink(destination, target);
  return `Linked ${destination} -> ${target}`;
}

function unlinkSkillDirectory(
  skillName: string,
  destinationSkillsDir: string,
  dryRun: boolean,
  expectedTarget: string | null,
): string {
  const destination = path.join(destinationSkillsDir, skillName);

  if (dryRun) {
    return expectedTarget === null
      ? `Would unlink ${destination}`
      : `Would unlink ${destination} -> ${expectedTarget}`;
  }

  if (!isDirectoryLink(destination)) {
    if (pathExists(destination)) {
      throw new ToolError(
        `Destination '${destination}' exists and is not a symlink. Remove it manually if that is intended.`,
      );
    }
    throw new ToolError(`Skill '${skillName}' is not linked at '${destination}'.`);
  }

  const existingTarget = resolveExistingLinkTarget(destination);
  if (expectedTarget !== null && existingTarget !== path.resolve(expectedTarget)) {
    throw new ToolError(
      `Destination '${destination}' points to '${existingTarget}', not '${expectedTarget}'.`,
    );
  }

  removeDirectoryLink(destination);
  return `Unlinked ${destination} -> ${existingTarget}`;
}

function inferConfigBaseRoot(configPath: string): string {
  return path.basename(path.dirname(configPath)) === ".agents"
    ? path.dirname(path.dirname(configPath))
    : path.dirname(configPath);
}

function resolveSyncConfigPath(
  destinationPath: string,
  useGlobal: boolean,
  rawConfig: string | null,
): string {
  if (typeof rawConfig === "string") {
    return path.resolve(rawConfig);
  }

  if (useGlobal) {
    throw new ToolError("sync with --global requires --config");
  }

  return path.join(toRepoRoot(destinationPath), ".agents", SYNC_CONFIG_FILENAME);
}

export function resolvePackageSourceRoot(packageName: string, cwd = process.cwd()): string {
  return resolvePackageRoot(packageName, cwd);
}

function resolveConfiguredSourceRoot(configSource: string, configPath: string, cwd: string): string {
  if (configSource.startsWith(PACKAGE_SOURCE_PREFIX)) {
    const packageName = configSource.slice(PACKAGE_SOURCE_PREFIX.length).trim();
    if (packageName === "") {
      throw new ToolError(
        "Package skill sources must include a package name after 'package:'.",
      );
    }

    return resolvePackageSourceRoot(packageName, cwd);
  }

  return path.isAbsolute(configSource)
    ? path.resolve(configSource)
    : path.resolve(inferConfigBaseRoot(configPath), configSource);
}

function requireStringList(value: unknown, context: string): string[] {
  if (!Array.isArray(value)) {
    throw new ToolError(`${context} must be an array of strings.`);
  }

  const entries = value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim() !== "",
  );
  if (entries.length !== value.length) {
    throw new ToolError(`${context} must contain only non-empty strings.`);
  }
  if (entries.length === 0) {
    throw new ToolError(`${context} must not be empty.`);
  }

  return entries;
}

function parseConfiguredSkillSources(text: string): Array<{ source: string; skills: string[] }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ToolError(`Skills config is not valid JSON: ${error}`);
  }

  const config = ensureJsonObject(parsed, "Skills config");
  if (!Array.isArray(config.sources) || config.sources.length === 0) {
    throw new ToolError("Skills config must define a non-empty 'sources' array.");
  }

  return config.sources.map((rawSource, index) => {
    const sourceObject = ensureJsonObject(
      rawSource,
      `Skills config source #${index + 1}`,
    );
    if (typeof sourceObject.from !== "string" || sourceObject.from.trim() === "") {
      throw new ToolError(
        `Skills config source #${index + 1} is missing a non-empty 'from' value.`,
      );
    }

    return {
      source: sourceObject.from,
      skills: requireStringList(
        sourceObject.skills,
        `Skills config source '${sourceObject.from}' skills`,
      ),
    };
  });
}

function loadConfiguredSkillSources(configPath: string): Array<{ source: string; skills: string[] }> {
  if (!isFile(configPath)) {
    throw new ToolError(`Could not find skills config at ${configPath}`);
  }

  return parseConfiguredSkillSources(fs.readFileSync(configPath, "utf8"));
}

function findMissingRequestedSkills(manifests: SkillManifestMap, requestedNames: string[]): string[] {
  return deduplicatePreservingOrder(requestedNames).filter(
    (skillName) => manifests[skillName] === undefined,
  );
}

function describeMissingConfiguredSkills(missingBySource: Array<[string, string[]]>): string {
  return [
    "Skills config references missing skills:",
    ...missingBySource.map(
      ([source, missingNames]) => `- source '${source}': ${missingNames.join(", ")}`,
    ),
  ].join("\n");
}

function cleanupDeadSkillLinks(destinationSkillsDir: string, dryRun: boolean): string[] {
  if (!pathExists(destinationSkillsDir)) {
    return [];
  }
  if (!isDirectory(destinationSkillsDir)) {
    throw new ToolError(
      `Destination skills path is not a directory: ${destinationSkillsDir}`,
    );
  }

  const messages: string[] = [];
  for (const entry of fs.readdirSync(destinationSkillsDir).sort()) {
    const candidatePath = path.join(destinationSkillsDir, entry);
    if (!isDirectoryLink(candidatePath)) {
      continue;
    }

    const targetPath = resolveExistingLinkTarget(candidatePath);
    if (pathExists(targetPath)) {
      continue;
    }

    if (dryRun) {
      messages.push(`Would remove dead link ${candidatePath} -> ${targetPath}`);
      continue;
    }

    removeDirectoryLink(candidatePath);
    messages.push(`Removed dead link ${candidatePath} -> ${targetPath}`);
  }

  return messages;
}

function validateDestinationFlags(useGlobal: boolean, destination: string | null): void {
  if (useGlobal && destination !== null) {
    throw new ToolError("cannot combine --global with --to");
  }
}

function handleListCommand({ source }: { source: string | null }, options: ExecutionOptions): number {
  const manifests = discoverSkillManifests(resolvePath(source, options.cwd));
  options.output(describeSkills(manifests));
  return 0;
}

function handleLinkCommand(parsed: TargetCommandState, options: ExecutionOptions): number {
  validateDestinationFlags(parsed.useGlobal, parsed.destination);
  const manifests = discoverSkillManifests(resolvePath(parsed.source, options.cwd));
  const destinationSkillsDir = resolveDestinationSkillsRoot(
    resolvePath(parsed.destination, options.cwd),
    parsed.useGlobal,
  );

  for (const manifest of resolveSelectedSkills(
    manifests,
    deduplicatePreservingOrder(parsed.skills),
  )) {
    options.output(
      linkSkillDirectory(
        manifest,
        destinationSkillsDir,
        parsed.dryRun,
        parsed.force,
      ),
    );
  }

  return 0;
}

function handleSyncCommand(parsed: TargetCommandState, options: ExecutionOptions): number {
  validateDestinationFlags(parsed.useGlobal, parsed.destination);
  const destinationPath = resolvePath(parsed.destination, options.cwd);
  const configPath = resolveSyncConfigPath(
    destinationPath,
    parsed.useGlobal,
    parsed.config,
  );
  const destinationSkillsDir = resolveDestinationSkillsRoot(
    destinationPath,
    parsed.useGlobal,
  );

  const missingBySource: Array<[string, string[]]> = [];
  const manifestsToLink: SkillManifest[] = [];
  const linkedSkillNames = new Set<string>();

  for (const configuredSource of loadConfiguredSkillSources(configPath)) {
    const manifests = discoverSkillManifests(
      resolveConfiguredSourceRoot(configuredSource.source, configPath, options.cwd),
    );
    const requestedSkillNames = deduplicatePreservingOrder(configuredSource.skills);
    const missingRequestedSkills = findMissingRequestedSkills(
      manifests,
      requestedSkillNames,
    );
    if (missingRequestedSkills.length > 0) {
      missingBySource.push([configuredSource.source, missingRequestedSkills]);
      continue;
    }

    for (const manifest of resolveSelectedSkills(manifests, requestedSkillNames)) {
      if (linkedSkillNames.has(manifest.name)) {
        throw new ToolError(
          `Skill '${manifest.name}' is configured more than once across sync sources.`,
        );
      }

      manifestsToLink.push(manifest);
      linkedSkillNames.add(manifest.name);
    }
  }

  if (missingBySource.length > 0) {
    throw new ToolError(describeMissingConfiguredSkills(missingBySource));
  }

  for (const message of cleanupDeadSkillLinks(destinationSkillsDir, parsed.dryRun)) {
    options.output(message);
  }

  for (const manifest of manifestsToLink) {
    options.output(
      linkSkillDirectory(
        manifest,
        destinationSkillsDir,
        parsed.dryRun,
        parsed.force,
      ),
    );
  }

  return 0;
}

function handleUnlinkCommand(parsed: TargetCommandState, options: ExecutionOptions): number {
  validateDestinationFlags(parsed.useGlobal, parsed.destination);
  const sourcePath = resolvePath(parsed.source, options.cwd);
  const destinationSkillsDir = resolveDestinationSkillsRoot(
    resolvePath(parsed.destination, options.cwd),
    parsed.useGlobal,
  );

  for (const skillName of deduplicatePreservingOrder(parsed.skills)) {
    const expectedTarget = resolveSourceSkillDirectory(sourcePath, skillName);
    options.output(
      unlinkSkillDirectory(
        skillName,
        destinationSkillsDir,
        parsed.dryRun,
        expectedTarget,
      ),
    );
  }

  return 0;
}

function assertNoPositionals(args: CommandArgs, context: string): void {
  if (args._.length > 0) {
    throw new ToolError(`${context} does not accept positional arguments.`);
  }
}

function getRequiredSkills(args: CommandArgs): string[] {
  const skills = deduplicatePreservingOrder(args._);
  if (skills.length === 0) {
    throw new ToolError("expected at least one skill name.");
  }

  return skills;
}

function createSharedTargetArgs(includeConfig = false) {
  const sharedArgs: Record<string, unknown> = {
    from: {
      type: "string",
      alias: ["f"],
      description: "Skill source repo, package, or skills root.",
    },
    to: {
      type: "string",
      alias: ["t"],
      description: "Destination repo or .agents/skills directory.",
    },
    global: {
      type: "boolean",
      alias: ["g"],
      description: "Link into the global ~/.agents/skills directory.",
    },
    "dry-run": {
      type: "boolean",
      description: "Print what would change without mutating the filesystem.",
    },
    force: {
      type: "boolean",
      description: "Replace an existing link that points somewhere else.",
    },
  };

  if (includeConfig) {
    sharedArgs.config = {
      type: "string",
      alias: ["c"],
      description: "Path to the sync config file.",
    };
  }

  return sharedArgs;
}

function createSkillsManagementCommand(options: ExecutionOptions) {
  return defineCommand({
    meta: {
      name: "skills-management",
      description: "List, link, sync, and unlink shareable skills.",
    },
    subCommands: {
      list: defineCommand({
        meta: {
          name: "list",
          description: "List discovered skills from a source.",
        },
        args: {
          from: {
            type: "string",
            alias: ["f"],
            description: "Skill source repo, package, or skills root.",
          },
        },
        run({ args }: { args: CommandArgs }) {
          assertNoPositionals(args, "list");
          return handleListCommand(
            { source: getOptionalStringArg(args, "from") },
            options,
          );
        },
      }),
      link: defineCommand({
        meta: {
          name: "link",
          description: "Link one or more skills into a destination repo.",
        },
        args: createSharedTargetArgs(false),
        run({ args }: { args: CommandArgs }) {
          return handleLinkCommand(
            {
              skills: getRequiredSkills(args),
              source: getOptionalStringArg(args, "from"),
              destination: getOptionalStringArg(args, "to"),
              useGlobal: getBooleanArg(args, "global"),
              dryRun: getBooleanArg(args, "dry-run"),
              force: getBooleanArg(args, "force"),
              config: null,
            },
            options,
          );
        },
      }),
      sync: defineCommand({
        meta: {
          name: "sync",
          description: "Sync skills declared in .agents/skills.json.",
        },
        args: createSharedTargetArgs(true),
        run({ args }: { args: CommandArgs }) {
          assertNoPositionals(args, "sync");
          return handleSyncCommand(
            {
              skills: [],
              source: null,
              destination: getOptionalStringArg(args, "to"),
              useGlobal: getBooleanArg(args, "global"),
              dryRun: getBooleanArg(args, "dry-run"),
              force: getBooleanArg(args, "force"),
              config: getOptionalStringArg(args, "config"),
            },
            options,
          );
        },
      }),
      unlink: defineCommand({
        meta: {
          name: "unlink",
          description: "Remove one or more linked skills from a destination repo.",
        },
        args: createSharedTargetArgs(false),
        run({ args }: { args: CommandArgs }) {
          return handleUnlinkCommand(
            {
              skills: getRequiredSkills(args),
              source: getOptionalStringArg(args, "from"),
              destination: getOptionalStringArg(args, "to"),
              useGlobal: getBooleanArg(args, "global"),
              dryRun: getBooleanArg(args, "dry-run"),
              force: getBooleanArg(args, "force"),
              config: null,
            },
            options,
          );
        },
      }),
    },
  });
}

export async function runSkillsManagement(
  argv: string[] = process.argv.slice(2),
  options: RunOptions = {},
): Promise<number> {
  const effectiveOptions = createExecutionOptions(options);
  const command = createSkillsManagementCommand(effectiveOptions);

  if (argv.length === 0) {
    effectiveOptions.output(await renderUsage(command));
    return 1;
  }

  try {
    const { result } = await runCommand(command, {
      rawArgs: argv,
      showUsage: true,
    });
    return typeof result === "number" ? result : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    effectiveOptions.logger.error(message);
    return 1;
  }
}