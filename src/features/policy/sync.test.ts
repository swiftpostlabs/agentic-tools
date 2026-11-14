import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  makeTempDir,
  readJson,
  writeFile,
  writeJson,
} from '../../core/testFixtures.ts';
import { applyPolicyToClaudeSettings } from './claude.ts';
import { parseAiPolicy, policyToJson, withDefaults } from './schema.ts';
import {
  discoverPolicyPath,
  runPolicyCommand,
  syncPolicyFile,
} from './sync.ts';
import { applyPolicyToVscodeSettings } from './vscode.ts';

const setupRepo = (
  policy: unknown,
  options: { unified?: boolean; siblings?: Record<string, unknown> } = {},
) => {
  const root = makeTempDir();
  const unified = options.unified ?? true;
  const policyFile = path.join(
    root,
    '.agents',
    unified ? 'config.json' : 'policy.json',
  );
  writeJson(policyFile, unified ? { ...options.siblings, policy } : policy);
  return { root, policyFile };
};

describe('policy schema', () => {
  test('defaults to every service without serializing the default', () => {
    const policy = parseAiPolicy({ protectedFiles: ['.env'] }, 'Policy file');
    expect(withDefaults(policy).services).toEqual([
      'gemini',
      'claude',
      'copilot',
    ]);
    expect(policyToJson(policy)).toEqual({ protectedFiles: ['.env'] });
  });

  test('normalizes service aliases and removes duplicates', () => {
    const policy = parseAiPolicy(
      { services: ['Claude-Code', 'claude', 'github-copilot'] },
      'Policy file',
    );
    expect(policy.services).toEqual(['claude', 'copilot']);
  });

  test('rejects an unknown service with the supported list', () => {
    expect(() =>
      parseAiPolicy({ services: ['cursor'] }, 'Policy file'),
    ).toThrow(
      "Policy file is invalid at services: Unsupported policy service 'cursor'. Supported values: claude, claude-code, copilot, gemini, github-copilot.",
    );
  });

  test('rejects non-string protected files and unknown keys', () => {
    expect(() => parseAiPolicy({ protectedFiles: [1] }, 'Policy file')).toThrow(
      "Policy 'protectedFiles' must contain only strings.",
    );
    expect(() => parseAiPolicy({ protected: [] }, 'Policy file')).toThrow(
      'Policy file is invalid at protected: Extra inputs are not permitted',
    );
  });
});

describe('client settings transforms', () => {
  test('Claude: replaces managed Read rules and keeps everything else', () => {
    const updated = applyPolicyToClaudeSettings(
      {
        managed: {
          permissions: { allow: ['Bash(ls)'], deny: ['Read(old)', 'Bash(rm)'] },
        },
        extras: { model: 'x' },
      },
      ['.env'],
    );
    expect(updated.managed['permissions']).toEqual({
      deny: ['Bash(rm)', 'Read(.env)'],
      allow: ['Bash(ls)'],
    });
    expect(updated.extras).toEqual({ model: 'x' });
  });

  test('Claude: drops an emptied permissions block', () => {
    const updated = applyPolicyToClaudeSettings(
      { managed: { permissions: { deny: ['Read(old)'] } }, extras: {} },
      [],
    );
    expect(updated.managed['permissions']).toBeNull();
  });

  test('VS Code: replaces managed associations and approvals', () => {
    const updated = applyPolicyToVscodeSettings(
      {
        managed: {
          'files.associations': {
            '*.x': 'xml',
            stale: 'copilot-restricted-file',
          },
          'github.copilot.enable': { markdown: true },
        },
        extras: {},
      },
      {
        protectedFiles: ['.env'],
        terminalAutoApprove: { ls: true },
        editAutoApprove: {},
      },
    );
    expect(updated.managed).toEqual({
      'files.associations': { '*.x': 'xml', '.env': 'copilot-restricted-file' },
      'github.copilot.enable': {
        markdown: true,
        'copilot-restricted-file': false,
      },
      'chat.tools.terminal.autoApprove': { ls: true },
      'chat.tools.edits.autoApprove': null,
    });
  });
});

describe('syncPolicyFile', () => {
  test('writes every client file from a unified config', () => {
    const { root, policyFile } = setupRepo({
      protectedFiles: ['.env'],
      excludedFiles: ['dist/'],
    });
    const messages = syncPolicyFile(policyFile, 'sync');
    expect(messages).toEqual([
      'Loaded 3 services, 1 protected patterns and 1 excluded patterns',
      'Synced: Gemini (.aiexclude)',
      'Synced: Claude Code (.claude/settings.json)',
      'Synced: Copilot local policy (.vscode/settings.json)',
      'Done.',
    ]);
    expect(fs.readFileSync(path.join(root, '.aiexclude'), 'utf8')).toContain(
      '# Generated from .agents/config.json\n',
    );
    expect(readJson(path.join(root, '.claude', 'settings.json'))).toEqual({
      permissions: { deny: ['Read(.env)'] },
    });
  });

  test('respects the selected services and cleans disabled ones without --force', () => {
    const { root, policyFile } = setupRepo({
      services: ['claude', 'copilot', 'gemini'],
      protectedFiles: ['.env'],
    });
    writeJson(path.join(root, '.vscode', 'settings.json'), {
      'editor.tabSize': 2,
    });
    syncPolicyFile(policyFile, 'sync');
    writeJson(policyFile, {
      policy: { services: ['claude'], protectedFiles: ['.env'] },
    });
    const messages = syncPolicyFile(policyFile, 'sync');
    expect(messages).toContain(
      'Cleaned: Copilot local policy (.vscode/settings.json)',
    );
    expect(fs.existsSync(path.join(root, '.aiexclude'))).toBe(false);
    expect(readJson(path.join(root, '.vscode', 'settings.json'))).toEqual({
      'editor.tabSize': 2,
    });
  });

  test('writes managed keys before untouched ones and drops top-level nulls', () => {
    const { root, policyFile } = setupRepo({
      services: ['copilot'],
      protectedFiles: ['.env'],
    });
    writeFile(
      path.join(root, '.vscode', 'settings.json'),
      '// JSON5\n{"editor.x": 1, "z": null, "files.associations": {"a": "b"},}\n',
    );
    expect(() => syncPolicyFile(policyFile, 'sync')).toThrow(
      '.vscode/settings.json: comments or trailing commas would be removed',
    );
    syncPolicyFile(policyFile, 'sync', true);
    expect(
      Object.keys(
        readJson(path.join(root, '.vscode', 'settings.json')) as object,
      ),
    ).toEqual(['files.associations', 'github.copilot.enable', 'editor.x']);
  });

  test('stops before dropping hand-written rules and approvals, unless forced', () => {
    const { root, policyFile } = setupRepo({
      services: ['claude', 'copilot'],
      protectedFiles: ['.env'],
      terminalAutoApprove: { rm: false },
    });
    writeJson(path.join(root, '.claude', 'settings.json'), {
      permissions: { deny: ['Read(./mine.txt)', 'Bash(rm -rf:*)'] },
    });
    writeJson(path.join(root, '.vscode', 'settings.json'), {
      'chat.tools.terminal.autoApprove': { rm: true, make: true },
    });
    const claudeBefore = fs.readFileSync(
      path.join(root, '.claude', 'settings.json'),
      'utf8',
    );
    expect(() => syncPolicyFile(policyFile, 'sync')).toThrow(
      [
        'Syncing would overwrite settings written by hand:',
        '- .claude/settings.json: deny rule Read(./mine.txt) would be removed',
        '- .vscode/settings.json: chat.tools.terminal.autoApprove "make" would be removed',
        '- .vscode/settings.json: chat.tools.terminal.autoApprove "rm" would change from true to false',
        'No sync record yet (.agents/policy.lock.json): if these came from an earlier policy, rerun with --force to adopt them.',
        'To keep them, add them to .agents/config.json; to overwrite them, rerun with --force.',
      ].join('\n'),
    );
    expect(
      fs.readFileSync(path.join(root, '.claude', 'settings.json'), 'utf8'),
    ).toBe(claudeBefore);
    syncPolicyFile(policyFile, 'sync', true);
    expect(readJson(path.join(root, '.claude', 'settings.json'))).toEqual({
      permissions: { deny: ['Bash(rm -rf:*)', 'Read(.env)'] },
    });
  });

  test('import-vscode names each approval it changes', () => {
    const { root, policyFile } = setupRepo({
      services: ['copilot'],
      terminalAutoApprove: { rm: false },
    });
    writeJson(path.join(root, '.vscode', 'settings.json'), {
      'chat.tools.terminal.autoApprove': { rm: true },
    });
    expect(syncPolicyFile(policyFile, 'import-vscode')).toContain(
      '  terminalAutoApprove "rm": false -> true',
    );
  });

  test('check mode reports drift without writing', () => {
    const { root, policyFile } = setupRepo({ protectedFiles: ['.env'] });
    expect(() => syncPolicyFile(policyFile, 'check')).toThrow(
      'Managed policy files are out of sync: .aiexclude, .claude/settings.json, .vscode/settings.json, .agents/policy.lock.json.',
    );
    expect(fs.existsSync(path.join(root, '.aiexclude'))).toBe(false);
  });

  test('check mode passes once the outputs are current', () => {
    const { policyFile } = setupRepo({ protectedFiles: ['.env'] });
    syncPolicyFile(policyFile, 'sync');
    expect(syncPolicyFile(policyFile, 'check').slice(-2)).toEqual([
      'Checked: generated policy files are up to date.',
      'Done.',
    ]);
  });

  test('import-vscode replaces the approval maps and keeps sibling sections in place', () => {
    const { root, policyFile } = setupRepo(
      { protectedFiles: ['.env'], terminalAutoApprove: { old: true } },
      { siblings: { skills: { sources: [] } } },
    );
    writeJson(path.join(root, '.vscode', 'settings.json'), {
      'chat.tools.terminal.autoApprove': { 'git status': true },
    });
    syncPolicyFile(policyFile, 'import-vscode');
    const config = readJson(policyFile) as Record<string, unknown>;
    expect(Object.keys(config)).toEqual(['skills', 'policy']);
    expect(config['policy']).toEqual({
      protectedFiles: ['.env'],
      terminalAutoApprove: { 'git status': true },
      editAutoApprove: {},
    });
  });

  test('import-vscode clears approval maps that VS Code no longer has', () => {
    const { policyFile } = setupRepo(
      { editAutoApprove: { '**/*.md': true } },
      { unified: false },
    );
    syncPolicyFile(policyFile, 'import-vscode');
    expect(readJson(policyFile)).toEqual({
      editAutoApprove: {},
      terminalAutoApprove: {},
    });
  });
});

describe('policy discovery', () => {
  test('prefers the unified config over a policy file', () => {
    const { root } = setupRepo({ protectedFiles: [] });
    writeJson(path.join(root, '.agents', 'policy.json'), {});
    const nested = path.join(root, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });
    expect(discoverPolicyPath(nested)).toBe(
      path.join(root, '.agents', 'config.json'),
    );
  });

  test('skips a config without a policy section', () => {
    const root = makeTempDir();
    writeJson(path.join(root, '.agents', 'config.json'), { skills: {} });
    writeJson(path.join(root, '.ai-policy.json'), {});
    expect(discoverPolicyPath(root)).toBe(path.join(root, '.ai-policy.json'));
  });

  test('reports when there is nothing to sync', () => {
    const root = makeTempDir();
    expect(
      runPolicyCommand({
        mode: 'sync',
        config: undefined,
        cwd: root,
        home: root,
      }),
    ).toEqual([
      `No ${path.join('.agents', 'config.json')} policy, ${path.join('.agents', 'policy.json')}, or legacy .ai-policy.json found. Nothing to sync.`,
    ]);
  });
});

describe('hand-written settings', () => {
  const claudeFile = (root: string) =>
    path.join(root, '.claude', 'settings.json');
  const vscodeFile = (root: string) =>
    path.join(root, '.vscode', 'settings.json');

  /** A repo synced once from `policy`, so the sync record exists. */
  const syncedRepo = (policy: Record<string, unknown>) => {
    const repo = setupRepo(policy);
    syncPolicyFile(repo.policyFile, 'sync');
    return repo;
  };

  const expectStopsThenForces = (
    policyFile: string,
    target: string,
    lostLine: string,
  ) => {
    const read = () =>
      fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : undefined;
    const before = read();
    expect(() => syncPolicyFile(policyFile, 'sync')).toThrow(lostLine);
    expect(read()).toBe(before);
    syncPolicyFile(policyFile, 'sync', true);
    expect(read()).not.toBe(before);
    expect(() => syncPolicyFile(policyFile, 'sync')).not.toThrow();
  };

  test('removing a pattern or an approval from the policy syncs without --force', () => {
    const { root, policyFile } = syncedRepo({
      protectedFiles: ['.env', 'secrets/'],
      terminalAutoApprove: { ls: true, make: true },
    });
    writeJson(policyFile, {
      policy: { protectedFiles: ['.env'], terminalAutoApprove: { ls: true } },
    });
    syncPolicyFile(policyFile, 'sync');
    expect(readJson(claudeFile(root))).toEqual({
      permissions: { deny: ['Read(.env)'] },
    });
    expect(
      (readJson(vscodeFile(root)) as Record<string, unknown>)[
        'chat.tools.terminal.autoApprove'
      ],
    ).toEqual({ ls: true });
    expect(syncPolicyFile(policyFile, 'check').at(-1)).toBe('Done.');
  });

  test('a first sync next to unrelated settings needs no --force', () => {
    const { root, policyFile } = setupRepo({ protectedFiles: ['.env'] });
    writeJson(claudeFile(root), {
      model: 'opus',
      permissions: { allow: ['Bash(ls)'] },
    });
    syncPolicyFile(policyFile, 'sync');
    expect(readJson(claudeFile(root))).toEqual({
      permissions: { deny: ['Read(.env)'], allow: ['Bash(ls)'] },
      model: 'opus',
    });
  });

  test('a hand-added Read deny rule stops sync until forced', () => {
    const { root, policyFile } = syncedRepo({
      services: ['claude'],
      protectedFiles: ['.env'],
    });
    writeJson(claudeFile(root), {
      permissions: { deny: ['Read(.env)', 'Read(./mine)'] },
    });
    expectStopsThenForces(
      policyFile,
      claudeFile(root),
      '- .claude/settings.json: deny rule Read(./mine) would be removed',
    );
  });

  test('a hand-changed approval stops sync until forced', () => {
    const { root, policyFile } = syncedRepo({
      services: ['copilot'],
      terminalAutoApprove: { rm: false },
    });
    writeJson(vscodeFile(root), {
      'chat.tools.terminal.autoApprove': { rm: true },
    });
    expectStopsThenForces(
      policyFile,
      vscodeFile(root),
      '- .vscode/settings.json: chat.tools.terminal.autoApprove "rm" would change from true to false',
    );
  });

  test('a hand-added restricted association stops sync until forced', () => {
    const { root, policyFile } = syncedRepo({ services: ['copilot'] });
    writeJson(vscodeFile(root), {
      'files.associations': { 'secrets/**': 'copilot-restricted-file' },
    });
    expectStopsThenForces(
      policyFile,
      vscodeFile(root),
      '- .vscode/settings.json: files.associations "secrets/**" would be removed',
    );
  });

  test('a comment or a hand-written null stops sync until forced', () => {
    const { root, policyFile } = syncedRepo({
      services: ['claude'],
      protectedFiles: ['.env'],
    });
    writeFile(
      claudeFile(root),
      '{\n  // keep\n  "permissions": {"deny": ["Read(.env)"]},\n  "model": null\n}\n',
    );
    expect(() => syncPolicyFile(policyFile, 'sync')).toThrow(
      [
        '- .claude/settings.json: comments or trailing commas would be removed',
        '- .claude/settings.json: "model": null would be removed',
      ].join('\n'),
    );
  });

  test('a byte-order mark alone is not reported as comments', () => {
    const { root, policyFile } = syncedRepo({
      services: ['claude'],
      protectedFiles: ['.env'],
    });
    const synced = fs.readFileSync(claudeFile(root), 'utf8');
    writeFile(claudeFile(root), `${String.fromCharCode(0xfeff)}${synced}`);
    expect(() => syncPolicyFile(policyFile, 'sync')).not.toThrow();
  });

  test('a hand-edited .aiexclude is neither replaced nor deleted until forced', () => {
    const { root, policyFile } = syncedRepo({
      services: ['gemini'],
      protectedFiles: ['.env'],
    });
    const aiExclude = path.join(root, '.aiexclude');
    fs.appendFileSync(aiExclude, 'my-dir/\n');
    expectStopsThenForces(
      policyFile,
      aiExclude,
      '- .aiexclude was edited by hand and would be replaced',
    );
    fs.appendFileSync(aiExclude, 'my-dir/\n');
    writeJson(policyFile, { policy: { services: ['claude'] } });
    expect(() => syncPolicyFile(policyFile, 'sync')).toThrow(
      '- .aiexclude was edited by hand and would be removed',
    );
    expect(fs.existsSync(aiExclude)).toBe(true);
  });

  test('a hand-written .aiexclude in a repo without Gemini stops on the first sync', () => {
    const { root, policyFile } = setupRepo({ services: ['claude'] });
    writeFile(path.join(root, '.aiexclude'), 'my-secret-dir/\n');
    expect(() => syncPolicyFile(policyFile, 'sync')).toThrow(
      '- .aiexclude was edited by hand and would be removed',
    );
    expect(fs.existsSync(path.join(root, '.aiexclude'))).toBe(true);
  });

  test('import-vscode that stops leaves the policy file untouched', () => {
    const { root, policyFile } = syncedRepo({
      services: ['claude', 'copilot'],
      terminalAutoApprove: { rm: false },
    });
    writeJson(claudeFile(root), { permissions: { deny: ['Read(./mine)'] } });
    writeJson(vscodeFile(root), {
      'chat.tools.terminal.autoApprove': { rm: true },
    });
    const policyBefore = fs.readFileSync(policyFile, 'utf8');
    expect(() => syncPolicyFile(policyFile, 'import-vscode')).toThrow(
      'deny rule Read(./mine) would be removed',
    );
    expect(fs.readFileSync(policyFile, 'utf8')).toBe(policyBefore);
  });

  test('a sync record of another format version is refused with a fix', () => {
    const { root, policyFile } = syncedRepo({ protectedFiles: ['.env'] });
    writeJson(path.join(root, '.agents', 'policy.lock.json'), { version: 2 });
    expect(() => syncPolicyFile(policyFile, 'sync')).toThrow(
      'has format version 2; this tool reads version 1.',
    );
  });
});
