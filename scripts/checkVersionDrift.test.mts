import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from '@jest/globals';
import {
  checkRepositoryVersion,
  validateSemver,
} from './checkVersionDrift.mts';

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => fs.rmSync(root, { recursive: true, force: true })),
);

const repo = (
  versions: {
    source?: string;
    packageJson?: string;
    pyproject?: string | null;
  } = {},
): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'version-drift-'));
  roots.push(root);
  fs.writeFileSync(
    path.join(root, 'VERSION'),
    `${versions.source ?? '0.1.0'}\n`,
  );
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'x', version: versions.packageJson ?? '0.1.0' }),
  );
  if (versions.pyproject !== null) {
    const version =
      versions.pyproject === undefined ?
        ''
      : `version = "${versions.pyproject}"\n`;
    fs.writeFileSync(
      path.join(root, 'pyproject.toml'),
      `[project]\nname = "x"\n${version}\n[tool.x]\nversion = "9.9.9"\n`,
    );
  }
  return root;
};

test('passes when every surface agrees, ignoring versions outside [project]', () => {
  expect(checkRepositoryVersion(repo())).toBe('0.1.0');
  expect(checkRepositoryVersion(repo({ pyproject: '0.1.0' }))).toBe('0.1.0');
  expect(checkRepositoryVersion(repo({ pyproject: null }))).toBe('0.1.0');
});

test('reports each drifted file', () => {
  expect(() =>
    checkRepositoryVersion(repo({ packageJson: '0.2.0', pyproject: '0.3.0' })),
  ).toThrow(
    'Version drift detected. Expected 0.1.0 from VERSION, got package.json=0.2.0, pyproject.toml=0.3.0',
  );
});

test('rejects a version that is not semver', () => {
  expect(() => validateSemver('1.0')).toThrow('Invalid semantic version: 1.0');
  expect(validateSemver(' 1.2.3-rc.1+build.5 \n')).toBe('1.2.3-rc.1+build.5');
});
