import { defineCommand } from 'citty';
import {
  defineStrictCommand,
  repeatedOption,
  type CommandContext,
} from '../../core/command.ts';
import { runExportBuild } from './build.ts';

/** `agentic-tools export build`. */
export const createExportCommand = (context: CommandContext) =>
  defineCommand({
    meta: {
      name: 'export',
      description:
        'Build a skill export for a chat assistant that cannot load skills itself.',
    },
    subCommands: {
      build: defineStrictCommand({
        meta: {
          name: 'build',
          description:
            'Select skills, bundle them for retrieval, and write the export.',
        },
        args: {
          target: {
            type: 'string',
            description: "Destination shape. Only 'gemini-gem'.",
            default: 'gemini-gem',
          },
          preset: {
            type: 'string',
            description:
              "Named selection to start from: 'knowledge' or 'everything'.",
            default: 'knowledge',
          },
          config: {
            type: 'string',
            description:
              'Path to an export config file. Need not be checked in.',
            valueHint: 'path',
          },
          domains: {
            type: 'string',
            description: 'Comma-separated domains to restrict the export to.',
            valueHint: 'list',
          },
          exclude: {
            type: 'string',
            description: 'Skill name to exclude. Repeatable.',
            valueHint: 'skill',
          },
          'skills-root': {
            type: 'string',
            description: 'Directory containing skill folders.',
            default: '.agents/skills',
            valueHint: 'path',
          },
          out: {
            type: 'string',
            description: 'Where to write the export.',
            valueHint: 'path',
          },
          instructions: {
            type: 'string',
            description:
              'Instruction template. Use {{BUNDLE_MAP}} where routing should go.',
            valueHint: 'path',
          },
          'dry-run': {
            type: 'boolean',
            description: 'Print the plan without writing anything.',
          },
          strict: {
            type: 'boolean',
            description:
              'Fail instead of merging bundles when a limit would be exceeded.',
          },
        },
        run: ({ args, rawArgs }) => {
          context.setExitCode(
            runExportBuild({
              cwd: context.cwd,
              output: context.output,
              target: args.target,
              preset: args.preset,
              config: args.config,
              domains: args.domains,
              exclude: repeatedOption(rawArgs, 'exclude'),
              skillsRoot: args['skills-root'],
              out: args.out,
              instructions: args.instructions,
              dryRun: args['dry-run'] === true,
              strict: args.strict === true,
            }),
          );
        },
      }),
    },
  });
