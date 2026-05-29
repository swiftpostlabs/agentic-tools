// @ts-check
import { defineCommand, runCommand } from "citty";
import fs from "node:fs";
import path from "node:path";

import {
    ToolError,
    createExecutionOptions,
    ensureJsonObject,
    isFile,
    pathExists,
    readJsonFile,
    resolvePath,
    toPosixPath,
} from "../utils/common.mjs";

/** @import { JsonObject, RunOptions, ExecutionOptions } from "../utils/common.mjs" */

/** @typedef {{ _: string[], [key: string]: unknown }} CommandArgs */
/** @typedef {boolean | Record<string, boolean>} TerminalApprovalValue */
/** @typedef {{ repoRoot: string, policyFile: string, aiExclude: string, vscodeSettings: string, claudeSettings: string }} PolicyPaths */

const CANONICAL_AGENTS_CONFIG_PATH = path.join(".agents", "config.json");
const CANONICAL_POLICY_PATH = path.join(".agents", "policy.json");
const LEGACY_POLICY_PATH = ".ai-policy.json";
const AI_EXCLUDE_PATH = ".aiexclude";
const VSCODE_SETTINGS_PATH = path.join(".vscode", "settings.json");
const CLAUDE_SETTINGS_PATH = path.join(".claude", "settings.json");
const MANAGED_COPILOT_LANGUAGE_ID = "copilot-restricted-file";

const SERVICE_GEMINI = "gemini";
const SERVICE_CLAUDE = "claude";
const SERVICE_COPILOT = "copilot";

const SUPPORTED_SERVICES = /** @type {const} */ ([
    SERVICE_GEMINI,
    SERVICE_CLAUDE,
    SERVICE_COPILOT,
]);

const SERVICE_ALIASES = /** @type {const} */ ({
    gemini: SERVICE_GEMINI,
    claude: SERVICE_CLAUDE,
    "claude-code": SERVICE_CLAUDE,
    copilot: SERVICE_COPILOT,
    "github-copilot": SERVICE_COPILOT,
});

const POLICY_KEYS = new Set([
    "services",
    "protectedFiles",
    "excludedFiles",
    "terminalAutoApprove",
    "editAutoApprove",
]);

const cloneBooleanRecord = (
    /** @type {Record<string, boolean>} */ value,
) => {
    return { ...value };
};

const cloneTerminalApprovalValue = (
    /** @type {TerminalApprovalValue} */ value,
) => {
    return typeof value === "boolean" ? value : { ...value };
};

const cloneTerminalApprovalRecord = (
    /** @type {Record<string, TerminalApprovalValue>} */ value,
) => {
    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, cloneTerminalApprovalValue(item)]),
    );
};

const isObjectRecord = (/** @type {unknown} */ value) => {
    return value !== null && !Array.isArray(value) && typeof value === "object";
};

const loadJsonDocument = (
    /** @type {string} */ targetPath,
    /** @type {string} */ context,
) => {
    if (!pathExists(targetPath)) {
        return {};
    }

    try {
        return ensureJsonObject(readJsonFile(targetPath, {}), context);
    } catch (error) {
        if (error instanceof ToolError) {
            throw error;
        }

        const message = error instanceof Error ? error.message : String(error);
        throw new ToolError(`${context} contains invalid JSON: ${message}`);
    }
};

const writeJsonText = (
    /** @type {string} */ targetPath,
    /** @type {JsonObject | null} */ payload,
) => {
    if (payload !== null) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
        return true;
    }

    if (pathExists(targetPath)) {
        fs.rmSync(targetPath, { force: true });
    }
    return false;
};

const writeTextOrRemove = (
    /** @type {string} */ targetPath,
    /** @type {string | null} */ content,
) => {
    if (content !== null) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, content, "utf8");
        return;
    }

    if (pathExists(targetPath)) {
        fs.rmSync(targetPath, { force: true });
    }
};

const readTextOrNull = (/** @type {string} */ targetPath) => {
    return pathExists(targetPath) ? fs.readFileSync(targetPath, "utf8") : null;
};

const normalizeServiceName = (/** @type {string} */ rawName) => {
    const normalized = rawName.trim().toLowerCase();
    if (!Object.hasOwn(SERVICE_ALIASES, normalized)) {
        throw new ToolError(
            `Unsupported policy service '${rawName}'. Supported values: ${Object.keys(SERVICE_ALIASES)
                .sort()
                .join(", ")}.`,
        );
    }
    const serviceName = SERVICE_ALIASES[/** @type {keyof typeof SERVICE_ALIASES} */ (normalized)];
    return serviceName;
};

const parseStringList = (
    /** @type {unknown} */ value,
    /** @type {string} */ fieldName,
) => {
    if (value === undefined || value === null) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new ToolError(`Policy '${fieldName}' must be an array of strings.`);
    }
    if (!value.every((item) => typeof item === "string")) {
        throw new ToolError(`Policy '${fieldName}' must contain only strings.`);
    }
    return [...value];
};

const parseBooleanRecord = (
    /** @type {unknown} */ value,
    /** @type {string} */ fieldName,
) => {
    if (value === undefined || value === null) {
        return {};
    }
    if (!isObjectRecord(value)) {
        throw new ToolError(`Policy '${fieldName}' must be a JSON object.`);
    }

    /** @type {Record<string, boolean>} */
    const record = {};
    for (const [key, entry] of Object.entries(value)) {
        if (typeof entry !== "boolean") {
            throw new ToolError(`Policy '${fieldName}' must contain only booleans.`);
        }
        record[key] = entry;
    }
    return record;
};

const parseTerminalApprovalValue = (
    /** @type {unknown} */ value,
    /** @type {string} */ fieldName,
) => {
    if (typeof value === "boolean") {
        return value;
    }
    if (!isObjectRecord(value)) {
        throw new ToolError(
            `Policy '${fieldName}' values must be booleans or JSON objects of booleans.`,
        );
    }

    /** @type {Record<string, boolean>} */
    const record = {};
    for (const [key, entry] of Object.entries(/** @type {Record<string, unknown>} */ (value))) {
        if (typeof entry !== "boolean") {
            throw new ToolError(
                `Policy '${fieldName}' values must be booleans or JSON objects of booleans.`,
            );
        }
        record[key] = entry;
    }
    return record;
};

const parseTerminalApprovalRecord = (
    /** @type {unknown} */ value,
    /** @type {string} */ fieldName,
) => {
    if (value === undefined || value === null) {
        return {};
    }
    if (!isObjectRecord(value)) {
        throw new ToolError(`Policy '${fieldName}' must be a JSON object.`);
    }

    /** @type {Record<string, TerminalApprovalValue>} */
    const record = {};
    for (const [key, entry] of Object.entries(value)) {
        record[key] = parseTerminalApprovalValue(entry, fieldName);
    }
    return record;
};

class AiPolicy {
    /**
     * @param {{
     *   services?: string[],
     *   protectedFiles?: string[],
     *   excludedFiles?: string[],
     *   terminalAutoApprove?: Record<string, TerminalApprovalValue>,
     *   editAutoApprove?: Record<string, boolean>,
     *   explicitFields?: Iterable<string>,
     * }} [values]
     */
    constructor(values = {}) {
        this.services = [...(values.services ?? SUPPORTED_SERVICES)];
        this.protectedFiles = [...(values.protectedFiles ?? [])];
        this.excludedFiles = [...(values.excludedFiles ?? [])];
        this.terminalAutoApprove = cloneTerminalApprovalRecord(
            values.terminalAutoApprove ?? {},
        );
        this.editAutoApprove = cloneBooleanRecord(values.editAutoApprove ?? {});
        this.explicitFields = new Set(values.explicitFields ?? []);
    }

    /** @type {string[]} */
    services;

    /** @type {string[]} */
    protectedFiles;

    /** @type {string[]} */
    excludedFiles;

    /** @type {Record<string, TerminalApprovalValue>} */
    terminalAutoApprove;

    /** @type {Record<string, boolean>} */
    editAutoApprove;

    /** @type {Set<string>} */
    explicitFields;

    /**
     * @param {unknown} value
     * @param {string} context
     */
    static parse(value, context) {
        const raw = ensureJsonObject(value, context);
        const unknownKeys = Object.keys(raw).filter((key) => !POLICY_KEYS.has(key));
        if (unknownKeys.length > 0) {
            throw new ToolError(
                `${context} is invalid at ${unknownKeys[0]}: Extra inputs are not permitted.`,
            );
        }

        /** @type {string[]} */
        const services = [];
        if (raw.services === undefined) {
            services.push(...SUPPORTED_SERVICES);
        } else {
            if (!Array.isArray(raw.services)) {
                throw new ToolError("Policy 'services' must be an array of strings.");
            }
            for (const entry of raw.services) {
                if (typeof entry !== "string" || entry.trim() === "") {
                    throw new ToolError(
                        "Policy 'services' must contain only non-empty strings.",
                    );
                }
                const serviceName = normalizeServiceName(entry);
                if (!services.includes(serviceName)) {
                    services.push(serviceName);
                }
            }
        }

        return new AiPolicy({
            services,
            protectedFiles: parseStringList(raw.protectedFiles, "protectedFiles"),
            excludedFiles: parseStringList(raw.excludedFiles, "excludedFiles"),
            terminalAutoApprove: parseTerminalApprovalRecord(
                raw.terminalAutoApprove,
                "terminalAutoApprove",
            ),
            editAutoApprove: parseBooleanRecord(raw.editAutoApprove, "editAutoApprove"),
            explicitFields: Object.keys(raw),
        });
    }

    /**
     * @param {string} targetPath
     * @param {string} context
     */
    static loadFile(targetPath, context) {
        if (!pathExists(targetPath)) {
            return new AiPolicy();
        }
        return AiPolicy.parse(loadJsonDocument(targetPath, context), context);
    }

    /**
     * @param {Partial<AiPolicy>} updates
     */
    withUpdates(updates) {
        const explicitFields = new Set(this.explicitFields);
        for (const field of Object.keys(updates)) {
            explicitFields.add(field);
        }
        return new AiPolicy({
            services: updates.services ?? this.services,
            protectedFiles: updates.protectedFiles ?? this.protectedFiles,
            excludedFiles: updates.excludedFiles ?? this.excludedFiles,
            terminalAutoApprove:
                updates.terminalAutoApprove ?? this.terminalAutoApprove,
            editAutoApprove: updates.editAutoApprove ?? this.editAutoApprove,
            explicitFields,
        });
    }

    toJsonObject() {
        /** @type {JsonObject} */
        const payload = {};
        if (this.explicitFields.has("services")) {
            payload.services = [...this.services];
        }
        if (this.explicitFields.has("protectedFiles")) {
            payload.protectedFiles = [...this.protectedFiles];
        }
        if (this.explicitFields.has("excludedFiles")) {
            payload.excludedFiles = [...this.excludedFiles];
        }
        if (this.explicitFields.has("terminalAutoApprove")) {
            payload.terminalAutoApprove = cloneTerminalApprovalRecord(
                this.terminalAutoApprove,
            );
        }
        if (this.explicitFields.has("editAutoApprove")) {
            payload.editAutoApprove = cloneBooleanRecord(this.editAutoApprove);
        }
        return payload;
    }

    dumpText() {
        const payload = this.toJsonObject();
        return Object.keys(payload).length === 0
            ? null
            : `${JSON.stringify(payload, null, 2)}\n`;
    }

    /** @param {string} targetPath */
    writeOrRemove(targetPath) {
        return writeJsonText(targetPath, this.toJsonObject());
    }
}

class ClaudePermissions {
    /**
     * @param {{ deny?: string[], extra?: JsonObject }} [values]
     */
    constructor(values = {}) {
        this.deny = [...(values.deny ?? [])];
        this.extra = { ...(values.extra ?? {}) };
    }

    /** @type {string[]} */
    deny;

    /** @type {JsonObject} */
    extra;

    /**
     * @param {unknown} value
     * @param {string} context
     */
    static parse(value, context) {
        const raw = ensureJsonObject(value, context);
        /** @type {JsonObject} */
        const extra = {};
        for (const [key, entry] of Object.entries(raw)) {
            if (key !== "deny") {
                extra[key] = entry;
            }
        }
        return new ClaudePermissions({
            deny: parseStringList(raw.deny, "deny"),
            extra,
        });
    }

    hasContent() {
        return this.deny.length > 0 || Object.keys(this.extra).length > 0;
    }

    toJsonObject() {
        /** @type {JsonObject} */
        const payload = { ...this.extra };
        if (this.deny.length > 0) {
            payload.deny = [...this.deny];
        }
        return payload;
    }
}

class ClaudeSettings {
    /**
     * @param {{ permissions?: ClaudePermissions | null, extra?: JsonObject }} [values]
     */
    constructor(values = {}) {
        this.permissions = values.permissions ?? null;
        this.extra = { ...(values.extra ?? {}) };
    }

    /** @type {ClaudePermissions | null} */
    permissions;

    /** @type {JsonObject} */
    extra;

    /**
     * @param {string} targetPath
     * @param {string} context
     */
    static loadFile(targetPath, context) {
        if (!pathExists(targetPath)) {
            return new ClaudeSettings();
        }
        const raw = loadJsonDocument(targetPath, context);
        /** @type {JsonObject} */
        const extra = {};
        for (const [key, entry] of Object.entries(raw)) {
            if (key !== "permissions") {
                extra[key] = entry;
            }
        }
        return new ClaudeSettings({
            permissions:
                raw.permissions === undefined || raw.permissions === null
                    ? null
                    : ClaudePermissions.parse(raw.permissions, `${context} permissions`),
            extra,
        });
    }

    toJsonObject() {
        /** @type {JsonObject} */
        const payload = { ...this.extra };
        if (this.permissions?.hasContent()) {
            payload.permissions = this.permissions.toJsonObject();
        }
        return payload;
    }

    hasContent() {
        return Object.keys(this.toJsonObject()).length > 0;
    }

    dumpText() {
        const payload = this.toJsonObject();
        return Object.keys(payload).length === 0
            ? null
            : `${JSON.stringify(payload, null, 2)}\n`;
    }

    /** @param {string} targetPath */
    writeOrRemove(targetPath) {
        return writeJsonText(targetPath, this.toJsonObject());
    }
}

class VscodeSettings {
    /**
     * @param {{
     *   extra?: JsonObject,
     *   filesAssociations?: Record<string, string> | null,
     *   copilotEnable?: Record<string, boolean> | null,
     *   terminalAutoApprove?: Record<string, TerminalApprovalValue> | null,
     *   editAutoApprove?: Record<string, boolean> | null,
     * }} [values]
     */
    constructor(values = {}) {
        this.extra = { ...(values.extra ?? {}) };
        this.filesAssociations = values.filesAssociations ?? null;
        this.copilotEnable = values.copilotEnable ?? null;
        this.terminalAutoApprove = values.terminalAutoApprove ?? null;
        this.editAutoApprove = values.editAutoApprove ?? null;
    }

    /** @type {JsonObject} */
    extra;

    /** @type {Record<string, string> | null} */
    filesAssociations;

    /** @type {Record<string, boolean> | null} */
    copilotEnable;

    /** @type {Record<string, TerminalApprovalValue> | null} */
    terminalAutoApprove;

    /** @type {Record<string, boolean> | null} */
    editAutoApprove;

    /**
     * @param {string} targetPath
     * @param {string} context
     */
    static loadFile(targetPath, context) {
        if (!pathExists(targetPath)) {
            return new VscodeSettings();
        }
        const raw = loadJsonDocument(targetPath, context);
        /** @type {JsonObject} */
        const extra = {};
        for (const [key, entry] of Object.entries(raw)) {
            if (
                key !== "files.associations" &&
                key !== "github.copilot.enable" &&
                key !== "chat.tools.terminal.autoApprove" &&
                key !== "chat.tools.edits.autoApprove"
            ) {
                extra[key] = entry;
            }
        }

        return new VscodeSettings({
            extra,
            filesAssociations:
                raw["files.associations"] === undefined
                    ? null
                    : parseStringRecord(raw["files.associations"], "files.associations"),
            copilotEnable:
                raw["github.copilot.enable"] === undefined
                    ? null
                    : parseBooleanRecord(
                            raw["github.copilot.enable"],
                            "github.copilot.enable",
                        ),
            terminalAutoApprove:
                raw["chat.tools.terminal.autoApprove"] === undefined
                    ? null
                    : parseTerminalApprovalRecord(
                            raw["chat.tools.terminal.autoApprove"],
                            "chat.tools.terminal.autoApprove",
                        ),
            editAutoApprove:
                raw["chat.tools.edits.autoApprove"] === undefined
                    ? null
                    : parseBooleanRecord(
                            raw["chat.tools.edits.autoApprove"],
                            "chat.tools.edits.autoApprove",
                        ),
        });
    }

    /**
     * @param {Partial<VscodeSettings>} updates
     */
    withUpdates(updates) {
        return new VscodeSettings({
            extra: this.extra,
            filesAssociations:
                Object.hasOwn(updates, "filesAssociations")
                    ? updates.filesAssociations
                    : this.filesAssociations,
            copilotEnable:
                Object.hasOwn(updates, "copilotEnable")
                    ? updates.copilotEnable
                    : this.copilotEnable,
            terminalAutoApprove:
                Object.hasOwn(updates, "terminalAutoApprove")
                    ? updates.terminalAutoApprove
                    : this.terminalAutoApprove,
            editAutoApprove:
                Object.hasOwn(updates, "editAutoApprove")
                    ? updates.editAutoApprove
                    : this.editAutoApprove,
        });
    }

    toJsonObject() {
        /** @type {JsonObject} */
        const payload = { ...this.extra };
        if (this.filesAssociations !== null) {
            payload["files.associations"] = { ...this.filesAssociations };
        }
        if (this.copilotEnable !== null) {
            payload["github.copilot.enable"] = { ...this.copilotEnable };
        }
        if (this.terminalAutoApprove !== null) {
            payload["chat.tools.terminal.autoApprove"] = cloneTerminalApprovalRecord(
                this.terminalAutoApprove,
            );
        }
        if (this.editAutoApprove !== null) {
            payload["chat.tools.edits.autoApprove"] = { ...this.editAutoApprove };
        }
        return payload;
    }

    hasContent() {
        return Object.keys(this.toJsonObject()).length > 0;
    }

    dumpText() {
        const payload = this.toJsonObject();
        return Object.keys(payload).length === 0
            ? null
            : `${JSON.stringify(payload, null, 2)}\n`;
    }

    /** @param {string} targetPath */
    writeOrRemove(targetPath) {
        return writeJsonText(targetPath, this.toJsonObject());
    }
}

class AgentsConfig {
    /**
     * @param {{ policy?: AiPolicy | null, extra?: JsonObject }} [values]
     */
    constructor(values = {}) {
        this.policy = values.policy ?? null;
        this.extra = { ...(values.extra ?? {}) };
    }

    /** @type {AiPolicy | null} */
    policy;

    /** @type {JsonObject} */
    extra;

    /**
     * @param {string} targetPath
     * @param {string} context
     */
    static loadFile(targetPath, context) {
        if (!pathExists(targetPath)) {
            return new AgentsConfig();
        }
        const raw = loadJsonDocument(targetPath, context);
        /** @type {JsonObject} */
        const extra = {};
        for (const [key, entry] of Object.entries(raw)) {
            if (key !== "policy") {
                extra[key] = entry;
            }
        }
        return new AgentsConfig({
            extra,
            policy:
                raw.policy === undefined
                    ? null
                    : AiPolicy.parse(raw.policy, "Agents config policy"),
        });
    }

    /** @param {AiPolicy | null} policy */
    withPolicy(policy) {
        return new AgentsConfig({ extra: this.extra, policy });
    }

    toJsonObject() {
        /** @type {JsonObject} */
        const payload = { ...this.extra };
        if (this.policy !== null) {
            payload.policy = this.policy.toJsonObject();
        }
        return payload;
    }

    dumpText() {
        const payload = this.toJsonObject();
        return Object.keys(payload).length === 0
            ? null
            : `${JSON.stringify(payload, null, 2)}\n`;
    }

    /** @param {string} targetPath */
    writeOrRemove(targetPath) {
        return writeJsonText(targetPath, this.toJsonObject());
    }
}

const parseStringRecord = (
    /** @type {unknown} */ value,
    /** @type {string} */ fieldName,
) => {
    if (value === undefined || value === null) {
        return {};
    }
    if (!isObjectRecord(value)) {
        throw new ToolError(`${fieldName} must be a JSON object.`);
    }

    /** @type {Record<string, string>} */
    const record = {};
    for (const [key, entry] of Object.entries(value)) {
        if (typeof entry !== "string") {
            throw new ToolError(`${fieldName} must contain only strings.`);
        }
        record[key] = entry;
    }
    return record;
};

class PolicyDocument {
    /**
     * @param {{ config: AgentsConfig, isUnified: boolean }} values
     */
    constructor(values) {
        this.config = values.config;
        this.isUnified = values.isUnified;
    }

    /** @type {AgentsConfig} */
    config;

    /** @type {boolean} */
    isUnified;
}

const extractPolicyApprovalMaps = (
    /** @type {VscodeSettings} */ vscode,
) => {
    return {
        terminalAutoApprove: cloneTerminalApprovalRecord(
            vscode.terminalAutoApprove ?? {},
        ),
        editAutoApprove: cloneBooleanRecord(vscode.editAutoApprove ?? {}),
    };
};

const buildManagedReadRules = (/** @type {string[]} */ protectedFiles) => {
    return protectedFiles.map((pattern) => `Read(${pattern})`);
};

const applyPolicyToClaudeSettings = (
    /** @type {ClaudeSettings} */ claude,
    /** @type {string[]} */ protectedFiles,
) => {
    const existingPermissions = claude.permissions ?? new ClaudePermissions();
    const deny = [
        ...existingPermissions.deny.filter((entry) => !entry.startsWith("Read(")),
        ...buildManagedReadRules(protectedFiles),
    ];
    const permissions = new ClaudePermissions({
        deny,
        extra: existingPermissions.extra,
    });

    return new ClaudeSettings({
        extra: claude.extra,
        permissions: permissions.hasContent() ? permissions : null,
    });
};

const mergeManagedAssociations = (
    /** @type {Record<string, string> | null} */ existing,
    /** @type {string[]} */ protectedFiles,
) => {
    const preserved = Object.fromEntries(
        Object.entries(existing ?? {}).filter(
            ([, language]) => language !== MANAGED_COPILOT_LANGUAGE_ID,
        ),
    );
    const managed = Object.fromEntries(
        protectedFiles.map((pattern) => [pattern, MANAGED_COPILOT_LANGUAGE_ID]),
    );
    const merged = { ...preserved, ...managed };
    return Object.keys(merged).length > 0 ? merged : null;
};

const mergeCopilotEnable = (
    /** @type {Record<string, boolean> | null} */ existing,
    /** @type {string[]} */ protectedFiles,
) => {
    const enable = Object.fromEntries(
        Object.entries(existing ?? {}).filter(
            ([key]) => key !== MANAGED_COPILOT_LANGUAGE_ID,
        ),
    );
    if (protectedFiles.length > 0) {
        enable[MANAGED_COPILOT_LANGUAGE_ID] = false;
    }
    return Object.keys(enable).length > 0 ? enable : null;
};

const applyPolicyToVscodeSettings = (
    /** @type {VscodeSettings} */ vscode,
    /** @type {{
     *   protectedFiles: string[],
     *   terminalAutoApprove: Record<string, TerminalApprovalValue>,
     *   editAutoApprove: Record<string, boolean>,
     * }} */ policy,
) => {
    return vscode.withUpdates({
        filesAssociations: mergeManagedAssociations(
            vscode.filesAssociations,
            policy.protectedFiles,
        ),
        copilotEnable: mergeCopilotEnable(
            vscode.copilotEnable,
            policy.protectedFiles,
        ),
        terminalAutoApprove:
            Object.keys(policy.terminalAutoApprove).length > 0
                ? cloneTerminalApprovalRecord(policy.terminalAutoApprove)
                : null,
        editAutoApprove:
            Object.keys(policy.editAutoApprove).length > 0
                ? cloneBooleanRecord(policy.editAutoApprove)
                : null,
    });
};

const loadPolicyDocument = (/** @type {string} */ targetPath) => {
    const config = AgentsConfig.loadFile(targetPath, "Policy file");
    if (config.policy !== null) {
        return new PolicyDocument({ config, isUnified: true });
    }
    const policy = AiPolicy.loadFile(targetPath, "Policy file");
    return new PolicyDocument({
        config: new AgentsConfig({ policy }),
        isUnified: false,
    });
};

const writePolicyDocument = (
    /** @type {string} */ targetPath,
    /** @type {PolicyDocument} */ document,
    /** @type {AiPolicy} */ policy,
) => {
    if (document.isUnified) {
        document.config.withPolicy(policy).writeOrRemove(targetPath);
        return;
    }
    policy.writeOrRemove(targetPath);
};

const agentsConfigHasPolicy = (/** @type {string} */ targetPath) => {
    try {
        return AgentsConfig.loadFile(targetPath, "Agents config").policy !== null;
    } catch {
        return true;
    }
};

const importPolicyFromVscode = (
    /** @type {AiPolicy} */ policy,
    /** @type {string} */ vscodeSettingsPath,
) => {
    const vscode = VscodeSettings.loadFile(vscodeSettingsPath, "VS Code settings");
    return policy.withUpdates(extractPolicyApprovalMaps(vscode));
};

const buildAiExcludeContent = (
    /** @type {AiPolicy} */ policy,
    /** @type {string} */ policyLabel,
) => {
    return [
        "# ==============================================================================",
        "# AI EXCLUSION FILE",
        `# Generated from ${policyLabel}`,
        "# Protected files are sensitive; excluded files are mostly noise or generated output.",
        "# ==============================================================================",
        "",
        "# --- 1. Protected files ---",
        ...policy.protectedFiles,
        "",
        "# --- 2. Excluded noise / generated output ---",
        ...policy.excludedFiles,
        "",
    ].join("\n");
};

const discoverPolicyPath = (/** @type {string} */ startPath) => {
    let currentPath = path.resolve(startPath);
    while (true) {
        const agentsConfigPath = path.join(currentPath, CANONICAL_AGENTS_CONFIG_PATH);
        if (isFile(agentsConfigPath) && agentsConfigHasPolicy(agentsConfigPath)) {
            return agentsConfigPath;
        }

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
            return null;
        }
        currentPath = parentPath;
    }
};

const resolvePolicyPath = (
    /** @type {string | null} */ rawConfig,
    /** @type {string} */ cwd,
) => {
    if (rawConfig !== null) {
        const configPath = resolvePath(rawConfig, cwd);
        if (!isFile(configPath)) {
            throw new ToolError(`Could not find policy file at ${configPath}`);
        }
        return configPath;
    }

    return discoverPolicyPath(resolvePath(null, cwd));
};

const resolvePolicyPaths = (/** @type {string} */ policyFile) => {
    const resolvedPolicy = path.resolve(policyFile);
    let repoRoot = path.dirname(resolvedPolicy);
    if (
        [path.basename(CANONICAL_AGENTS_CONFIG_PATH), path.basename(CANONICAL_POLICY_PATH)].includes(
            path.basename(resolvedPolicy),
        ) &&
        path.basename(path.dirname(resolvedPolicy)) ===
            path.basename(path.dirname(CANONICAL_POLICY_PATH))
    ) {
        repoRoot = path.dirname(path.dirname(resolvedPolicy));
    } else if (path.basename(resolvedPolicy) === path.basename(LEGACY_POLICY_PATH)) {
        repoRoot = path.dirname(resolvedPolicy);
    }

    return {
        repoRoot,
        policyFile: resolvedPolicy,
        aiExclude: path.join(repoRoot, AI_EXCLUDE_PATH),
        vscodeSettings: path.join(repoRoot, VSCODE_SETTINGS_PATH),
        claudeSettings: path.join(repoRoot, CLAUDE_SETTINGS_PATH),
    };
};

const formatRelativePath = (
    /** @type {string} */ repoRoot,
    /** @type {string} */ targetPath,
) => {
    const relativePath = path.relative(repoRoot, targetPath);
    return relativePath.startsWith("..") ? targetPath : toPosixPath(relativePath);
};

const buildCheckModeError = (
    /** @type {PolicyPaths} */ paths,
    /** @type {string[]} */ driftPaths,
) => {
    const driftSummary = driftPaths
        .map((targetPath) => formatRelativePath(paths.repoRoot, targetPath))
        .join(", ");
    return (
        `Managed policy files are out of sync: ${driftSummary}. ` +
        "Run `uv run agentic-tools policy sync` to sync them. " +
        "If you intended to keep VS Code approval edits instead, run " +
        "`uv run agentic-tools policy import-vscode`."
    );
};

/**
 * @param {string} policyFile
 * @param {{ importVscode?: boolean, check?: boolean }} [options]
 */
export const syncPolicyFile = (policyFile, { importVscode = false, check = false } = {}) => {
    if (importVscode && check) {
        throw new ToolError(
            "`--check` cannot be combined with `--import-vscode`. Run `uv run agentic-tools policy import-vscode` instead.",
        );
    }

    const paths = resolvePolicyPaths(policyFile);
    const document = loadPolicyDocument(paths.policyFile);
    if (document.config.policy === null) {
        throw new ToolError("Policy file did not resolve to a valid policy.");
    }

    const effective = importVscode
        ? importPolicyFromVscode(document.config.policy, paths.vscodeSettings)
        : document.config.policy;

    /** @type {string[]} */
    const messages = [];
    const policyLabel = formatRelativePath(paths.repoRoot, paths.policyFile);
    if (importVscode) {
        writePolicyDocument(paths.policyFile, document, effective);
        messages.push(`Imported: VS Code approvals into ${policyLabel}`);
    }

    messages.push(
        `Loaded ${effective.services.length} services, ${effective.protectedFiles.length} protected patterns and ${effective.excludedFiles.length} excluded patterns`,
    );

    const expectedAiExclude =
        effective.services.includes(SERVICE_GEMINI) &&
        (effective.protectedFiles.length > 0 || effective.excludedFiles.length > 0)
            ? buildAiExcludeContent(effective, policyLabel)
            : null;

    const claudeExisting = ClaudeSettings.loadFile(
        paths.claudeSettings,
        "Claude settings",
    );
    const updatedClaude = applyPolicyToClaudeSettings(
        claudeExisting,
        effective.services.includes(SERVICE_CLAUDE) ? effective.protectedFiles : [],
    );
    const expectedClaudeText = updatedClaude.dumpText();

    const vscodeExisting = VscodeSettings.loadFile(
        paths.vscodeSettings,
        "VS Code settings",
    );
    const updatedVscode = applyPolicyToVscodeSettings(vscodeExisting, {
        protectedFiles: effective.services.includes(SERVICE_COPILOT)
            ? effective.protectedFiles
            : [],
        terminalAutoApprove: effective.services.includes(SERVICE_COPILOT)
            ? effective.terminalAutoApprove
            : {},
        editAutoApprove: effective.services.includes(SERVICE_COPILOT)
            ? effective.editAutoApprove
            : {},
    });
    const expectedVscodeText = updatedVscode.dumpText();

    if (check) {
        /** @type {[string, string | null][]} */
        const expectedOutputs = [
            [paths.aiExclude, expectedAiExclude],
            [paths.claudeSettings, expectedClaudeText],
            [paths.vscodeSettings, expectedVscodeText],
        ];
        const driftPaths = expectedOutputs
            .filter(([targetPath, expected]) => readTextOrNull(targetPath) !== expected)
            .map(([targetPath]) => targetPath);

        if (driftPaths.length > 0) {
            throw new ToolError(buildCheckModeError(paths, driftPaths));
        }

        messages.push("Checked: generated policy files are up to date.");
        messages.push("Done.");
        return messages;
    }

    const hadGeminiFile = pathExists(paths.aiExclude);
    writeTextOrRemove(paths.aiExclude, expectedAiExclude);
    if (expectedAiExclude !== null) {
        messages.push("Synced: Gemini (.aiexclude)");
    } else if (hadGeminiFile) {
        messages.push("Removed: Gemini (.aiexclude)");
    }

    const claudeExistingHadContent = claudeExisting.hasContent();
    updatedClaude.writeOrRemove(paths.claudeSettings);
    if (effective.services.includes(SERVICE_CLAUDE)) {
        messages.push("Synced: Claude Code (.claude/settings.json)");
    } else if (claudeExistingHadContent) {
        messages.push("Cleaned: Claude Code (.claude/settings.json)");
    }

    const vscodeExistingHadContent = vscodeExisting.hasContent();
    updatedVscode.writeOrRemove(paths.vscodeSettings);
    if (effective.services.includes(SERVICE_COPILOT)) {
        messages.push("Synced: Copilot local policy (.vscode/settings.json)");
    } else if (vscodeExistingHadContent) {
        messages.push("Cleaned: Copilot local policy (.vscode/settings.json)");
    }

    messages.push("Done.");
    return messages;
};

const getOptionalStringArg = (
    /** @type {CommandArgs} */ args,
    /** @type {string} */ key,
) => {
    const value = args[key];
    return typeof value === "string" && value.trim() !== "" ? value : null;
};

const getBooleanArg = (
    /** @type {CommandArgs} */ args,
    /** @type {string} */ key,
) => {
    return args[key] === true;
};

const createAgentsPolicyCommand = (/** @type {ExecutionOptions} */ options) => {
    return defineCommand({
        meta: {
            name: "agents-policy",
            description: "Sync generated agent policy files from .agents/config.json.",
        },
        args: {
            config: {
                type: "string",
                alias: ["c"],
                description: "Path to an agents config or policy file.",
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

            const policyPath = resolvePolicyPath(
                getOptionalStringArg(args, "config"),
                options.cwd,
            );
            if (policyPath === null) {
                options.output(
                    "No .agents/config.json policy, .agents/policy.json, or legacy .ai-policy.json found. Nothing to sync.",
                );
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
};

/**
 * @param {string[]} [argv]
 * @param {RunOptions} [options]
 * @returns {Promise<number>}
 */
export const runAgentsPolicy = async (argv = process.argv.slice(2), options = {}) => {
    const effectiveOptions = createExecutionOptions(options);
    const command = createAgentsPolicyCommand(effectiveOptions);
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
};

/**
 * @param {RunOptions} [options]
 * @returns {Promise<number>}
 */
export const runAgentsPolicyImportVscode = async (options = {}) => {
    return runAgentsPolicy(["--import-vscode"], options);
};

export { discoverPolicyPath };
