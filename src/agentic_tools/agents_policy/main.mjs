// @ts-check
import { defineCommand, runCommand } from "citty";
import fs from "node:fs";
import path from "node:path";
import { ToolError, createExecutionOptions, ensureJsonObject, getBooleanRecord, getStringList, getStringRecord, pathExists, readJsonFile, resolvePath, syncJsonFile, toPosixPath, writeJsonFile, writeTextFile, } from "../utils/common.mjs";

/** @typedef {import("../utils/common.mjs").JsonObject} JsonObject */
/** @typedef {import("../utils/common.mjs").RunOptions} RunOptions */
/** @typedef {import("../utils/common.mjs").ExecutionOptions} ExecutionOptions */
/** @typedef {JsonObject & { services?: unknown, protectedFiles?: unknown, excludedFiles?: unknown, terminalAutoApprove?: unknown, editAutoApprove?: unknown }} PolicyState */
/** @typedef {{ _: string[], [key: string]: unknown }} CommandArgs */

const CANONICAL_POLICY_PATH = path.join(".agents", "policy.json");
const LEGACY_POLICY_PATH = ".ai-policy.json";
const AI_EXCLUDE_PATH = ".aiexclude";
const VSCODE_SETTINGS_PATH = path.join(".vscode", "settings.json");
const CLAUDE_SETTINGS_PATH = path.join(".claude", "settings.json");
const MANAGED_COPILOT_LANGUAGE_ID = "copilot-restricted-file";
const SERVICE_GEMINI = "gemini";
const SERVICE_CLAUDE = "claude";
const SERVICE_COPILOT = "copilot";
const SUPPORTED_SERVICES = [SERVICE_GEMINI, SERVICE_CLAUDE, SERVICE_COPILOT];
/** @type {Record<string, string>} */
const SERVICE_ALIASES = {
    gemini: SERVICE_GEMINI,
    claude: SERVICE_CLAUDE,
    "claude-code": SERVICE_CLAUDE,
    copilot: SERVICE_COPILOT,
    "github-copilot": SERVICE_COPILOT,
};
/**
 * @param {CommandArgs} args
 * @param {string} key
 * @returns {string | null}
 */
function getOptionalStringArg(args, key) {
    const value = args[key];
    return typeof value === "string" && value.trim() !== "" ? value : null;
}
/**
 * @param {CommandArgs} args
 * @param {string} key
 * @returns {boolean}
 */
function getBooleanArg(args, key) {
    return args[key] === true;
}
/** @returns {PolicyState} */
function buildDefaultPolicy() {
    return {
        services: [...SUPPORTED_SERVICES],
        protectedFiles: [],
        excludedFiles: [],
        terminalAutoApprove: {},
        editAutoApprove: {},
    };
}
/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function getTerminalApprovalMapping(value) {
    if (value === null || Array.isArray(value) || typeof value !== "object") {
        return {};
    }
    return Object.fromEntries(Object.entries(value));
}
/**
 * @param {PolicyState} policy
 * @returns {string[]}
 */
function getProtectedFiles(policy) {
    return getStringList(policy.protectedFiles);
}
/**
 * @param {PolicyState} policy
 * @returns {string[]}
 */
function getExcludedFiles(policy) {
    return getStringList(policy.excludedFiles);
}
/**
 * @param {string} rawName
 * @returns {string}
 */
function normalizeServiceName(rawName) {
    const normalized = rawName.trim().toLowerCase();
    const serviceName = SERVICE_ALIASES[normalized];
    if (serviceName === undefined) {
        throw new ToolError(`Unsupported policy service '${rawName}'. Supported values: ${Object.keys(SERVICE_ALIASES)
            .sort()
            .join(", ")}.`);
    }
    return serviceName;
}
/**
 * @param {PolicyState} policy
 * @returns {string[]}
 */
function getServices(policy) {
    if (policy.services === undefined) {
        return [...SUPPORTED_SERVICES];
    }
    if (!Array.isArray(policy.services)) {
        throw new ToolError("Policy 'services' must be an array of strings.");
    }
    /** @type {string[]} */
    const services = [];
    for (const entry of policy.services) {
        if (typeof entry !== "string" || entry.trim() === "") {
            throw new ToolError("Policy 'services' must contain only non-empty strings.");
        }
        const serviceName = normalizeServiceName(entry);
        if (!services.includes(serviceName)) {
            services.push(serviceName);
        }
    }
    return services;
}
/**
 * @param {string[]} protectedFiles
 * @returns {string[]}
 */
function buildProtectedReadRules(protectedFiles) {
    return protectedFiles.map((pattern) => `Read(${pattern})`);
}
/**
 * @param {string[]} existing
 * @param {string[]} protectedFiles
 * @returns {string[]}
 */
function replaceManagedClaudeDenyRules(existing, protectedFiles) {
    return [
        ...existing.filter((entry) => !entry.startsWith("Read(")),
        ...buildProtectedReadRules(protectedFiles),
    ];
}
/**
 * @param {JsonObject} claudeSettings
 * @param {Pick<PolicyState, "protectedFiles">} policy
 * @returns {JsonObject}
 */
function applyPolicyToClaudeSettings(claudeSettings, policy) {
    /** @type {JsonObject} */
    const updated = { ...claudeSettings };
    const permissions = claudeSettings.permissions !== null &&
        !Array.isArray(claudeSettings.permissions) &&
        typeof claudeSettings.permissions === "object"
        ? { .../** @type {JsonObject} */ (claudeSettings.permissions) }
        : {};
    const denyRules = replaceManagedClaudeDenyRules(getStringList(permissions.deny), getProtectedFiles(policy));
    if (denyRules.length > 0) {
        permissions.deny = denyRules;
    }
    else {
        delete permissions.deny;
    }
    if (Object.keys(permissions).length > 0) {
        updated.permissions = permissions;
    }
    else {
        delete updated.permissions;
    }
    return updated;
}
/**
 * @param {string[]} protectedFiles
 * @returns {Record<string, string>}
 */
function buildProtectedFileAssociations(protectedFiles) {
    return Object.fromEntries(protectedFiles.map((pattern) => [pattern, MANAGED_COPILOT_LANGUAGE_ID]));
}
/**
 * @param {Record<string, string>} existing
 * @param {string[]} protectedFiles
 * @returns {Record<string, string>}
 */
function replaceManagedFileAssociations(existing, protectedFiles) {
    const preserved = Object.fromEntries(Object.entries(existing).filter(([, language]) => language !== MANAGED_COPILOT_LANGUAGE_ID));
    return {
        ...preserved,
        ...buildProtectedFileAssociations(protectedFiles),
    };
}
/**
 * @param {JsonObject} vscodeSettings
 * @param {Pick<PolicyState, "protectedFiles" | "terminalAutoApprove" | "editAutoApprove">} policy
 * @returns {JsonObject}
 */
function applyPolicyToVscodeSettings(vscodeSettings, policy) {
    /** @type {JsonObject} */
    const updated = { ...vscodeSettings };
    const protectedFiles = getProtectedFiles(policy);
    const associations = replaceManagedFileAssociations(getStringRecord(updated["files.associations"]), protectedFiles);
    if (Object.keys(associations).length > 0) {
        updated["files.associations"] = associations;
    }
    else {
        delete updated["files.associations"];
    }
    const copilotEnable = getBooleanRecord(updated["github.copilot.enable"]);
    if (protectedFiles.length > 0) {
        copilotEnable[MANAGED_COPILOT_LANGUAGE_ID] = false;
    }
    else {
        delete copilotEnable[MANAGED_COPILOT_LANGUAGE_ID];
    }
    if (Object.keys(copilotEnable).length > 0) {
        updated["github.copilot.enable"] = copilotEnable;
    }
    else {
        delete updated["github.copilot.enable"];
    }
    const terminalAutoApprove = getTerminalApprovalMapping(policy.terminalAutoApprove);
    if (Object.keys(terminalAutoApprove).length > 0) {
        updated["chat.tools.terminal.autoApprove"] = terminalAutoApprove;
    }
    else {
        delete updated["chat.tools.terminal.autoApprove"];
    }
    const editAutoApprove = getBooleanRecord(policy.editAutoApprove);
    if (Object.keys(editAutoApprove).length > 0) {
        updated["chat.tools.edits.autoApprove"] = editAutoApprove;
    }
    else {
        delete updated["chat.tools.edits.autoApprove"];
    }
    return updated;
}
/**
 * @param {PolicyState} policy
 * @param {string} policyLabel
 * @returns {string}
 */
function buildAiExcludeContent(policy, policyLabel) {
    return [
        "# ==============================================================================",
        "# AI EXCLUSION FILE",
        `# Generated from ${policyLabel}`,
        "# Protected files are sensitive; excluded files are mostly noise or generated output.",
        "# ==============================================================================",
        "",
        "# --- 1. Protected files ---",
        ...getProtectedFiles(policy),
        "",
        "# --- 2. Excluded noise / generated output ---",
        ...getExcludedFiles(policy),
        "",
    ].join("\n");
}
/**
 * @param {JsonObject} data
 * @returns {string | null}
 */
function buildJsonFileContent(data) {
    if (Object.keys(data).length === 0) {
        return null;
    }
    return `${JSON.stringify(data, null, 2)}\n`;
}
/**
 * @param {string} targetPath
 * @returns {string | null}
 */
function readOptionalTextFile(targetPath) {
    if (!pathExists(targetPath)) {
        return null;
    }
    return fs.readFileSync(targetPath, "utf8");
}
/**
 * @param {PolicyState} policy
 * @param {string} vscodeSettingsPath
 * @returns {PolicyState}
 */
function importPolicyFromVscode(policy, vscodeSettingsPath) {
    const vscode = ensureJsonObject(readJsonFile(vscodeSettingsPath, {}), "VS Code settings");
    return {
        ...policy,
        terminalAutoApprove: getTerminalApprovalMapping(vscode["chat.tools.terminal.autoApprove"]),
        editAutoApprove: getBooleanRecord(vscode["chat.tools.edits.autoApprove"]),
    };
}
/**
 * @param {string} startPath
 * @returns {string | null}
 */
function discoverPolicyPath(startPath) {
    let currentPath = path.resolve(startPath);
    while (true) {
        const canonicalPath = path.join(currentPath, CANONICAL_POLICY_PATH);
        if (isFile(canonicalPath)) {
            return canonicalPath;
        }
        const legacyPath = path.join(currentPath, LEGACY_POLICY_PATH);
        if (isFile(legacyPath)) {
            return legacyPath;
        }
        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) {
            break;
        }
        currentPath = parentPath;
    }
    return null;
}
/**
 * @param {string} targetPath
 * @returns {boolean}
 */
function isFile(targetPath) {
    try {
        return fs.statSync(targetPath).isFile();
    }
    catch {
        return false;
    }
}
/**
 * @param {string | null} rawConfig
 * @param {string} cwd
 * @returns {string | null}
 */
function resolvePolicyPath(rawConfig, cwd) {
    if (typeof rawConfig === "string") {
        const configPath = resolvePath(rawConfig, cwd);
        if (!isFile(configPath)) {
            throw new ToolError(`Could not find policy file at ${configPath}`);
        }
        return configPath;
    }
    return discoverPolicyPath(resolvePath(null, cwd));
}
/**
 * @param {string} policyFile
 * @returns {{ repoRoot: string, policyFile: string, aiExclude: string, vscodeSettings: string, claudeSettings: string }}
 */
function resolvePolicyPaths(policyFile) {
    const resolvedPolicy = path.resolve(policyFile);
    let repoRoot = path.dirname(resolvedPolicy);
    if (path.basename(resolvedPolicy) === path.basename(CANONICAL_POLICY_PATH) &&
        path.basename(path.dirname(resolvedPolicy)) ===
            path.basename(path.dirname(CANONICAL_POLICY_PATH))) {
        repoRoot = path.dirname(path.dirname(resolvedPolicy));
    }
    return {
        repoRoot,
        policyFile: resolvedPolicy,
        aiExclude: path.join(repoRoot, AI_EXCLUDE_PATH),
        vscodeSettings: path.join(repoRoot, VSCODE_SETTINGS_PATH),
        claudeSettings: path.join(repoRoot, CLAUDE_SETTINGS_PATH),
    };
}
/**
 * @param {{ repoRoot: string, policyFile: string }} paths
 * @returns {string}
 */
function formatPolicyLabel(paths) {
    const relativePath = path.relative(paths.repoRoot, paths.policyFile);
    return relativePath.startsWith("..") ? paths.policyFile : toPosixPath(relativePath);
}
/**
 * @param {string} repoRoot
 * @param {string} targetPath
 * @returns {string}
 */
function formatManagedPath(repoRoot, targetPath) {
    const relativePath = path.relative(repoRoot, targetPath);
    return relativePath.startsWith("..") ? targetPath : toPosixPath(relativePath);
}
/**
 * @param {string} repoRoot
 * @param {string[]} driftPaths
 * @returns {string}
 */
function buildCheckModeError(repoRoot, driftPaths) {
    const driftSummary = driftPaths
        .map((targetPath) => formatManagedPath(repoRoot, targetPath))
        .join(", ");
    return (`Managed policy files are out of sync: ${driftSummary}. ` +
        "Run `uv run agentic-tools policy sync` to sync them. " +
        "If you intended to keep VS Code approval edits instead, run " +
        "`uv run agentic-tools policy import-vscode`.");
}
/**
 * @param {string} policyFile
 * @param {{ importVscode?: boolean, check?: boolean }} [options]
 * @returns {string[]}
 */
export function syncPolicyFile(policyFile, { importVscode = false, check = false } = {}) {
    if (importVscode && check) {
        throw new ToolError("`--check` cannot be combined with `--import-vscode`. Run `uv run agentic-tools policy import-vscode` instead.");
    }
    const paths = resolvePolicyPaths(policyFile);
    const policy = /** @type {PolicyState} */ (ensureJsonObject(readJsonFile(paths.policyFile, buildDefaultPolicy()), "Policy file"));
    const effective = importVscode
        ? importPolicyFromVscode(policy, paths.vscodeSettings)
        : policy;
    /** @type {string[]} */
    const messages = [];
    const policyLabel = formatPolicyLabel(paths);
    if (importVscode) {
        writeJsonFile(paths.policyFile, effective);
        messages.push(`Imported: VS Code approvals into ${policyLabel}`);
    }
    const services = getServices(effective);
    const protectedFiles = getProtectedFiles(effective);
    const excludedFiles = getExcludedFiles(effective);
    messages.push(`Loaded ${services.length} services, ${protectedFiles.length} protected patterns and ${excludedFiles.length} excluded patterns`);
    const expectedAiExclude = services.includes(SERVICE_GEMINI) && (protectedFiles.length > 0 || excludedFiles.length > 0)
        ? buildAiExcludeContent(effective, policyLabel)
        : null;
    /** @type {Pick<PolicyState, "protectedFiles">} */
    const claudePolicy = services.includes(SERVICE_CLAUDE)
        ? effective
        : { protectedFiles: [] };
    const claudeSettings = ensureJsonObject(readJsonFile(paths.claudeSettings, {}), "Claude settings");
    syncJsonFile(paths.claudeSettings, applyPolicyToClaudeSettings(claudeSettings, claudePolicy));
    const expectedClaudeSettings = applyPolicyToClaudeSettings(claudeSettings, claudePolicy);
    const expectedClaudeContent = buildJsonFileContent(expectedClaudeSettings);
    /** @type {Pick<PolicyState, "protectedFiles" | "terminalAutoApprove" | "editAutoApprove">} */
    const copilotPolicy = services.includes(SERVICE_COPILOT)
        ? effective
        : {
            protectedFiles: [],
            terminalAutoApprove: {},
            editAutoApprove: {},
        };
    const vscodeSettings = ensureJsonObject(readJsonFile(paths.vscodeSettings, {}), "VS Code settings");
    const expectedVscodeSettings = applyPolicyToVscodeSettings(vscodeSettings, copilotPolicy);
    const expectedVscodeContent = buildJsonFileContent(expectedVscodeSettings);
    if (check) {
        /** @type {string[]} */
        const driftPaths = [];
        if (readOptionalTextFile(paths.aiExclude) !== expectedAiExclude) {
            driftPaths.push(paths.aiExclude);
        }
        if (readOptionalTextFile(paths.claudeSettings) !== expectedClaudeContent) {
            driftPaths.push(paths.claudeSettings);
        }
        if (readOptionalTextFile(paths.vscodeSettings) !== expectedVscodeContent) {
            driftPaths.push(paths.vscodeSettings);
        }
        if (driftPaths.length > 0) {
            throw new ToolError(buildCheckModeError(paths.repoRoot, driftPaths));
        }
        messages.push("Checked: generated policy files are up to date.");
        messages.push("Done.");
        return messages;
    }
    if (expectedAiExclude !== null) {
        writeTextFile(paths.aiExclude, expectedAiExclude);
        messages.push("Synced: Gemini (.aiexclude)");
    }
    else if (pathExists(paths.aiExclude)) {
        fs.rmSync(paths.aiExclude, { force: true });
        messages.push("Removed: Gemini (.aiexclude)");
    }
    syncJsonFile(paths.claudeSettings, expectedClaudeSettings);
    if (services.includes(SERVICE_CLAUDE)) {
        messages.push("Synced: Claude Code (.claude/settings.json)");
    }
    else if (Object.keys(claudeSettings).length > 0) {
        messages.push("Cleaned: Claude Code (.claude/settings.json)");
    }
    syncJsonFile(paths.vscodeSettings, expectedVscodeSettings);
    if (services.includes(SERVICE_COPILOT)) {
        messages.push("Synced: Copilot local policy (.vscode/settings.json)");
    }
    else if (Object.keys(vscodeSettings).length > 0) {
        messages.push("Cleaned: Copilot local policy (.vscode/settings.json)");
    }
    messages.push("Done.");
    return messages;
}
/**
 * @param {ExecutionOptions} options
 */
function createAgentsPolicyCommand(options) {
    return defineCommand({
        meta: {
            name: "agents-policy",
            description: "Sync generated agent policy files from .agents/policy.json.",
        },
        args: {
            config: {
                type: "string",
                alias: ["c"],
                description: "Path to a policy file.",
            },
            "import-vscode": {
                type: "boolean",
                description: "Import VS Code approval maps back into the policy file before syncing.",
            },
            check: {
                type: "boolean",
                description: "Exit with an error if generated policy files are out of date.",
            },
        },
        /** @param {{ args: CommandArgs }} context */
        run({ args }) {
            if (args._.length > 0) {
                throw new ToolError("agents-policy does not accept positional arguments.");
            }
            const policyPath = resolvePolicyPath(getOptionalStringArg(args, "config"), options.cwd);
            if (policyPath === null) {
                options.output("No .agents/policy.json or legacy .ai-policy.json found. Nothing to sync.");
                return 0;
            }
            for (const message of syncPolicyFile(policyPath, {
                importVscode: getBooleanArg(args, "import-vscode"),
                check: getBooleanArg(args, "check"),
            })) {
                options.output(message);
            }
            return 0;
        },
    });
}
/**
 * @param {string[]} [argv]
 * @param {RunOptions} [options]
 * @returns {Promise<number>}
 */
export async function runAgentsPolicy(argv = process.argv.slice(2), options = {}) {
    const effectiveOptions = createExecutionOptions(options);
    const command = createAgentsPolicyCommand(effectiveOptions);
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
}
/**
 * @param {RunOptions} [options]
 * @returns {Promise<number>}
 */
export async function runAgentsPolicyImportVscode(options = {}) {
    return runAgentsPolicy(["--import-vscode"], options);
}
