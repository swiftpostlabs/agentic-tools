import fs from "node:fs";
import path from "node:path";
import { defineCommand, renderUsage, runCommand } from "citty";
import {
    ToolError,
  createLogger,
    ensureJsonObject,
    getBooleanRecord,
    getStringList,
    getStringRecord,
    pathExists,
    readJsonFile,
    resolvePath,
    syncJsonFile,
    toPosixPath,
    writeJsonFile,
    writeTextFile
} from "./common.js";

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
const SERVICE_ALIASES = {
  gemini: SERVICE_GEMINI,
  claude: SERVICE_CLAUDE,
  "claude-code": SERVICE_CLAUDE,
  copilot: SERVICE_COPILOT,
  "github-copilot": SERVICE_COPILOT,
};

function buildDefaultPolicy() {
  return {
    services: [...SUPPORTED_SERVICES],
    protectedFiles: [],
    excludedFiles: [],
    terminalAutoApprove: {},
    editAutoApprove: {},
  };
}

function getTerminalApprovalMapping(value) {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => typeof key === "string"),
  );
}

function getProtectedFiles(policy) {
  return getStringList(policy.protectedFiles);
}

function getExcludedFiles(policy) {
  return getStringList(policy.excludedFiles);
}

function normalizeServiceName(rawName) {
  const normalized = rawName.trim().toLowerCase();
  const serviceName = SERVICE_ALIASES[normalized];
  if (serviceName === undefined) {
    throw new ToolError(
      `Unsupported policy service '${rawName}'. Supported values: ${Object.keys(SERVICE_ALIASES)
        .sort()
        .join(", ")}.`,
    );
  }
  return serviceName;
}

function getServices(policy) {
  if (policy.services === undefined) {
    return [...SUPPORTED_SERVICES];
  }
  if (!Array.isArray(policy.services)) {
    throw new ToolError("Policy 'services' must be an array of strings.");
  }

  const services = [];
  for (const entry of policy.services) {
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

  return services;
}

function buildProtectedReadRules(protectedFiles) {
  return protectedFiles.map((pattern) => `Read(${pattern})`);
}

function replaceManagedClaudeDenyRules(existing, protectedFiles) {
  return [
    ...existing.filter((entry) => !entry.startsWith("Read(")),
    ...buildProtectedReadRules(protectedFiles),
  ];
}

function applyPolicyToClaudeSettings(claudeSettings, policy) {
  const updated = { ...claudeSettings };
  const permissions =
    claudeSettings.permissions !== null &&
    !Array.isArray(claudeSettings.permissions) &&
    typeof claudeSettings.permissions === "object"
      ? { ...claudeSettings.permissions }
      : {};

  const denyRules = replaceManagedClaudeDenyRules(
    getStringList(permissions.deny),
    getProtectedFiles(policy),
  );

  if (denyRules.length > 0) {
    permissions.deny = denyRules;
  } else {
    delete permissions.deny;
  }

  if (Object.keys(permissions).length > 0) {
    updated.permissions = permissions;
  } else {
    delete updated.permissions;
  }

  return updated;
}

function buildProtectedFileAssociations(protectedFiles) {
  return Object.fromEntries(
    protectedFiles.map((pattern) => [pattern, MANAGED_COPILOT_LANGUAGE_ID]),
  );
}

function replaceManagedFileAssociations(existing, protectedFiles) {
  const preserved = Object.fromEntries(
    Object.entries(existing).filter(
      ([, language]) => language !== MANAGED_COPILOT_LANGUAGE_ID,
    ),
  );
  return {
    ...preserved,
    ...buildProtectedFileAssociations(protectedFiles),
  };
}

function applyPolicyToVscodeSettings(vscodeSettings, policy) {
  const updated = { ...vscodeSettings };
  const protectedFiles = getProtectedFiles(policy);
  const associations = replaceManagedFileAssociations(
    getStringRecord(updated["files.associations"]),
    protectedFiles,
  );

  if (Object.keys(associations).length > 0) {
    updated["files.associations"] = associations;
  } else {
    delete updated["files.associations"];
  }

  const copilotEnable = getBooleanRecord(updated["github.copilot.enable"]);
  if (protectedFiles.length > 0) {
    copilotEnable[MANAGED_COPILOT_LANGUAGE_ID] = false;
  } else {
    delete copilotEnable[MANAGED_COPILOT_LANGUAGE_ID];
  }

  if (Object.keys(copilotEnable).length > 0) {
    updated["github.copilot.enable"] = copilotEnable;
  } else {
    delete updated["github.copilot.enable"];
  }

  const terminalAutoApprove = getTerminalApprovalMapping(
    policy.terminalAutoApprove,
  );
  if (Object.keys(terminalAutoApprove).length > 0) {
    updated["chat.tools.terminal.autoApprove"] = terminalAutoApprove;
  } else {
    delete updated["chat.tools.terminal.autoApprove"];
  }

  const editAutoApprove = getBooleanRecord(policy.editAutoApprove);
  if (Object.keys(editAutoApprove).length > 0) {
    updated["chat.tools.edits.autoApprove"] = editAutoApprove;
  } else {
    delete updated["chat.tools.edits.autoApprove"];
  }

  return updated;
}

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

function importPolicyFromVscode(policy, vscodeSettingsPath) {
  const vscode = ensureJsonObject(
    readJsonFile(vscodeSettingsPath, {}),
    "VS Code settings",
  );

  return {
    ...policy,
    terminalAutoApprove: getTerminalApprovalMapping(
      vscode["chat.tools.terminal.autoApprove"],
    ),
    editAutoApprove: getBooleanRecord(vscode["chat.tools.edits.autoApprove"]),
  };
}

function discoverPolicyPath(startPath) {
  const searchRoots = [startPath, ...path.resolve(startPath).split(path.sep)];
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

function isFile(targetPath) {
  try {
    return fs.statSync(targetPath).isFile();
  } catch {
    return false;
  }
}

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

function resolvePolicyPaths(policyFile) {
  const resolvedPolicy = path.resolve(policyFile);
  let repoRoot = path.dirname(resolvedPolicy);
  if (
    path.basename(resolvedPolicy) === path.basename(CANONICAL_POLICY_PATH) &&
    path.basename(path.dirname(resolvedPolicy)) === path.basename(path.dirname(CANONICAL_POLICY_PATH))
  ) {
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

function formatPolicyLabel(paths) {
  const relativePath = path.relative(paths.repoRoot, paths.policyFile);
  return relativePath.startsWith("..") ? paths.policyFile : toPosixPath(relativePath);
}

export function syncPolicyFile(policyFile, { importVscode = false } = {}) {
  const paths = resolvePolicyPaths(policyFile);
  const policy = ensureJsonObject(
    readJsonFile(paths.policyFile, buildDefaultPolicy()),
    "Policy file",
  );
  const effective = importVscode
    ? importPolicyFromVscode(policy, paths.vscodeSettings)
    : policy;

  const messages = [];
  const policyLabel = formatPolicyLabel(paths);
  if (importVscode) {
    writeJsonFile(paths.policyFile, effective);
    messages.push(`Imported: VS Code approvals into ${policyLabel}`);
  }

  const services = getServices(effective);
  const protectedFiles = getProtectedFiles(effective);
  const excludedFiles = getExcludedFiles(effective);

  messages.push(
    `Loaded ${services.length} services, ${protectedFiles.length} protected patterns and ${excludedFiles.length} excluded patterns`,
  );

  if (services.includes(SERVICE_GEMINI) && (protectedFiles.length > 0 || excludedFiles.length > 0)) {
    writeTextFile(paths.aiExclude, buildAiExcludeContent(effective, policyLabel));
    messages.push("Synced: Gemini (.aiexclude)");
  } else if (pathExists(paths.aiExclude)) {
    fs.rmSync(paths.aiExclude, { force: true });
    messages.push("Removed: Gemini (.aiexclude)");
  }

  const claudePolicy = services.includes(SERVICE_CLAUDE)
    ? effective
    : { protectedFiles: [] };
  const claudeSettings = ensureJsonObject(
    readJsonFile(paths.claudeSettings, {}),
    "Claude settings",
  );
  syncJsonFile(
    paths.claudeSettings,
    applyPolicyToClaudeSettings(claudeSettings, claudePolicy),
  );
  if (services.includes(SERVICE_CLAUDE)) {
    messages.push("Synced: Claude Code (.claude/settings.json)");
  } else if (Object.keys(claudeSettings).length > 0) {
    messages.push("Cleaned: Claude Code (.claude/settings.json)");
  }

  const copilotPolicy = services.includes(SERVICE_COPILOT)
    ? effective
    : {
        protectedFiles: [],
        terminalAutoApprove: {},
        editAutoApprove: {},
      };
  const vscodeSettings = ensureJsonObject(
    readJsonFile(paths.vscodeSettings, {}),
    "VS Code settings",
  );
  syncJsonFile(
    paths.vscodeSettings,
    applyPolicyToVscodeSettings(vscodeSettings, copilotPolicy),
  );
  if (services.includes(SERVICE_COPILOT)) {
    messages.push("Synced: Copilot local policy (.vscode/settings.json)");
  } else if (Object.keys(vscodeSettings).length > 0) {
    messages.push("Cleaned: Copilot local policy (.vscode/settings.json)");
  }

  messages.push("Done.");
  return messages;
}

function createExecutionOptions(options = {}) {
  const logger = options.logger ?? createLogger(options.output);

  return {
    cwd: options.cwd ?? process.cwd(),
    logger,
    output: options.output ?? ((message) => {
      logger.log(message);
    }),
  };
}

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
    },
    run({ args }) {
      if (args._.length > 0) {
        throw new ToolError("agents-policy does not accept positional arguments.");
      }

      const policyPath = resolvePolicyPath(args.config ?? null, options.cwd);
      if (policyPath === null) {
        options.output(
          "No .agents/policy.json or legacy .ai-policy.json found. Nothing to sync.",
        );
        return 0;
      }

      for (const message of syncPolicyFile(policyPath, {
        importVscode: args.importVscode ?? false,
      })) {
        options.output(message);
      }

      return 0;
    },
  });
}

export async function runAgentsPolicy(argv = process.argv.slice(2), options = {}) {
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
}

export async function runAgentsPolicyImportVscode(options = {}) {
  return runAgentsPolicy(["--import-vscode"], options);
}
