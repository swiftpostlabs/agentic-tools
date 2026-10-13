import { defineCommand } from 'citty';
import {
  defineStrictCommand,
  type CommandContext,
} from '../../core/command.ts';
import { runPolicyCommand, type PolicyMode } from './sync.ts';

const modeCommand = (
  context: CommandContext,
  mode: PolicyMode,
  description: string,
) =>
  defineStrictCommand({
    meta: { name: mode, description },
    args: {
      config: {
        type: 'string',
        alias: 'c',
        description: 'Path to an agents config or policy file.',
        valueHint: 'path',
      },
    },
    run: ({ args }) => {
      runPolicyCommand({
        mode,
        config: args.config,
        cwd: context.cwd,
        home: context.home,
      }).forEach(context.output.info);
    },
  });

/** `agentic-tools policy <sync|check|import-vscode>`. */
export const createPolicyCommand = (context: CommandContext) =>
  defineCommand({
    meta: {
      name: 'policy',
      description: 'Sync or check generated agent policy files.',
    },
    subCommands: {
      sync: modeCommand(
        context,
        'sync',
        'Sync generated policy files from .agents/config.json.',
      ),
      check: modeCommand(
        context,
        'check',
        'Report drift without rewriting generated policy files.',
      ),
      'import-vscode': modeCommand(
        context,
        'import-vscode',
        'Import VS Code approvals into the policy file before syncing.',
      ),
    },
  });
