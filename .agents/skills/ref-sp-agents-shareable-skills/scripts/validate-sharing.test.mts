import { afterEach, describe, expect, test } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const script = path.join(import.meta.dirname, 'validate-sharing.mts');

const created: string[] = [];

afterEach(() => {
  for (const directory of created.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

const tempDir = (): string => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-sharing-'));
  created.push(directory);
  return directory;
};

/** Windows creates a real directory symlink only with Developer Mode or admin rights. */
const canSymlinkDirectories = ((): boolean => {
  const directory = tempDir();
  try {
    fs.symlinkSync(directory, path.join(directory, 'probe'), 'dir');
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
    created.splice(created.indexOf(directory), 1);
  }
})();

const writeSkill = (
  skillsRoot: string,
  name: string,
  requires?: string,
  visibility = 'public',
): void => {
  fs.mkdirSync(path.join(skillsRoot, name), { recursive: true });
  const metadata = [
    '  shareable-skills.owner-prefix: "sp"',
    '  shareable-skills.owner: "swiftpostlabs/agentic-tools"',
    '  shareable-skills.domain: "dev"',
    `  shareable-skills.visibility: "${visibility}"`,
    ...(requires === undefined ?
      []
    : [`  shareable-skills.requires: "${requires}"`]),
  ];
  fs.writeFileSync(
    path.join(skillsRoot, name, 'SKILL.md'),
    [
      '---',
      `name: ${name}`,
      `description: "A test skill. Use when testing."`,
      'license: MIT',
      'metadata:',
      ...metadata,
      '---',
      '',
      `# ${name}`,
      '',
    ].join('\n'),
  );
};

type Report = {
  checked: number;
  findings: { skill: string; severity: string; message: string }[];
};

const validateAll = (skillsRoot: string): Report => {
  const result = spawnSync(
    process.execPath,
    [script, skillsRoot, '--all', '--format', 'json'],
    { encoding: 'utf8' },
  );
  return JSON.parse(result.stdout) as Report;
};

/** A repo whose skill requires one that lives in another repo and is linked in. */
const repoWithLinkedDependency = (
  type: 'dir' | 'junction',
  linkedVisibility = 'public',
): { repo: string; skillsRoot: string } => {
  const source = path.join(tempDir(), 'skills');
  writeSkill(source, 'ref-sp-dev-linked', undefined, linkedVisibility);
  const repo = tempDir();
  const skillsRoot = path.join(repo, '.agents', 'skills');
  writeSkill(skillsRoot, 'ref-sp-dev-local', 'ref-sp-dev-linked');
  fs.symlinkSync(
    path.join(source, 'ref-sp-dev-linked'),
    path.join(skillsRoot, 'ref-sp-dev-linked'),
    type,
  );
  return { repo, skillsRoot };
};

const writeManifest = (repo: string, skills: string | string[]): void => {
  fs.mkdirSync(path.join(repo, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(
    path.join(repo, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'consumer', skills }),
  );
};

const unresolved = (report: Report) =>
  report.findings.filter((finding) =>
    finding.message.includes('does not resolve'),
  );

describe('linked skills', () => {
  test('a hard dependency on a junction-linked skill resolves; only the own skill is validated', () => {
    const report = validateAll(repoWithLinkedDependency('junction').skillsRoot);
    expect(report.findings).toEqual([]);
    expect(report.checked).toBe(1);
  });

  // Windows refuses directory symlinks without Developer Mode or admin, so this runs only where
  // the probe succeeds (Linux, macOS, or such a Windows); the junction test covers Windows.
  (canSymlinkDirectories ? test : test.skip)(
    'a hard dependency on a symlinked skill resolves; only the own skill is validated',
    () => {
      const report = validateAll(repoWithLinkedDependency('dir').skillsRoot);
      expect(report.findings).toEqual([]);
      expect(report.checked).toBe(1);
    },
  );

  test('the plugin manifest check leaves linked skills to their owner', () => {
    const { repo, skillsRoot } = repoWithLinkedDependency('junction');
    writeManifest(repo, ['./.agents/skills/ref-sp-dev-local']);
    expect(validateAll(skillsRoot).findings).toEqual([]);

    const withOrganizationSkill = repoWithLinkedDependency(
      'junction',
      'organization',
    );
    writeManifest(withOrganizationSkill.repo, './.agents/skills');
    expect(
      validateAll(withOrganizationSkill.skillsRoot).findings.filter(
        (finding) => finding.skill === 'plugin-manifest',
      ),
    ).toEqual([]);
  });

  test('a dangling link is skipped, and a dependency on it does not resolve', () => {
    const skillsRoot = path.join(tempDir(), '.agents', 'skills');
    writeSkill(skillsRoot, 'ref-sp-dev-local', 'ref-sp-dev-gone');
    fs.symlinkSync(
      path.join(skillsRoot, '..', 'missing'),
      path.join(skillsRoot, 'ref-sp-dev-gone'),
      'junction',
    );
    const report = validateAll(skillsRoot);
    expect(report.checked).toBe(1);
    expect(unresolved(report)).toHaveLength(1);
  });
});
