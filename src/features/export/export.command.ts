import type { Command } from 'commander';
import { z } from 'zod';
import { collect, value, type CommandContext } from '../../core/command.ts';
import { parseWith } from '../../core/json.ts';
import { runExportBuild } from './build.ts';

const optionsSchema = z.object({
  target: z.string(),
  preset: z.string(),
  config: z.string().optional(),
  domains: z.string().optional(),
  exclude: z.array(z.string()).default([]),
  skillsRoot: z.string(),
  out: z.string().optional(),
  instructions: z.string().optional(),
  dryRun: z.boolean().default(false),
  strict: z.boolean().default(false),
});

/** `agentic-tools export build`. */
export const registerExportCommand = (
  program: Command,
  context: CommandContext,
) => {
  program
    .command('export')
    .description(
      'Build a skill export for a chat assistant that cannot load skills itself.',
    )
    .command('build')
    .description(
      'Select skills, bundle them for retrieval, and write the export.',
    )
    .option(
      '--target <shape>',
      "Destination shape. Only 'gemini-gem'.",
      value,
      'gemini-gem',
    )
    .option(
      '--preset <name>',
      "Named selection to start from: 'knowledge' or 'everything'.",
      value,
      'knowledge',
    )
    .option(
      '--config <path>',
      'Path to an export config file. Need not be checked in.',
      value,
    )
    .option(
      '--domains <list>',
      'Comma-separated domains to restrict the export to.',
      value,
    )
    .option('--exclude <skill>', 'Skill name to exclude. Repeatable.', collect)
    .option(
      '--skills-root <path>',
      'Directory containing skill folders.',
      value,
      '.agents/skills',
    )
    .option(
      '--out <path>',
      'Where to write the export. Default: .agents/local/playground/export/<target>.',
      value,
    )
    .option(
      '--instructions <path>',
      'Instruction template. Use {{BUNDLE_MAP}} where routing should go.',
      value,
    )
    .option('--dry-run', 'Print the plan without writing anything.')
    .option(
      '--strict',
      'Fail instead of merging bundles when a limit would be exceeded.',
    )
    .action((raw: unknown) => {
      const options = parseWith(optionsSchema, raw);
      context.setExitCode(
        runExportBuild({
          ...options,
          config: options.config,
          domains: options.domains,
          out: options.out,
          instructions: options.instructions,
          cwd: context.cwd,
          output: context.output,
        }),
      );
    });
};
