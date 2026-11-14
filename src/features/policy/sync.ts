import fs from 'node:fs';
import path from 'node:path';
import { ToolError } from '../../core/errors.ts';
import { isFile, readTextOrUndefined, writeOrRemove } from '../../core/fs.ts';
import {
  isJsonObject,
  readJson5File,
  toJsonText,
  type JsonObject,
} from '../../core/json.ts';
import {
  agentsFileNames,
  agentsPaths,
  clientPaths,
  formatRelative,
  resolveUserPath,
} from '../../core/paths.ts';
import {
  applyPolicyToClaudeSettings,
  claudeManagedOrder,
  claudeManagedSchema,
} from './claude.ts';
import { buildAiExcludeContent } from './gemini.ts';
import {
  buildSyncRecord,
  findImportLosses,
  compareWithRecord,
  lostFormatting,
  lostNulls,
  readSyncRecord,
} from './overwrites.ts';
import {
  hasContent,
  loadSettings,
  parseAiPolicy,
  policyToJson,
  renderSettings,
  withDefaults,
  type AiPolicy,
} from './schema.ts';
import {
  applyPolicyToVscodeSettings,
  extractApprovalMaps,
  vscodeManagedOrder,
  vscodeManagedSchema,
} from './vscode.ts';

export type PolicyPaths = {
  repoRoot: string;
  policyFile: string;
  aiExclude: string;
  vscodeSettings: string;
  claudeSettings: string;
  syncRecord: string;
};

/**
 * A loaded policy. `config` is the whole `.agents/config.json` when the policy lives in its
 * `policy` section, so sibling sections survive a write; `undefined` for a bare policy file.
 */
type PolicyDocument = { policy: AiPolicy; config: JsonObject | undefined };

const syncCommand = 'agentic-tools policy sync';
const importCommand = 'agentic-tools policy import-vscode';

const loadPolicyDocument = (policyFile: string): PolicyDocument => {
  const raw = readJson5File(policyFile, 'Policy file');
  if (raw !== undefined && !isJsonObject(raw)) {
    throw new ToolError('Policy file is invalid: expected a JSON object.');
  }
  if (
    raw !== undefined &&
    raw['policy'] !== undefined &&
    raw['policy'] !== null
  ) {
    return {
      policy: parseAiPolicy(raw['policy'], 'Policy file', ['policy']),
      config: raw,
    };
  }
  return { policy: parseAiPolicy(raw, 'Policy file'), config: undefined };
};

const writePolicyDocument = (
  policyFile: string,
  document: PolicyDocument,
  policy: AiPolicy,
): void => {
  const policyJson = policyToJson(policy);
  if (document.config === undefined) {
    writeOrRemove(
      policyFile,
      Object.keys(policyJson).length === 0 ? undefined : toJsonText(policyJson),
    );
    return;
  }
  writeOrRemove(
    policyFile,
    toJsonText({ ...document.config, policy: policyJson }),
  );
};

/** True when `configPath` owns a policy section. Unparseable configs count, so their error surfaces. */
const agentsConfigHasPolicy = (configPath: string): boolean => {
  try {
    const raw = readJson5File(configPath, 'Agents config');
    return (
      !isJsonObject(raw) ||
      (raw['policy'] !== undefined && raw['policy'] !== null)
    );
  } catch {
    return true;
  }
};

/** Walk up from `start` to the nearest config with a policy, `.agents/policy.json`, or legacy file. */
export const discoverPolicyPath = (start: string): string | undefined => {
  let current = path.resolve(start);
  for (;;) {
    const agentsConfig = path.join(current, agentsPaths.config);
    if (isFile(agentsConfig) && agentsConfigHasPolicy(agentsConfig)) {
      return fs.realpathSync(agentsConfig);
    }
    for (const candidate of [agentsPaths.policy, agentsPaths.legacyPolicy]) {
      const candidatePath = path.join(current, candidate);
      if (isFile(candidatePath)) {
        return fs.realpathSync(candidatePath);
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
};

export const resolvePolicyPath = (
  rawConfig: string | undefined,
  cwd: string,
  home: string,
): string | undefined => {
  if (rawConfig === undefined) {
    return discoverPolicyPath(cwd);
  }
  const configPath = resolveUserPath(rawConfig, cwd, home);
  if (!isFile(configPath)) {
    throw new ToolError(`Could not find policy file at ${configPath}`);
  }
  return configPath;
};

export const resolvePolicyPaths = (policyFile: string): PolicyPaths => {
  const resolved = path.resolve(policyFile);
  const name = path.basename(resolved);
  const parent = path.dirname(resolved);
  const insideAgentsDir =
    (name === agentsFileNames.config || name === agentsFileNames.policy) &&
    path.basename(parent) === agentsFileNames.root;
  const repoRoot = insideAgentsDir ? path.dirname(parent) : parent;
  return {
    repoRoot,
    policyFile: resolved,
    aiExclude: path.join(repoRoot, clientPaths.geminiAiExclude),
    vscodeSettings: path.join(repoRoot, clientPaths.vscodeSettings),
    claudeSettings: path.join(repoRoot, clientPaths.claudeSettings),
    syncRecord: path.join(repoRoot, agentsPaths.policyLock),
  };
};

const importPolicyFromVscode = (
  policy: AiPolicy,
  vscodeSettingsPath: string,
): AiPolicy => {
  const vscode = loadSettings(
    vscodeSettingsPath,
    vscodeManagedSchema,
    'VS Code settings',
  );
  return parseAiPolicy(
    { ...policyToJson(policy), ...extractApprovalMaps(vscode) },
    'Imported policy',
  );
};

export type PolicyMode = 'sync' | 'check' | 'import-vscode';

/** Regenerate (or, in check mode, compare) every client file derived from the policy. */
export const syncPolicyFile = (
  policyFile: string,
  mode: PolicyMode,
  force = false,
): string[] => {
  const paths = resolvePolicyPaths(policyFile);
  const document = loadPolicyDocument(paths.policyFile);
  const policy =
    mode === 'import-vscode' ?
      importPolicyFromVscode(document.policy, paths.vscodeSettings)
    : document.policy;
  const effective = withDefaults(policy);

  const policyLabel = formatRelative(paths.policyFile, paths.repoRoot);
  const messages: string[] = [];
  if (mode === 'import-vscode') {
    messages.push(`Imported: VS Code approvals into ${policyLabel}`);
    // An imported change can turn a deny into an allow, so each one is named.
    for (const key of ['terminalAutoApprove', 'editAutoApprove'] as const) {
      const before: Record<string, unknown> = document.policy[key] ?? {};
      const after: Record<string, unknown> = policy[key] ?? {};
      for (const entry of new Set([
        ...Object.keys(before),
        ...Object.keys(after),
      ])) {
        if (JSON.stringify(before[entry]) !== JSON.stringify(after[entry])) {
          messages.push(
            `  ${key} "${entry}": ${JSON.stringify(before[entry] ?? null)} -> ${JSON.stringify(after[entry] ?? null)}`,
          );
        }
      }
    }
  }

  const { services } = effective;
  messages.push(
    `Loaded ${services.length} services, ${effective.protectedFiles.length} protected patterns and ` +
      `${effective.excludedFiles.length} excluded patterns`,
  );

  const expectedAiExclude =
    (
      services.includes('gemini') &&
      (effective.protectedFiles.length > 0 ||
        effective.excludedFiles.length > 0)
    ) ?
      buildAiExcludeContent({
        protectedFiles: effective.protectedFiles,
        excludedFiles: effective.excludedFiles,
        policyLabel,
      })
    : undefined;

  const claudeExisting = loadSettings(
    paths.claudeSettings,
    claudeManagedSchema,
    'Claude settings',
  );
  const claudeUpdated = applyPolicyToClaudeSettings(
    claudeExisting,
    services.includes('claude') ? effective.protectedFiles : [],
  );
  const expectedClaude = renderSettings(claudeManagedOrder, claudeUpdated);

  const copilot = services.includes('copilot');
  const vscodeExisting = loadSettings(
    paths.vscodeSettings,
    vscodeManagedSchema,
    'VS Code settings',
  );
  const vscodeUpdated = applyPolicyToVscodeSettings(vscodeExisting, {
    protectedFiles: copilot ? effective.protectedFiles : [],
    terminalAutoApprove: copilot ? effective.terminalAutoApprove : {},
    editAutoApprove: copilot ? effective.editAutoApprove : {},
  });
  const expectedVscode = renderSettings(vscodeManagedOrder, vscodeUpdated);

  const nextRecord = buildSyncRecord({
    claude: claudeUpdated,
    vscode: vscodeUpdated,
    aiexclude: expectedAiExclude,
  });
  const writesNothing =
    expectedAiExclude === undefined &&
    expectedClaude === undefined &&
    expectedVscode === undefined;
  const expectedRecord = writesNothing ? undefined : toJsonText(nextRecord);
  const recordLabel = formatRelative(paths.syncRecord, paths.repoRoot);

  if (mode === 'check') {
    const drifted = (
      [
        [paths.aiExclude, expectedAiExclude],
        [paths.claudeSettings, expectedClaude],
        [paths.vscodeSettings, expectedVscode],
        [paths.syncRecord, expectedRecord],
      ] as const
    )
      .filter(([target, expected]) => readTextOrUndefined(target) !== expected)
      .map(([target]) => formatRelative(target, paths.repoRoot));
    if (drifted.length > 0) {
      throw new ToolError(
        `Managed policy files are out of sync: ${drifted.join(', ')}. Run \`${syncCommand}\` to sync them; ` +
          `it stops before overwriting hand-written settings, and \`--force\` overwrites them. ` +
          `If you intended to keep VS Code approval edits instead, run \`${importCommand}\`.`,
      );
    }
    messages.push('Checked: generated policy files are up to date.', 'Done.');
    return messages;
  }

  // Settings a person wrote by hand are never dropped silently: stop, before any write, unless forced.
  const claudeText = readTextOrUndefined(paths.claudeSettings);
  const vscodeText = readTextOrUndefined(paths.vscodeSettings);
  const aiExcludeText = readTextOrUndefined(paths.aiExclude);
  // Forcing overwrites regardless, so an unreadable record must not block it.
  const lastWritten =
    force ? undefined : readSyncRecord(paths.syncRecord, recordLabel);
  const onDiskFiles = {
    claude: claudeExisting,
    vscode: vscodeExisting,
    aiexclude: aiExcludeText,
  };
  const comparison = compareWithRecord({
    onDisk: buildSyncRecord(onDiskFiles),
    onDiskAll: buildSyncRecord(onDiskFiles, true),
    lastWritten,
    next: nextRecord,
  });
  const lost = [
    ...(mode === 'import-vscode' ?
      [
        ...findImportLosses({
          policyLabel,
          before: document.policy,
          imported: policy,
          lastWritten,
        }),
        ...lostFormatting(policyLabel, readTextOrUndefined(paths.policyFile)),
      ]
    : []),
    ...comparison.losses,
    ...(claudeText === expectedClaude ?
      []
    : [
        ...lostFormatting('.claude/settings.json', claudeText),
        ...lostNulls('.claude/settings.json', claudeExisting),
      ]),
    ...(vscodeText === expectedVscode ?
      []
    : [
        ...lostFormatting('.vscode/settings.json', vscodeText),
        ...lostNulls('.vscode/settings.json', vscodeExisting),
      ]),
  ];
  if (lost.length > 0 && !force) {
    throw new ToolError(
      [
        'Syncing would overwrite edits made since the last sync:',
        ...lost.map((line) => `- ${line}`),
        ...(lastWritten === undefined ?
          [
            `No sync record yet (${recordLabel}): if these came from an earlier policy, rerun with --force to adopt them.`,
          ]
        : []),
        `To keep a setting, add it to ${policyLabel}; comments and formatting cannot be kept. To overwrite all of these, rerun with --force.`,
      ].join('\n'),
    );
  }

  if (mode === 'import-vscode') {
    writePolicyDocument(paths.policyFile, document, policy);
  }
  // Something a person deleted comes back because the policy asks for it; say so, never silently.
  messages.push(...comparison.restored.map((entry) => `Restored: ${entry}`));

  const hadGeminiFile = aiExcludeText !== undefined;
  writeOrRemove(paths.aiExclude, expectedAiExclude);
  if (expectedAiExclude !== undefined) {
    messages.push(`Synced: Gemini (${clientPaths.geminiAiExclude})`);
  } else if (hadGeminiFile) {
    messages.push(`Removed: Gemini (${clientPaths.geminiAiExclude})`);
  }

  const claudeLabel = clientPaths.claudeSettings.split(path.sep).join('/');
  writeOrRemove(paths.claudeSettings, expectedClaude);
  if (services.includes('claude')) {
    messages.push(`Synced: Claude Code (${claudeLabel})`);
  } else if (hasContent(claudeExisting)) {
    messages.push(`Cleaned: Claude Code (${claudeLabel})`);
  }

  const vscodeLabel = clientPaths.vscodeSettings.split(path.sep).join('/');
  writeOrRemove(paths.vscodeSettings, expectedVscode);
  if (copilot) {
    messages.push(`Synced: Copilot local policy (${vscodeLabel})`);
  } else if (hasContent(vscodeExisting)) {
    messages.push(`Cleaned: Copilot local policy (${vscodeLabel})`);
  }

  // Written last, so a sync that fails partway never records output it did not finish writing.
  writeOrRemove(paths.syncRecord, expectedRecord);

  messages.push('Done.');
  return messages;
};

/** Entry point for `agentic-tools policy <sync|check|import-vscode>`. */
export const runPolicyCommand = (options: {
  mode: PolicyMode;
  config: string | undefined;
  cwd: string;
  home: string;
  force?: boolean;
}): string[] => {
  const policyPath = resolvePolicyPath(
    options.config,
    options.cwd,
    options.home,
  );
  if (policyPath === undefined) {
    return [
      `No ${agentsPaths.config} policy, ${agentsPaths.policy}, or legacy ${agentsPaths.legacyPolicy} found. Nothing to sync.`,
    ];
  }
  return syncPolicyFile(policyPath, options.mode, options.force === true);
};
