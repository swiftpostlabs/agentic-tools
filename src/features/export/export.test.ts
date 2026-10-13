import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { createCapturedOutput } from '../../core/output.ts';
import {
  makeTempDir,
  writeFile,
  writeJson,
  writeSkill,
} from '../../core/testFixtures.ts';
import { runExportBuild, type ExportBuildOptions } from './build.ts';
import {
  injectionsFromConfig,
  loadConfigFile,
  presets,
  resolveSelection,
} from './config.ts';
import {
  demoteHeadings,
  discoverSkills,
  flattenSkill,
  readCanonicalBlock,
  stripBody,
} from './discovery.ts';
import {
  geminiGemLimits,
  renderBundle,
  renderBundleMap,
  renderInstructions,
  renderReadme,
} from './geminiGem.ts';
import {
  emptySelection,
  skillPrefix,
  skillWordCount,
  type Bundle,
  type SkillDocument,
} from './models.ts';
import {
  buildPlan,
  bundleByDomain,
  enforceLimits,
  selectSkills,
} from './planning.ts';

const skill = (
  name: string,
  overrides: Partial<SkillDocument> = {},
): SkillDocument => ({
  name,
  domain: 'dev',
  visibility: 'public',
  description: `Does ${name}. Use when: testing ${name}.`,
  body: 'word '.repeat(10).trim(),
  ...overrides,
});

describe('discovery', () => {
  test('strips frontmatter and load directives, and rewrites inline ones', () => {
    const text = [
      '---',
      'name: x',
      '---',
      '# Title',
      '- Load `./references/checklist.md` before reviewing.',
      'For details, read `./references/api-tokens.md` and `.agents/skills/ref-sp-dev-git-commits/SKILL.md`.',
    ].join('\n');
    expect(stripBody(text)).toBe(
      '# Title\nFor details, see the "Api tokens" section below and `ref-sp-dev-git-commits`.',
    );
  });

  test('demotes headings and caps them at six levels', () => {
    expect(demoteHeadings('# A\n###### B\ntext')).toBe('## A\n###### B\ntext');
  });

  test('flattens a skill with its references, and skips folders without SKILL.md', () => {
    const root = makeTempDir();
    writeSkill(root, 'ref-sp-dev-x', {
      domain: 'dev',
      visibility: 'public',
      body: '# X\n\nIntro.',
    });
    writeFile(
      path.join(root, 'ref-sp-dev-x', 'references', 'deep-dive.md'),
      '# Deep\n\nMore.',
    );
    fs.mkdirSync(path.join(root, 'not-a-skill'));
    const documents = discoverSkills(root);
    expect(documents.map((document) => document.name)).toEqual([
      'ref-sp-dev-x',
    ]);
    expect(documents[0]?.body).toBe(
      '# X\n\nIntro.\n\n## Deep dive\n\n## Deep\n\nMore.',
    );
    expect(flattenSkill(path.join(root, 'not-a-skill'))).toBeUndefined();
    expect(discoverSkills(path.join(root, 'missing'))).toEqual([]);
  });

  test('prefix and word count derive from the document', () => {
    expect(skillPrefix(skill('tool-sp-x'))).toBe('tool-');
    expect(skillWordCount(skill('ref-x'))).toBe(10);
  });

  test('extracts a canonical block exactly, and only under a Canonical heading', () => {
    const root = makeTempDir();
    writeSkill(root, 'ref-persona', {
      body: '## Canonical persona text\n\nIntro.\n\n```md\nBe direct.\n\nNo padding.\n```\n\nAfter.',
    });
    writeSkill(root, 'ref-other', {
      body: '## Example\n\n```md\nnot canonical\n```',
    });
    expect(readCanonicalBlock(path.join(root, 'ref-persona'))).toBe(
      'Be direct.\n\nNo padding.',
    );
    expect(readCanonicalBlock(path.join(root, 'ref-other'))).toBeUndefined();
    expect(readCanonicalBlock(path.join(root, 'missing'))).toBeUndefined();
  });
});

describe('selection config', () => {
  test('presets name no concrete skills, and knowledge drops the meta domain', () => {
    for (const preset of Object.values(presets)) {
      expect(preset.includedSkills).toEqual([]);
    }
    expect(presets.knowledge.excludedDomains).toEqual(['agents']);
  });

  test('config overrides the preset and flags override the config', () => {
    const selection = resolveSelection({
      preset: 'knowledge',
      config: {
        select: { domains: ['web'], excludeSkills: { 'ref-a': 'too long' } },
      },
      domains: ['js'],
      excludedSkills: ['ref-b'],
    });
    expect(selection.domains).toEqual(['js']);
    expect(selection.excludedSkills).toEqual({
      'ref-a': 'too long',
      'ref-b': 'excluded on the command line',
    });
  });

  test('exclusions must carry reasons, and select must be an object', () => {
    expect(() =>
      resolveSelection({
        preset: 'knowledge',
        config: { select: { excludeSkills: ['x'] } },
        domains: [],
        excludedSkills: [],
      }),
    ).toThrow('an exclusion without a recorded reason becomes folklore');
    expect(() =>
      resolveSelection({
        preset: 'knowledge',
        config: { select: [] },
        domains: [],
        excludedSkills: [],
      }),
    ).toThrow("'select' must be an object");
  });

  test('an unknown preset lists the available ones', () => {
    expect(() =>
      resolveSelection({
        preset: 'nope',
        config: undefined,
        domains: [],
        excludedSkills: [],
      }),
    ).toThrow("unknown preset 'nope'. Available: everything, knowledge");
  });

  test('config files must exist, parse, and hold an object', () => {
    const root = makeTempDir();
    expect(() => loadConfigFile(path.join(root, 'missing.json'))).toThrow(
      'config file not found',
    );
    expect(() =>
      loadConfigFile(writeFile(path.join(root, 'bad.json'), '{')),
    ).toThrow('config file is not valid JSON');
    expect(() =>
      loadConfigFile(writeFile(path.join(root, 'list.json'), '[]')),
    ).toThrow('must contain a JSON object');
  });

  test('inject maps placeholders to skills and rejects other shapes', () => {
    expect(injectionsFromConfig({ inject: { PERSONA: 'ref-p' } })).toEqual({
      PERSONA: 'ref-p',
    });
    expect(injectionsFromConfig(undefined)).toEqual({});
    expect(() => injectionsFromConfig({ inject: [] })).toThrow(
      "'inject' must be an object",
    );
    expect(() => injectionsFromConfig({ inject: { PERSONA: 1 } })).toThrow(
      "'inject.PERSONA' must be a skill name",
    );
  });
});

describe('planning', () => {
  test('selection records why each skill was dropped, and named skills override filters', () => {
    const skills = [
      skill('ref-a'),
      skill('ref-b', { visibility: 'repo-local' }),
      skill('tool-c'),
      skill('ref-d', { domain: 'agents' }),
    ];
    const { kept, dropped } = selectSkills(skills, {
      ...presets.knowledge,
      excludedSkills: { 'ref-a': 'chosen' },
    });
    expect(kept).toEqual([]);
    expect(dropped).toEqual({
      'ref-a': 'chosen',
      'ref-b': 'visibility is repo-local',
      'tool-c': 'prefix tool- is not exported',
      'ref-d': 'domain agents is excluded',
    });
    expect(
      selectSkills(skills, {
        ...presets.knowledge,
        includedSkills: ['tool-c'],
      }).kept.map((s) => s.name),
    ).toEqual(['tool-c']);
  });

  test('bundles group by domain, largest first', () => {
    const bundles = bundleByDomain([
      skill('ref-a', { domain: 'web' }),
      skill('ref-b', { domain: 'js', body: 'w '.repeat(50) }),
      skill('ref-c', { domain: 'web' }),
    ]);
    expect(
      bundles.map((bundle) => [bundle.name, bundle.skills.length]),
    ).toEqual([
      ['js', 1],
      ['web', 2],
    ]);
  });

  const limits = {
    maxFiles: 2,
    maxFileBytes: 1_000_000,
    softWordsPerBundle: 1_000,
  };
  const bundle = (name: string, words: number): Bundle => ({
    name,
    skills: [skill(`ref-${name}`, { body: 'w '.repeat(words).trim() })],
  });

  test('merges the smallest bundles first, or fails in strict mode', () => {
    const { bundles, notices } = enforceLimits(
      [bundle('big', 100), bundle('small', 1), bundle('mid', 10)],
      limits,
    );
    expect(bundles.map((entry) => entry.name)).toEqual(['big', 'small-mid']);
    expect(notices[0]).toContain(
      "merged 'small' (1 words) and 'mid' (10 words) into 'small-mid'",
    );
    expect(() =>
      enforceLimits(
        [bundle('a', 1), bundle('b', 1), bundle('c', 1)],
        limits,
        true,
      ),
    ).toThrow('3 bundles exceed the 2-file limit');
  });

  test('splits oversized bundles on whole skills, never a single skill', () => {
    const tight = { ...limits, maxFileBytes: 30 };
    const twoSkills: Bundle = {
      name: 'dev',
      skills: [
        skill('ref-a', { body: 'x'.repeat(20) }),
        skill('ref-b', { body: 'y'.repeat(20) }),
      ],
    };
    expect(
      enforceLimits([twoSkills], tight).bundles.map((entry) => entry.name),
    ).toEqual(['dev-1', 'dev-2']);
    expect(
      enforceLimits([bundle('solo', 100)], { ...tight, maxFileBytes: 5 })
        .bundles,
    ).toHaveLength(1);
  });

  test('warns above the soft word guideline without splitting', () => {
    const { bundles, notices } = enforceLimits([bundle('huge', 2_000)], limits);
    expect(bundles).toHaveLength(1);
    expect(notices[0]).toContain('above the 1000-word guideline');
  });
});

describe('gemini gem rendering', () => {
  test('limits match the documented ceilings', () => {
    expect(geminiGemLimits).toEqual({
      maxFiles: 10,
      maxFileBytes: 104_857_600,
      softWordsPerBundle: 40_000,
    });
  });

  test('bundles keep each skill identifiable', () => {
    const rendered = renderBundle({
      name: 'dev',
      skills: [skill('ref-a'), skill('ref-b', { description: '' })],
    });
    expect(rendered).toContain(
      '# dev knowledge\n\nCovers 2 topics: ref-a, ref-b.\n',
    );
    expect(rendered).toContain(
      '# ref-a\n\n_When this applies: Does ref-a. Use when: testing ref-a._',
    );
    expect(rendered).toContain('---\n\n# ref-b\n\nword');
  });

  test('the bundle map prefers the Use when clause and truncates long triggers', () => {
    const long = `Use when: ${'word '.repeat(100)}`;
    const plan = {
      bundles: [
        {
          name: 'js',
          skills: [
            skill('ref-sp-js-react-native'),
            skill('ref-sp-js-long', { description: long }),
          ],
        },
      ],
      excluded: {},
      notices: [],
    };
    const map = renderBundleMap(plan);
    expect(map).toContain('- *react native* — testing ref-sp-js-react-native.');
    expect(map.split('\n').at(-1)?.endsWith('…')).toBe(true);
  });

  test('instructions fill placeholders verbatim, or append routing when the map has no placeholder', () => {
    const plan = {
      bundles: [{ name: 'js', skills: [skill('ref-sp-js-x')] }],
      excluded: {},
      notices: [],
    };
    expect(
      renderInstructions(plan, '{{PERSONA}}\n\n{{BUNDLE_MAP}}', {
        PERSONA: 'Be {{literal}}.',
      }),
    ).toBe('Be {{literal}}.\n\n**`js.md`**\n\n- *x* — testing ref-sp-js-x.');
    expect(renderInstructions(plan, 'Intro.\n')).toBe(
      'Intro.\n\n## Knowledge files\n\n**`js.md`**\n\n- *x* — testing ref-sp-js-x.\n',
    );
  });

  test('the README reports notices and exclusions', () => {
    const readme = renderReadme(
      {
        bundles: [],
        excluded: { 'ref-z': 'visibility is repo-local' },
        notices: ['merged x'],
      },
      'out',
    );
    expect(readme).toContain('## Notices\n\n- merged x\n');
    expect(readme).toContain('| `ref-z` | visibility is repo-local |');
  });
});

describe('export build command', () => {
  const options = (
    cwd: string,
    overrides: Partial<ExportBuildOptions> = {},
  ): ExportBuildOptions => ({
    cwd,
    output: createCapturedOutput(),
    target: 'gemini-gem',
    preset: 'knowledge',
    config: undefined,
    domains: undefined,
    exclude: [],
    skillsRoot: '.agents/skills',
    out: 'out',
    instructions: undefined,
    dryRun: false,
    strict: false,
    ...overrides,
  });

  test('writes knowledge files, instructions, and a README', () => {
    const root = makeTempDir();
    writeSkill(path.join(root, '.agents', 'skills'), 'ref-sp-dev-x', {
      domain: 'dev',
      visibility: 'public',
    });
    writeSkill(path.join(root, '.agents', 'skills'), 'ref-sp-agents-p', {
      domain: 'agents',
      visibility: 'public',
      body: '## Canonical persona text\n\n```md\nBe direct.\n```',
    });
    writeJson(path.join(root, 'export.json'), {
      inject: { PERSONA: 'ref-sp-agents-p' },
    });
    writeFile(
      path.join(root, 'template.md'),
      '{{PERSONA}}\n\n{{BUNDLE_MAP}}\n',
    );
    const run = options(root, {
      config: 'export.json',
      instructions: 'template.md',
    });
    expect(runExportBuild(run)).toBe(0);
    expect(fs.readdirSync(path.join(root, 'out')).sort()).toEqual([
      'README.md',
      'dev.md',
      'instructions.md',
    ]);
    expect(
      fs.readFileSync(path.join(root, 'out', 'instructions.md'), 'utf8'),
    ).toMatch(/^Be direct\.\n\n\*\*`dev\.md`\*\*/);
  });

  test('returns 2 for a bad request and 1 when nothing matches', () => {
    const root = makeTempDir();
    expect(runExportBuild(options(root, { target: 'chatgpt' }))).toBe(2);
    expect(runExportBuild(options(root))).toBe(1);
    writeSkill(path.join(root, '.agents', 'skills'), 'ref-local', {
      visibility: 'repo-local',
    });
    expect(runExportBuild(options(root))).toBe(1);
  });

  test('plans match buildPlan totals', () => {
    const plan = buildPlan(
      [skill('ref-a'), skill('tool-b')],
      { ...emptySelection, prefixes: ['ref-'] },
      geminiGemLimits,
    );
    expect(plan.excluded).toEqual({ 'tool-b': 'prefix tool- is not exported' });
    expect(plan.bundles).toHaveLength(1);
  });
});
