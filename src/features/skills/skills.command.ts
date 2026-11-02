import type { Command } from 'commander';
import { z } from 'zod';
import { value, type CommandContext } from '../../core/command.ts';
import { parseWith } from '../../core/json.ts';
import {
  runSkillsLink,
  runSkillsList,
  runSkillsSync,
  runSkillsUnlink,
} from './skills.ts';

const sourceSchema = z.object({ from: z.string().optional() });
const destinationSchema = z.object({
  to: z.string().optional(),
  global: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});
const forceSchema = z.object({ force: z.boolean().default(false) });
const linkSchema = z.object({
  ...sourceSchema.shape,
  ...destinationSchema.shape,
  ...forceSchema.shape,
});
const syncSchema = z.object({
  ...destinationSchema.shape,
  ...forceSchema.shape,
  config: z.string().optional(),
});
const unlinkSchema = z.object({
  ...sourceSchema.shape,
  ...destinationSchema.shape,
});

const addSourceOption = (command: Command) =>
  command.option(
    '-f, --from <source>',
    'Source repository root or exact .agents/skills directory. Defaults to the current directory.',
    value,
  );

const addDestinationOptions = (command: Command) =>
  command
    .option(
      '-t, --to <repo>',
      'Destination repository root or exact .agents/skills directory. Defaults to the current directory.',
      value,
    )
    .option('-g, --global', 'Use ~/.agents/skills as the destination.')
    .option('--dry-run', 'Print the plan without changing any links.');

const addForceOption = (command: Command) =>
  command.option(
    '--force',
    'Replace an existing symlink that points somewhere else.',
  );

const destination = (options: z.output<typeof destinationSchema>) => ({
  destination: options.to,
  useGlobal: options.global,
  dryRun: options.dryRun,
});

/** `agentic-tools skills <list|link|sync|unlink>`. */
export const registerSkillsCommand = (
  program: Command,
  context: CommandContext,
) => {
  const group = program
    .command('skills')
    .description('List, link, sync, and unlink shared skills.');

  addSourceOption(
    group.command('list').description('List skills from a source repo.'),
  ).action((raw: unknown) => {
    runSkillsList(context, parseWith(sourceSchema, raw).from);
  });

  addForceOption(
    addDestinationOptions(
      addSourceOption(
        group
          .command('link')
          .description('Link skills from a source repo.')
          .argument('<skills...>', 'Skill names, one or more.'),
      ),
    ),
  ).action((skills: string[], raw: unknown) => {
    const options = parseWith(linkSchema, raw);
    runSkillsLink(context, {
      ...destination(options),
      skills,
      source: options.from,
      force: options.force,
    });
  });

  addForceOption(
    addDestinationOptions(
      group
        .command('sync')
        .description('Link skills declared in a skills config.'),
    ).option(
      '-c, --config <path>',
      'Agents config or skills config. Defaults to <destination>/.agents/config.json.',
      value,
    ),
  ).action((raw: unknown) => {
    const options = parseWith(syncSchema, raw);
    runSkillsSync(context, {
      ...destination(options),
      config: options.config,
      force: options.force,
    });
  });

  addDestinationOptions(
    addSourceOption(
      group
        .command('unlink')
        .description('Remove linked skills from a destination repo.')
        .argument('<skills...>', 'Skill names, one or more.'),
    ),
  ).action((skills: string[], raw: unknown) => {
    const options = parseWith(unlinkSchema, raw);
    runSkillsUnlink(context, {
      ...destination(options),
      skills,
      source: options.from,
    });
  });
};
