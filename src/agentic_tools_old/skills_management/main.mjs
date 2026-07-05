// @ts-check
import { defineCommand, renderUsage, runCommand } from "citty";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ToolError, createDirectoryLink, createExecutionOptions, deduplicatePreservingOrder, ensureJsonObject, isDirectory, isDirectoryLink, isFile, parseFrontmatter, pathExists, removeDirectoryLink, resolveExistingLinkTarget, resolvePackageRoot, resolvePath, } from "../utils/common.mjs";

/** @import { ExecutionOptions, RunOptions } from "../utils/common.mjs" */
/** @typedef {{ name: string, directory: string, scope: string | null, visibility: string | null, requires: string[], reason: string | null }} SkillManifest */
/** @typedef {Record<string, SkillManifest>} SkillManifestMap */
/** @typedef {{ skills: string[], source: string | null, destination: string | null, useGlobal: boolean, dryRun: boolean, force: boolean, config: string | null }} TargetCommandState */
/** @typedef {{ _: string[], [key: string]: unknown }} CommandArgs */
/** @typedef {{ source: string, skills: string[] }} ConfiguredSkillSource */

const EXPORTABLE_VISIBILITY = new Set(["public", "organization"]);
const SHAREABILITY_WIZARD = "tool-sp-make-skill-shareable";
const DEFAULT_GLOBAL_SKILLS_DIR = path.join(os.homedir(), ".agents", "skills");
const PACKAGE_SOURCE_PREFIX = "package:";
const SYNC_CONFIG_FILENAME = "skills.json";
const AGENTS_CONFIG_FILENAME = "config.json";
const SKILLS_CONFIG_SECTION = "skills";
const SKILL_ALIAS_REGISTRY_PATH = [
    "ref-sp-agents-shareable-skills",
    "references",
    "registry.json",
];
/**
 * @param {unknown} value
 */
const splitRequires = (value) => {
    if (typeof value !== "string") {
        return [];
    }
    // Match the sharing spec and validator: requires is whitespace- or
    // comma-delimited, so both "a b" and "a, b" yield the same dependencies.
    return value.split(/[\s,]+/u).filter(Boolean);
};
/**
 * @param {CommandArgs} args
 * @param {string} key
 */
const getOptionalStringArg = (args, key) => {
    const value = args[key];
    return typeof value === "string" && value.trim() !== "" ? value : null;
};
/**
 * @param {CommandArgs} args
 * @param {string} key
 */
const getBooleanArg = (args, key) => {
    return args[key] === true;
};
/**
 * @param {string} targetPath
 */
const isSkillsRootPath = (targetPath) => {
    return (path.basename(targetPath) === "skills" &&
        path.basename(path.dirname(targetPath)) === ".agents");
};
/**
 * @param {string} targetPath
 */
const toSkillsRoot = (targetPath) => {
    return isSkillsRootPath(targetPath)
        ? targetPath
        : path.join(targetPath, ".agents", "skills");
};
/**
 * @param {string} targetPath
 */
const toRepoRoot = (targetPath) => {
    return isSkillsRootPath(targetPath)
        ? path.dirname(path.dirname(targetPath))
        : targetPath;
};
/**
 * @param {string} sourcePath
 * @returns {string}
 */
export const resolveSourceSkillsRoot = (sourcePath) => {
    const skillsRoot = toSkillsRoot(sourcePath);
    if (isDirectory(skillsRoot)) {
        return skillsRoot;
    }
    if (isDirectory(sourcePath) &&
        fs.readdirSync(sourcePath).some((entry) => {
            const candidatePath = path.join(sourcePath, entry);
            return isDirectory(candidatePath) && isFile(path.join(candidatePath, "SKILL.md"));
        })) {
        return sourcePath;
    }
    throw new ToolError(`Could not find skills directory at ${skillsRoot}`);
};
/**
 * @param {string} targetPath
 * @param {boolean} useGlobal
 */
const resolveDestinationSkillsRoot = (targetPath, useGlobal) => {
    return useGlobal ? DEFAULT_GLOBAL_SKILLS_DIR : toSkillsRoot(targetPath);
};
/**
 * @param {string} skillDirectory
 */
const readSkillManifest = (skillDirectory) => {
    const skillFile = path.join(skillDirectory, "SKILL.md");
    const frontmatter = parseFrontmatter(fs.readFileSync(skillFile, "utf8"));
    const rawName = frontmatter.name;
    if (typeof rawName !== "string" || rawName === "") {
        throw new ToolError(`Skill at ${skillDirectory} is missing a valid name.`);
    }
    if (rawName !== path.basename(skillDirectory)) {
        throw new ToolError(`Skill name '${rawName}' does not match directory '${path.basename(skillDirectory)}'.`);
    }
    const metadata = frontmatter.metadata !== null &&
        !Array.isArray(frontmatter.metadata) &&
        typeof frontmatter.metadata === "object"
        ? ensureJsonObject(frontmatter.metadata, `Skill metadata for '${rawName}'`)
        : {};
    return {
        name: rawName,
        directory: skillDirectory,
        scope: typeof metadata.scope === "string" ? metadata.scope : null,
        visibility: typeof metadata.visibility === "string" ? metadata.visibility : null,
        requires: splitRequires(metadata.requires),
        reason: typeof metadata.reason === "string" ? metadata.reason : null,
    };
};
/**
 * @param {string} sourcePath
 * @returns {SkillManifestMap}
 */
export const discoverSkillManifests = (sourcePath) => {
    const skillsRoot = resolveSourceSkillsRoot(sourcePath);
    /** @type {SkillManifestMap} */
    const manifests = {};
    for (const entry of fs.readdirSync(skillsRoot)) {
        const skillDirectory = path.join(skillsRoot, entry);
        if (!isDirectory(skillDirectory) || !isFile(path.join(skillDirectory, "SKILL.md"))) {
            continue;
        }
        const manifest = readSkillManifest(skillDirectory);
        manifests[manifest.name] = manifest;
    }
    return manifests;
};
/**
 * Read the source's rename registry so old skill names still resolve. Aliases
 * map a pre-rename skill name to its current name. Missing or malformed
 * registries degrade gracefully to an empty map.
 * @param {string} sourcePath
 * @returns {Record<string, string>}
 */
export const loadSkillAliases = (sourcePath) => {
    const registryPath = path.join(resolveSourceSkillsRoot(sourcePath), ...SKILL_ALIAS_REGISTRY_PATH);
    if (!isFile(registryPath)) {
        return {};
    }
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    }
    catch {
        return {};
    }
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
        return {};
    }
    const rawAliases = parsed.aliases;
    if (rawAliases === null || Array.isArray(rawAliases) || typeof rawAliases !== "object") {
        return {};
    }
    /** @type {Record<string, string>} */
    const aliases = {};
    for (const [oldName, newName] of Object.entries(rawAliases)) {
        if (typeof newName === "string") {
            aliases[oldName] = newName;
        }
    }
    return aliases;
};
/**
 * @param {string} name
 * @param {SkillManifestMap} manifests
 * @param {Record<string, string>} aliases
 * @returns {SkillManifest | undefined}
 */
const lookupManifest = (name, manifests, aliases) => {
    const direct = manifests[name];
    if (direct !== undefined) {
        return direct;
    }
    const canonical = aliases[name];
    if (canonical === undefined) {
        return undefined;
    }
    return manifests[canonical];
};
/**
 * Map each requested pre-rename name to the canonical skill it resolves to.
 * @param {string[]} requestedNames
 * @param {SkillManifestMap} manifests
 * @param {Record<string, string>} aliases
 * @returns {Record<string, string>}
 */
const collectAliasRenames = (requestedNames, manifests, aliases) => {
    /** @type {Record<string, string>} */
    const renames = {};
    for (const name of deduplicatePreservingOrder(requestedNames)) {
        if (manifests[name] !== undefined) {
            continue;
        }
        const canonical = aliases[name];
        if (canonical !== undefined && manifests[canonical] !== undefined) {
            renames[name] = canonical;
        }
    }
    return renames;
};
/**
 * @param {string[]} requestedNames
 * @param {SkillManifestMap} manifests
 * @param {Record<string, string>} aliases
 * @returns {string[]}
 */
const describeAliasRedirects = (requestedNames, manifests, aliases) => {
    return Object.entries(collectAliasRenames(requestedNames, manifests, aliases)).map(([oldName, newName]) => `Note: skill '${oldName}' was renamed to '${newName}'; ` +
        "update your configuration to use the new name.");
};
/**
 * @param {unknown} rawConfig
 * @returns {Record<string, any>}
 */
const selectConfigSkillsSection = (rawConfig) => {
    if (rawConfig !== null && typeof rawConfig === "object" && !Array.isArray(rawConfig)) {
        const section = /** @type {Record<string, any>} */ (rawConfig)[SKILLS_CONFIG_SECTION];
        if (section !== null && typeof section === "object" && !Array.isArray(section)) {
            return section;
        }
    }
    return /** @type {Record<string, any>} */ (rawConfig);
};
/**
 * Rewrite pre-rename skill names in the sync config to their aliases so the
 * stored config converges to canonical names instead of relying on the alias
 * forever.
 * @param {string} configPath
 * @param {Record<number, Record<string, string>>} renamesByIndex
 * @param {boolean} dryRun
 * @returns {string[]}
 */
const applyConfigAliasRenames = (configPath, renamesByIndex, dryRun) => {
    const entries = Object.entries(renamesByIndex);
    if (entries.length === 0) {
        return [];
    }
    const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const sources = selectConfigSkillsSection(rawConfig).sources;
    /** @type {string[]} */
    const messages = [];
    let changed = false;
    for (const [index, renames] of entries) {
        const source = sources[Number(index)];
        /** @type {string[]} */
        const originalSkills = source.skills;
        const updatedSkills = deduplicatePreservingOrder(originalSkills.map((name) => renames[name] ?? name));
        const unchanged = updatedSkills.length === originalSkills.length &&
            updatedSkills.every((name, position) => name === originalSkills[position]);
        if (unchanged) {
            continue;
        }
        for (const [oldName, newName] of Object.entries(renames)) {
            messages.push(`${dryRun ? "Would update" : "Updated"} config: '${oldName}' -> '${newName}'`);
        }
        if (!dryRun) {
            source.skills = updatedSkills;
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(configPath, `${JSON.stringify(rawConfig, null, 2)}\n`, "utf8");
    }
    return messages;
};
/**
 * @param {string} skillName
 */
const buildMakeShareableRecommendation = (skillName) => {
    return (`Recommended next step: use /${SHAREABILITY_WIZARD} on '${skillName}' to decide ` +
        "whether it should be shareable or repo-local and to add " +
        "shareable-skills.visibility, shareable-skills.requires, and " +
        "shareable-skills.reason where needed.");
};
/**
 * @param {SkillManifest} manifest
 * @param {SkillManifestMap} manifests
 * @param {Record<string, string>} [aliases]
 */
const ensureShareableManifest = (manifest, manifests, aliases = {}) => {
    if (!manifest.visibility || !EXPORTABLE_VISIBILITY.has(manifest.visibility)) {
        const reasonSuffix = manifest.reason ? ` Reason: ${manifest.reason}` : "";
        throw new ToolError(`Skill '${manifest.name}' is not shareable.${reasonSuffix} ${buildMakeShareableRecommendation(manifest.name)}`);
    }
    for (const dependencyName of manifest.requires) {
        const dependency = lookupManifest(dependencyName, manifests, aliases);
        if (dependency === undefined) {
            throw new ToolError(`Skill '${manifest.name}' depends on missing skill '${dependencyName}'.`);
        }
        if (!dependency.visibility || !EXPORTABLE_VISIBILITY.has(dependency.visibility)) {
            throw new ToolError(`Skill '${manifest.name}' depends on '${dependencyName}', which is not shareable.`);
        }
    }
};
/**
 * @param {SkillManifestMap} manifests
 * @param {string[]} requestedNames
 * @param {Record<string, string>} [aliases]
 * @returns {SkillManifest[]}
 */
export const resolveSelectedSkills = (manifests, requestedNames, aliases = {}) => {
    /** @type {SkillManifest[]} */
    const resolved = [];
    const visiting = new Set();
    const visited = new Set();
    /** @param {string} skillName */
    const visit = (skillName) => {
        const manifest = lookupManifest(skillName, manifests, aliases);
        if (manifest === undefined) {
            throw new ToolError(`Unknown skill '${skillName}'.`);
        }
        const canonicalName = manifest.name;
        if (visited.has(canonicalName)) {
            return;
        }
        if (visiting.has(canonicalName)) {
            throw new ToolError(`Circular skill dependency detected at '${canonicalName}'.`);
        }
        ensureShareableManifest(manifest, manifests, aliases);
        visiting.add(canonicalName);
        for (const dependencyName of manifest.requires) {
            visit(dependencyName);
        }
        visiting.delete(canonicalName);
        visited.add(canonicalName);
        resolved.push(manifest);
    };
    for (const requestedName of requestedNames) {
        visit(requestedName);
    }
    return resolved;
};
/**
 * @param {SkillManifestMap} manifests
 */
const describeSkills = (manifests) => {
    const skillNames = Object.keys(manifests).sort();
    if (skillNames.length === 0) {
        return "No skills found.";
    }
    return skillNames
        .map((skillName) => {
        const manifest = manifests[skillName];
        const scope = manifest.scope ?? "missing";
        const visibility = manifest.visibility ?? "missing";
        const requires = manifest.requires.length > 0 ? manifest.requires.join(" ") : "-";
        const reason = manifest.reason ? `; reason ${manifest.reason}` : "";
        return `${manifest.name}: scope ${scope}; visibility ${visibility}; requires ${requires}${reason}`;
    })
        .join("\n");
};
/**
 * @param {string} sourcePath
 * @param {string} skillName
 */
const resolveSourceSkillDirectory = (sourcePath, skillName) => {
    const skillDirectory = path.join(resolveSourceSkillsRoot(sourcePath), skillName);
    if (!isFile(path.join(skillDirectory, "SKILL.md"))) {
        throw new ToolError(`Could not find source skill '${skillName}' at ${skillDirectory}`);
    }
    return path.resolve(skillDirectory);
};
/**
 * @param {SkillManifest} manifest
 * @param {string} destinationSkillsDir
 * @param {boolean} dryRun
 * @param {boolean} force
 */
const linkSkillDirectory = (manifest, destinationSkillsDir, dryRun, force) => {
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
            throw new ToolError(`Destination '${destination}' already points to '${existingTarget}'. Use --force to replace it.`);
        }
        removeDirectoryLink(destination);
    }
    else if (pathExists(destination)) {
        throw new ToolError(`Destination '${destination}' already exists and is not a symlink. Remove it manually before linking.`);
    }
    createDirectoryLink(destination, target);
    return `Linked ${destination} -> ${target}`;
};
/**
 * @param {string} skillName
 * @param {string} destinationSkillsDir
 * @param {boolean} dryRun
 * @param {string | null} expectedTarget
 */
const unlinkSkillDirectory = (skillName, destinationSkillsDir, dryRun, expectedTarget) => {
    const destination = path.join(destinationSkillsDir, skillName);
    if (dryRun) {
        return expectedTarget === null
            ? `Would unlink ${destination}`
            : `Would unlink ${destination} -> ${expectedTarget}`;
    }
    if (!isDirectoryLink(destination)) {
        if (pathExists(destination)) {
            throw new ToolError(`Destination '${destination}' exists and is not a symlink. Remove it manually if that is intended.`);
        }
        throw new ToolError(`Skill '${skillName}' is not linked at '${destination}'.`);
    }
    const existingTarget = resolveExistingLinkTarget(destination);
    if (expectedTarget !== null && existingTarget !== path.resolve(expectedTarget)) {
        throw new ToolError(`Destination '${destination}' points to '${existingTarget}', not '${expectedTarget}'.`);
    }
    removeDirectoryLink(destination);
    return `Unlinked ${destination} -> ${existingTarget}`;
};
/**
 * @param {string} configPath
 */
const inferConfigBaseRoot = (configPath) => {
    return path.basename(path.dirname(configPath)) === ".agents"
        ? path.dirname(path.dirname(configPath))
        : path.dirname(configPath);
};
/**
 * @param {string} destinationPath
 * @param {boolean} useGlobal
 * @param {string | null} rawConfig
 */
const resolveSyncConfigPath = (destinationPath, useGlobal, rawConfig) => {
    if (typeof rawConfig === "string") {
        return path.resolve(rawConfig);
    }
    if (useGlobal) {
        throw new ToolError("sync with --global requires --config");
    }
    const agentsDir = path.join(toRepoRoot(destinationPath), ".agents");
    const agentsConfig = path.join(agentsDir, AGENTS_CONFIG_FILENAME);
    const legacySkillsConfig = path.join(agentsDir, SYNC_CONFIG_FILENAME);
    if (isFile(agentsConfig)) {
        if (agentsConfigHasSkills(agentsConfig) || !isFile(legacySkillsConfig)) {
            return agentsConfig;
        }
    }
    if (isFile(legacySkillsConfig)) {
        return legacySkillsConfig;
    }
    return agentsConfig;
};
/**
 * @param {string} packageName
 * @param {string} [cwd]
 * @returns {string}
 */
export const resolvePackageSourceRoot = (packageName, cwd = process.cwd()) => {
    return resolvePackageRoot(packageName, cwd);
};
/**
 * @param {string} configSource
 * @param {string} configPath
 * @param {string} cwd
 */
const resolveConfiguredSourceRoot = (configSource, configPath, cwd) => {
    if (configSource.startsWith(PACKAGE_SOURCE_PREFIX)) {
        const packageName = configSource.slice(PACKAGE_SOURCE_PREFIX.length).trim();
        if (packageName === "") {
            throw new ToolError("Package skill sources must include a package name after 'package:'.");
        }
        return resolvePackageSourceRoot(packageName, cwd);
    }
    return path.isAbsolute(configSource)
        ? path.resolve(configSource)
        : path.resolve(inferConfigBaseRoot(configPath), configSource);
};
/**
 * @param {unknown} value
 * @param {string} context
 */
const requireStringList = (value, context) => {
    if (!Array.isArray(value)) {
        throw new ToolError(`${context} must be an array of strings.`);
    }
    const entries = value.filter((entry) => typeof entry === "string" && entry.trim() !== "");
    if (entries.length !== value.length) {
        throw new ToolError(`${context} must contain only non-empty strings.`);
    }
    if (entries.length === 0) {
        throw new ToolError(`${context} must not be empty.`);
    }
    return entries;
};
/**
 * @param {string} text
 */
const parseConfiguredSkillSources = (text) => {
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (error) {
        throw new ToolError(`Skills config is not valid JSON: ${error}`);
    }
    const config = ensureJsonObject(parsed, "Skills config");
    const skillsConfig = config[SKILLS_CONFIG_SECTION] === undefined
        ? config
        : ensureJsonObject(config[SKILLS_CONFIG_SECTION], "Agents config skills");
    if (!Array.isArray(skillsConfig.sources) || skillsConfig.sources.length === 0) {
        throw new ToolError("Skills config must define a non-empty 'sources' array.");
    }
    return skillsConfig.sources.map((rawSource, index) => {
        const sourceObject = ensureJsonObject(rawSource, `Skills config source #${index + 1}`);
        if (typeof sourceObject.from !== "string" || sourceObject.from.trim() === "") {
            throw new ToolError(`Skills config source #${index + 1} is missing a non-empty 'from' value.`);
        }
        return {
            source: sourceObject.from,
            skills: requireStringList(sourceObject.skills, `Skills config source '${sourceObject.from}' skills`),
        };
    });
};
/**
 * @param {string} configPath
 */
const agentsConfigHasSkills = (configPath) => {
    try {
        const parsed = ensureJsonObject(
            JSON.parse(fs.readFileSync(configPath, "utf8")),
            "Agents config",
        );
        const skillsConfig = parsed[SKILLS_CONFIG_SECTION];
        return skillsConfig !== null &&
            !Array.isArray(skillsConfig) &&
            typeof skillsConfig === "object";
    }
    catch {
        return true;
    }
};
/**
 * @param {string} configPath
 */
const loadConfiguredSkillSources = (configPath) => {
    if (!isFile(configPath)) {
        throw new ToolError(`Could not find skills config at ${configPath}`);
    }
    return parseConfiguredSkillSources(fs.readFileSync(configPath, "utf8"));
};
/**
 * @param {SkillManifestMap} manifests
 * @param {string[]} requestedNames
 * @param {Record<string, string>} [aliases]
 */
const findMissingRequestedSkills = (manifests, requestedNames, aliases = {}) => {
    return deduplicatePreservingOrder(requestedNames).filter((skillName) => lookupManifest(skillName, manifests, aliases) === undefined);
};
/**
 * @param {Array<[string, string[]]>} missingBySource
 */
const describeMissingConfiguredSkills = (missingBySource) => {
    return [
        "Skills config references missing skills:",
        ...missingBySource.map(([source, missingNames]) => `- source '${source}': ${missingNames.join(", ")}`),
    ].join("\n");
};
/**
 * @param {string} destinationSkillsDir
 * @param {boolean} dryRun
 */
const cleanupDeadSkillLinks = (destinationSkillsDir, dryRun) => {
    if (!pathExists(destinationSkillsDir)) {
        return [];
    }
    if (!isDirectory(destinationSkillsDir)) {
        throw new ToolError(`Destination skills path is not a directory: ${destinationSkillsDir}`);
    }
    /** @type {string[]} */
    const messages = [];
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
};
/**
 * @param {boolean} useGlobal
 * @param {string | null} destination
 */
const validateDestinationFlags = (useGlobal, destination) => {
    if (useGlobal && destination !== null) {
        throw new ToolError("cannot combine --global with --to");
    }
};
/**
 * @param {{ source: string | null }} listState
 * @param {ExecutionOptions} options
 */
const handleListCommand = ({ source }, options) => {
    const manifests = discoverSkillManifests(resolvePath(source, options.cwd));
    options.output(describeSkills(manifests));
    return 0;
};
/**
 * @param {TargetCommandState} parsed
 * @param {ExecutionOptions} options
 */
const handleLinkCommand = (parsed, options) => {
    validateDestinationFlags(parsed.useGlobal, parsed.destination);
    const sourcePath = resolvePath(parsed.source, options.cwd);
    const manifests = discoverSkillManifests(sourcePath);
    const aliases = loadSkillAliases(sourcePath);
    const destinationSkillsDir = resolveDestinationSkillsRoot(resolvePath(parsed.destination, options.cwd), parsed.useGlobal);
    const requestedSkills = deduplicatePreservingOrder(parsed.skills);
    for (const message of describeAliasRedirects(requestedSkills, manifests, aliases)) {
        options.output(message);
    }
    for (const manifest of resolveSelectedSkills(manifests, requestedSkills, aliases)) {
        options.output(linkSkillDirectory(manifest, destinationSkillsDir, parsed.dryRun, parsed.force));
    }
    return 0;
};
/**
 * @param {TargetCommandState} parsed
 * @param {ExecutionOptions} options
 */
const handleSyncCommand = (parsed, options) => {
    validateDestinationFlags(parsed.useGlobal, parsed.destination);
    const destinationPath = resolvePath(parsed.destination, options.cwd);
    const configPath = resolveSyncConfigPath(destinationPath, parsed.useGlobal, parsed.config);
    const destinationSkillsDir = resolveDestinationSkillsRoot(destinationPath, parsed.useGlobal);
    /** @type {Array<[string, string[]]>} */
    const missingBySource = [];
    /** @type {SkillManifest[]} */
    const manifestsToLink = [];
    /** @type {Record<number, Record<string, string>>} */
    const renamesByIndex = {};
    const linkedSkillNames = new Set();
    let sourceIndex = 0;
    for (const configuredSource of loadConfiguredSkillSources(configPath)) {
        const index = sourceIndex;
        sourceIndex += 1;
        const sourceRoot = resolveConfiguredSourceRoot(configuredSource.source, configPath, options.cwd);
        const manifests = discoverSkillManifests(sourceRoot);
        const aliases = loadSkillAliases(sourceRoot);
        const requestedSkillNames = deduplicatePreservingOrder(configuredSource.skills);
        const missingRequestedSkills = findMissingRequestedSkills(manifests, requestedSkillNames, aliases);
        if (missingRequestedSkills.length > 0) {
            missingBySource.push([configuredSource.source, missingRequestedSkills]);
            continue;
        }
        const renames = collectAliasRenames(requestedSkillNames, manifests, aliases);
        if (Object.keys(renames).length > 0) {
            renamesByIndex[index] = renames;
        }
        for (const manifest of resolveSelectedSkills(manifests, requestedSkillNames, aliases)) {
            if (linkedSkillNames.has(manifest.name)) {
                throw new ToolError(`Skill '${manifest.name}' is configured more than once across sync sources.`);
            }
            manifestsToLink.push(manifest);
            linkedSkillNames.add(manifest.name);
        }
    }
    if (missingBySource.length > 0) {
        throw new ToolError(describeMissingConfiguredSkills(missingBySource));
    }
    for (const message of applyConfigAliasRenames(configPath, renamesByIndex, parsed.dryRun)) {
        options.output(message);
    }
    for (const message of cleanupDeadSkillLinks(destinationSkillsDir, parsed.dryRun)) {
        options.output(message);
    }
    for (const manifest of manifestsToLink) {
        options.output(linkSkillDirectory(manifest, destinationSkillsDir, parsed.dryRun, parsed.force));
    }
    return 0;
};
/**
 * @param {TargetCommandState} parsed
 * @param {ExecutionOptions} options
 */
const handleUnlinkCommand = (parsed, options) => {
    validateDestinationFlags(parsed.useGlobal, parsed.destination);
    const sourcePath = resolvePath(parsed.source, options.cwd);
    const destinationSkillsDir = resolveDestinationSkillsRoot(resolvePath(parsed.destination, options.cwd), parsed.useGlobal);
    for (const skillName of deduplicatePreservingOrder(parsed.skills)) {
        const expectedTarget = resolveSourceSkillDirectory(sourcePath, skillName);
        options.output(unlinkSkillDirectory(skillName, destinationSkillsDir, parsed.dryRun, expectedTarget));
    }
    return 0;
};
/**
 * @param {CommandArgs} args
 * @param {string} context
 */
const assertNoPositionals = (args, context) => {
    if (args._.length > 0) {
        throw new ToolError(`${context} does not accept positional arguments.`);
    }
};
/**
 * @param {CommandArgs} args
 */
const getRequiredSkills = (args) => {
    const skills = deduplicatePreservingOrder(args._);
    if (skills.length === 0) {
        throw new ToolError("expected at least one skill name.");
    }
    return skills;
};
/**
 * @param {boolean} [includeConfig]
 * @returns {import("citty").ArgsDef}
 */
const createSharedTargetArgs = (includeConfig = false) => {
    /** @type {import("citty").ArgsDef} */
    const sharedArgs = {
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
};
/**
 * @param {ExecutionOptions} options
 * @param {string} [commandName]
 */
export const createSkillsManagementCommand = (options, commandName = "skills-management") => {
    return defineCommand({
        meta: {
            name: commandName,
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
                /** @param {{ args: CommandArgs }} context */
                run({ args }) {
                    assertNoPositionals(args, "list");
                    return handleListCommand({ source: getOptionalStringArg(args, "from") }, options);
                },
            }),
            link: defineCommand({
                meta: {
                    name: "link",
                    description: "Link one or more skills into a destination repo.",
                },
                args: createSharedTargetArgs(false),
                /** @param {{ args: CommandArgs }} context */
                run({ args }) {
                    return handleLinkCommand({
                        skills: getRequiredSkills(args),
                        source: getOptionalStringArg(args, "from"),
                        destination: getOptionalStringArg(args, "to"),
                        useGlobal: getBooleanArg(args, "global"),
                        dryRun: getBooleanArg(args, "dry-run"),
                        force: getBooleanArg(args, "force"),
                        config: null,
                    }, options);
                },
            }),
            sync: defineCommand({
                meta: {
                    name: "sync",
                    description: "Sync skills declared in .agents/config.json.",
                },
                args: createSharedTargetArgs(true),
                /** @param {{ args: CommandArgs }} context */
                run({ args }) {
                    assertNoPositionals(args, "sync");
                    return handleSyncCommand({
                        skills: [],
                        source: null,
                        destination: getOptionalStringArg(args, "to"),
                        useGlobal: getBooleanArg(args, "global"),
                        dryRun: getBooleanArg(args, "dry-run"),
                        force: getBooleanArg(args, "force"),
                        config: getOptionalStringArg(args, "config"),
                    }, options);
                },
            }),
            unlink: defineCommand({
                meta: {
                    name: "unlink",
                    description: "Remove one or more linked skills from a destination repo.",
                },
                args: createSharedTargetArgs(false),
                /** @param {{ args: CommandArgs }} context */
                run({ args }) {
                    return handleUnlinkCommand({
                        skills: getRequiredSkills(args),
                        source: getOptionalStringArg(args, "from"),
                        destination: getOptionalStringArg(args, "to"),
                        useGlobal: getBooleanArg(args, "global"),
                        dryRun: getBooleanArg(args, "dry-run"),
                        force: getBooleanArg(args, "force"),
                        config: null,
                    }, options);
                },
            }),
        },
    });
};
/**
 * @param {string[]} [argv]
 * @param {RunOptions} [options]
 * @returns {Promise<number>}
 */
export const runSkillsManagement = async (argv = process.argv.slice(2), options = {}) => {
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        effectiveOptions.logger.error(message);
        return 1;
    }
};
