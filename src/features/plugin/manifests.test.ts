import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  makeTempDir,
  writeFile,
  writeJson,
  writeSkill,
} from '../../core/testFixtures.ts';
import {
  buildManifests,
  collectPublishableSkills,
  findDriftedManifests,
  readPluginConfig,
  writeManifests,
} from './manifests.ts';

const pluginRepo = (plugin: Record<string, unknown> = {}) => {
  const root = makeTempDir();
  writeFile(path.join(root, 'VERSION'), '1.2.3\n');
  writeJson(path.join(root, '.agents', 'config.json'), {
    plugin: {
      name: 'demo',
      displayName: 'Demo',
      description: 'Demo skills.',
      marketplace: { name: 'demo-market', owner: { name: 'Owner' } },
      keywords: ['skills'],
      ...plugin,
    },
  });
  const skills = path.join(root, '.agents', 'skills');
  writeSkill(skills, 'ref-public', { visibility: 'public' });
  writeSkill(skills, 'ref-org', { visibility: 'organization' });
  writeSkill(skills, 'ref-local', { visibility: 'repo-local' });
  return root;
};

describe('plugin manifests', () => {
  test('enumerate only skills whose visibility is published', () => {
    const root = pluginRepo();
    const plugin = JSON.parse(buildManifests(root).plugin);
    expect(plugin).toEqual({
      name: 'demo',
      displayName: 'Demo',
      version: '1.2.3',
      description: 'Demo skills.',
      keywords: ['skills'],
      skills: ['./.agents/skills/ref-public'],
    });
  });

  test('honour a configured publish visibility', () => {
    const root = pluginRepo({ publishVisibility: ['public', 'organization'] });
    expect(
      collectPublishableSkills(root, readPluginConfig(root)).map(
        (skill) => skill.name,
      ),
    ).toEqual(['ref-org', 'ref-public']);
  });

  test('reject a skill without visibility', () => {
    const root = pluginRepo();
    writeSkill(path.join(root, '.agents', 'skills'), 'ref-bare');
    expect(() => buildManifests(root)).toThrow(
      'ref-bare: missing shareable-skills.visibility',
    );
  });

  test('keep the version out of the marketplace entry so it cannot mask plugin.json', () => {
    const marketplace = JSON.parse(buildManifests(pluginRepo()).marketplace);
    expect(marketplace.plugins[0]).toEqual({
      name: 'demo',
      source: './',
      description: 'Demo skills.',
      keywords: ['skills'],
    });
    expect(marketplace.metadata).toEqual({
      description: 'Demo skills.',
      version: '1.2.3',
    });
  });

  test('drift is reported when manifests are absent or a skill is added', () => {
    const root = pluginRepo();
    expect(findDriftedManifests(root, buildManifests(root))).toEqual([
      '.claude-plugin/plugin.json',
      '.claude-plugin/marketplace.json',
    ]);
    writeManifests(root, buildManifests(root));
    expect(findDriftedManifests(root, buildManifests(root))).toEqual([]);
    writeSkill(path.join(root, '.agents', 'skills'), 'ref-new', {
      visibility: 'public',
    });
    expect(findDriftedManifests(root, buildManifests(root))).toEqual([
      '.claude-plugin/plugin.json',
    ]);
  });

  test('a missing plugin section is an error', () => {
    const root = makeTempDir();
    writeJson(path.join(root, '.agents', 'config.json'), {});
    expect(() => readPluginConfig(root)).toThrow(
      "is missing the 'plugin' section",
    );
  });
});
