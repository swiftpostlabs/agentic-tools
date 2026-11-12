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
): void => {
  fs.mkdirSync(path.join(skillsRoot, name), { recursive: true });
  const metadata = [
    '  shareable-skills.owner-prefix: "sp"',
    '  shareable-skills.owner: "swiftpostlabs/agentic-tools"',
    '  shareable-skills.domain: "dev"',
    '  shareable-skills.visibility: "public"',
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
): { skillsRoot: string } => {
  const source = path.join(tempDir(), 'skills');
  writeSkill(source, 'ref-sp-dev-linked');
  const skillsRoot = path.join(tempDir(), '.agents', 'skills');
  writeSkill(skillsRoot, 'ref-sp-dev-local', 'ref-sp-dev-linked');
  fs.symlinkSync(
    path.join(source, 'ref-sp-dev-linked'),
    path.join(skillsRoot, 'ref-sp-dev-linked'),
    type,
  );
  return { skillsRoot };
};

const unresolved = (report: Report) =>
  report.findings.filter((finding) =>
    finding.message.includes('does not resolve'),
  );

describe('linked skills', () => {
  test('a hard dependency on a junction-linked skill resolves, and the linked skill is checked', () => {
    const report = validateAll(repoWithLinkedDependency('junction').skillsRoot);
    expect(unresolved(report)).toEqual([]);
    expect(report.checked).toBe(2);
  });

  // Skipped where the OS refuses directory symlinks (Windows without Developer Mode or admin);
  // Linux and macOS always run it, and the junction test covers Windows.
  (canSymlinkDirectories ? test : test.skip)(
    'a hard dependency on a symlinked skill resolves, and the linked skill is checked',
    () => {
      const report = validateAll(repoWithLinkedDependency('dir').skillsRoot);
      expect(unresolved(report)).toEqual([]);
      expect(report.checked).toBe(2);
    },
  );

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
