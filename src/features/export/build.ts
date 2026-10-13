import fs from 'node:fs';
import path from 'node:path';
import { ToolError } from '../../core/errors.ts';
import type { Output } from '../../core/output.ts';
import {
  injectionsFromConfig,
  loadConfigFile,
  resolveSelection,
  type ExportConfig,
} from './config.ts';
import { discoverSkills, readCanonicalBlock } from './discovery.ts';
import {
  bundleFilename,
  bundleSizeKb,
  geminiGemLimits,
  renderInstructions,
  writeExport,
} from './geminiGem.ts';
import {
  bundleWordCount,
  formatCount,
  planSkillCount,
  planWordCount,
  type ExportPlan,
} from './models.ts';
import { buildPlan } from './planning.ts';

export const exportTargets = ['gemini-gem'] as const;

const defaultInstructions =
  'You are a focused assistant. Answer from the attached knowledge files when they cover the question, and say ' +
  'plainly when they do not.\n\n## Knowledge files\n\n{{BUNDLE_MAP}}\n';

export type ExportBuildOptions = {
  cwd: string;
  output: Output;
  target: string;
  preset: string;
  config: string | undefined;
  domains: string | undefined;
  exclude: string[];
  skillsRoot: string;
  out: string | undefined;
  instructions: string | undefined;
  dryRun: boolean;
  strict: boolean;
};

/** Flag beats config beats the built-in default. */
const resolveTemplate = (
  cwd: string,
  config: ExportConfig | undefined,
  instructions: string | undefined,
): string => {
  if (instructions !== undefined) {
    return fs.readFileSync(path.resolve(cwd, instructions), 'utf8');
  }
  const configured = config?.['instructions'];
  return typeof configured === 'string' ?
      fs.readFileSync(path.resolve(cwd, configured), 'utf8')
    : defaultInstructions;
};

/**
 * Project each configured skill's canonical block into its placeholder. A missing block is an error,
 * not an empty substitution: an instruction file quietly shipped without its persona still looks fine.
 */
const resolveInjections = (
  config: ExportConfig | undefined,
  skillsRoot: string,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(injectionsFromConfig(config)).map(
      ([placeholder, skillName]) => {
        const block = readCanonicalBlock(path.join(skillsRoot, skillName));
        if (block === undefined) {
          throw new ToolError(
            `'${skillName}' publishes no canonical block, so {{${placeholder}}} cannot be filled. The skill needs a ` +
              "'## Canonical ... text' heading followed by a fenced block.",
          );
        }
        return [placeholder, block];
      },
    ),
  );

const reportPlan = (plan: ExportPlan, output: Output): void => {
  output.info(
    `Selected ${planSkillCount(plan)} skills, ${formatCount(planWordCount(plan))} words, into ${plan.bundles.length} ` +
      `of ${geminiGemLimits.maxFiles} allowed files:`,
  );
  for (const bundle of plan.bundles) {
    output.info(
      `  ${bundleFilename(bundle).padEnd(28)} ${String(bundle.skills.length).padStart(2)} skills  ` +
        `${formatCount(bundleWordCount(bundle)).padStart(7)} words  ${formatCount(bundleSizeKb(bundle)).padStart(7)} KB`,
    );
    output.info(
      `  ${''.padEnd(28)} ${bundle.skills.map((skill) => skill.name).join(', ')}`,
    );
  }
  for (const notice of plan.notices) {
    output.info(`  note: ${notice}`);
  }
};

/** `agentic-tools export build`. Returns the exit code: 2 for a bad request, 1 for nothing to export. */
export const runExportBuild = (options: ExportBuildOptions): number => {
  const { output } = options;
  if (!(exportTargets as readonly string[]).includes(options.target)) {
    output.error(
      `Unknown target '${options.target}'. Supported: ${exportTargets.join(', ')}`,
    );
    return 2;
  }

  let config: ExportConfig | undefined;
  let selection;
  try {
    config =
      options.config === undefined ?
        undefined
      : loadConfigFile(path.resolve(options.cwd, options.config));
    selection = resolveSelection({
      preset: options.preset,
      config,
      domains: (options.domains ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== ''),
      excludedSkills: options.exclude,
    });
  } catch (error) {
    if (error instanceof ToolError) {
      output.error(error.message);
      return 2;
    }
    throw error;
  }

  const skillsRoot = path.resolve(options.cwd, options.skillsRoot);
  const skills = discoverSkills(skillsRoot);
  if (skills.length === 0) {
    output.error(`No skills found under ${options.skillsRoot}`);
    return 1;
  }

  const plan = buildPlan(skills, selection, geminiGemLimits, options.strict);
  if (plan.bundles.length === 0) {
    output.error('The selection matched no skills.');
    return 1;
  }

  reportPlan(plan, output);
  if (options.dryRun) {
    output.info('Dry run: nothing written.');
    return 0;
  }

  const template = resolveTemplate(options.cwd, config, options.instructions);
  let injections: Record<string, string>;
  try {
    injections = resolveInjections(config, skillsRoot);
  } catch (error) {
    if (error instanceof ToolError) {
      output.error(error.message);
      return 2;
    }
    throw error;
  }

  const destinationLabel =
    options.out ?? path.join('.agents', 'playground', 'export', options.target);
  const written = writeExport(
    plan,
    path.resolve(options.cwd, destinationLabel),
    template,
    injections,
    destinationLabel,
  );
  for (const placeholder of Object.keys(injections).sort()) {
    output.info(
      `Projected the canonical block for ${placeholder} verbatim from its skill.`,
    );
  }
  // The Gem instruction field's limit is undocumented, so report the size rather than let it be
  // discovered on paste.
  output.info(
    `Instructions are ${formatCount([...renderInstructions(plan, template, injections)].length)} characters. The Gem ` +
      "instruction field's limit is undocumented — if it rejects them, shorten the template rather than the routing block.",
  );
  output.info(`Wrote ${written.length} files to ${destinationLabel}`);
  return 0;
};
