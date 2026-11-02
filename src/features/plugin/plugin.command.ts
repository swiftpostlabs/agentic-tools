import path from 'node:path';
import type { Command } from 'commander';
import { z } from 'zod';
import { value, type CommandContext } from '../../core/command.ts';
import { parseWith } from '../../core/json.ts';
import {
  buildManifests,
  findDriftedManifests,
  writeManifests,
} from './manifests.ts';

const optionsSchema = z.object({ root: z.string() });

const addRootOption = (command: Command) =>
  command.option(
    '--root <path>',
    'Repository root to read the catalog from and write manifests to.',
    value,
    '.',
  );

/** `agentic-tools plugin <sync|check>`. */
export const registerPluginCommand = (
  program: Command,
  context: CommandContext,
) => {
  const group = program
    .command('plugin')
    .description(
      'Generate and verify the Claude Code plugin and marketplace manifests.',
    );
  addRootOption(
    group
      .command('sync')
      .description('Regenerate the plugin manifests from the skills catalog.'),
  ).action((raw: unknown) => {
    const root = path.resolve(context.cwd, parseWith(optionsSchema, raw).root);
    for (const written of writeManifests(root, buildManifests(root))) {
      context.output.info(`wrote ${written}`);
    }
  });
  addRootOption(
    group
      .command('check')
      .description(
        'Fail if the committed plugin manifests drift from the skills catalog.',
      ),
  ).action((raw: unknown) => {
    const root = path.resolve(context.cwd, parseWith(optionsSchema, raw).root);
    const drifted = findDriftedManifests(root, buildManifests(root));
    if (drifted.length === 0) {
      context.output.info('Plugin manifests are up to date.');
      return;
    }
    for (const relative of drifted) {
      context.output.error(
        `Drift detected: ${relative} does not match the skills catalog`,
      );
    }
    context.output.error(
      'Run `agentic-tools plugin sync` and commit the regenerated manifests.',
    );
    context.setExitCode(1);
  });
};
