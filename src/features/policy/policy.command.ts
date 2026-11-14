import type { Command } from 'commander';
import { z } from 'zod';
import { value, type CommandContext } from '../../core/command.ts';
import { parseWith } from '../../core/json.ts';
import { runPolicyCommand, type PolicyMode } from './sync.ts';

const optionsSchema = z.object({
  config: z.string().optional(),
  force: z.boolean().default(false),
});

const addModeCommand = (
  group: Command,
  context: CommandContext,
  mode: PolicyMode,
  description: string,
) => {
  const command = group
    .command(mode)
    .description(description)
    .option(
      '-c, --config <path>',
      'Path to an agents config or policy file.',
      value,
    );
  // check only compares, so it has nothing to force.
  if (mode !== 'check') {
    command.option(
      '-f, --force',
      'Overwrite edits made since the last sync instead of stopping.',
    );
  }
  command.action((raw: unknown) => {
    const { config, force } = parseWith(optionsSchema, raw);
    runPolicyCommand({
      mode,
      config,
      force,
      cwd: context.cwd,
      home: context.home,
    }).forEach(context.output.info);
  });
};

/** `agentic-tools policy <sync|check|import-vscode>`. */
export const registerPolicyCommand = (
  program: Command,
  context: CommandContext,
) => {
  const group = program
    .command('policy')
    .description('Sync or check generated agent policy files.');
  addModeCommand(
    group,
    context,
    'sync',
    'Sync generated policy files from .agents/config.json.',
  );
  addModeCommand(
    group,
    context,
    'check',
    'Report drift without rewriting generated policy files.',
  );
  addModeCommand(
    group,
    context,
    'import-vscode',
    'Import VS Code approvals into the policy file before syncing.',
  );
};
