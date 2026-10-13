import path from 'node:path';
import { defineCommand } from 'citty';
import type { CommandContext } from '../../core/command.ts';
import {
  buildManifests,
  findDriftedManifests,
  writeManifests,
} from './manifests.ts';

const rootArgs = {
  root: {
    type: 'string',
    description:
      'Repository root to read the catalog from and write manifests to.',
    default: '.',
    valueHint: 'path',
  },
} as const;

/** `agentic-tools plugin <sync|check>`. */
export const createPluginCommand = (context: CommandContext) =>
  defineCommand({
    meta: {
      name: 'plugin',
      description:
        'Generate and verify the Claude Code plugin and marketplace manifests.',
    },
    subCommands: {
      sync: defineCommand({
        meta: {
          name: 'sync',
          description:
            'Regenerate the plugin manifests from the skills catalog.',
        },
        args: rootArgs,
        run: ({ args }) => {
          const root = path.resolve(context.cwd, args.root);
          for (const written of writeManifests(root, buildManifests(root))) {
            context.output.info(`wrote ${written}`);
          }
        },
      }),
      check: defineCommand({
        meta: {
          name: 'check',
          description:
            'Fail if the committed plugin manifests drift from the skills catalog.',
        },
        args: rootArgs,
        run: ({ args }) => {
          const root = path.resolve(context.cwd, args.root);
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
        },
      }),
    },
  });
