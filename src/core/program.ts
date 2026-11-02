import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command, CommanderError } from 'commander';
import { z } from 'zod';
import { registerExportCommand } from '../features/export/export.command.ts';
import { registerPluginCommand } from '../features/plugin/plugin.command.ts';
import { registerPolicyCommand } from '../features/policy/policy.command.ts';
import { registerSkillsCommand } from '../features/skills/skills.command.ts';
import { value, type CommandContext } from './command.ts';
import { ToolError } from './errors.ts';
import { parseWith } from './json.ts';
import { createConsoleOutput, type Output } from './output.ts';

const usageErrorCode = 2;

export type RunOptions = { cwd?: string; home?: string; output?: Output };

const rootOptionsSchema = z.object({ workspace: z.string().optional() });

const resolveWorkspace = (raw: string | undefined, cwd: string): string => {
  if (raw === undefined) {
    return cwd;
  }
  const workspace = path.resolve(cwd, raw);
  if (!fs.existsSync(workspace) || !fs.statSync(workspace).isDirectory()) {
    throw new ToolError(`Workspace '${raw}' is not an existing directory.`);
  }
  return fs.realpathSync(workspace);
};

/** The front controller: each feature contributes one command group. */
const createProgram = (context: CommandContext) => {
  const program = new Command('agentic-tools')
    .description(
      'Run shared policy, skills, plugin, and export workflows from one CLI.',
    )
    .exitOverride()
    .enablePositionalOptions()
    .helpCommand(false)
    .showHelpAfterError('(add --help for usage)')
    .configureOutput({
      writeOut: (text) => {
        context.output.info(text.trimEnd());
      },
      writeErr: (text) => {
        context.output.error(text.replace(/^error: /, '').trimEnd());
      },
    })
    .option(
      '-w, --workspace <path>',
      'Run the command from this workspace directory.',
      value,
    )
    .hook('preAction', () => {
      const { workspace } = parseWith(rootOptionsSchema, program.opts());
      context.cwd = resolveWorkspace(workspace, context.cwd);
    });
  registerPolicyCommand(program, context);
  registerSkillsCommand(program, context);
  registerPluginCommand(program, context);
  registerExportCommand(program, context);
  for (const group of program.commands) {
    group.helpCommand(false);
  }
  return program;
};

const isHelp = (token: string) => token === '-h' || token === '--help';

/**
 * Commander shows help before it reports other mistakes on the line and dispatches a command named
 * after `--`. Both are usage errors here, so walk the levels first. Run this on its own program:
 * `parseOptions` records option values.
 */
const refuseWhatCommanderAccepts = (program: Command, argv: string[]): void => {
  let command = program;
  let rest = argv;
  for (;;) {
    const terminator = rest.indexOf('--');
    const options = rest.slice(0, terminator === -1 ? rest.length : terminator);
    const { operands, unknown } = command.parseOptions(options);
    const name = operands[0];
    const next = command.commands.find((child) => child.name() === name);
    if (next !== undefined) {
      command = next;
      rest = rest.slice(rest.indexOf(next.name()) + 1);
      continue;
    }
    if (command.commands.length > 0 && terminator !== -1) {
      command.error(`error: expected a command before '--'.`, {
        exitCode: usageErrorCode,
      });
    }
    if (!unknown.some(isHelp)) {
      return;
    }
    const flag = unknown.find(
      (token) => token.startsWith('-') && !isHelp(token),
    );
    if (flag !== undefined) {
      command.error(`error: unknown option '${flag}'`, {
        exitCode: usageErrorCode,
      });
    }
    const positionals = [
      ...operands,
      ...unknown.filter((token) => !token.startsWith('-')),
    ];
    const unknownCommand = positionals.at(0);
    if (
      command.commands.length > 0 &&
      unknownCommand !== undefined &&
      !command.commands.some((child) => child.name() === unknownCommand)
    ) {
      command.error(`error: unknown command '${unknownCommand}'`, {
        exitCode: usageErrorCode,
      });
    }
    const accepted = command.registeredArguments;
    if (
      command.commands.length === 0 &&
      accepted.at(-1)?.variadic !== true &&
      positionals.length > accepted.length
    ) {
      command.error(`error: too many arguments for '${command.name()}'.`, {
        exitCode: usageErrorCode,
      });
    }
    return;
  }
};

/** Run the CLI and return its exit code: 1 for an expected failure, 2 for a malformed invocation. */
export const runCli = async (
  argv: readonly string[],
  options: RunOptions = {},
): Promise<number> => {
  const output = options.output ?? createConsoleOutput();
  let exitCode = 0;
  const context: CommandContext = {
    cwd: options.cwd ?? process.cwd(),
    home: options.home ?? os.homedir(),
    output,
    setExitCode: (code) => {
      exitCode = code;
    },
  };
  try {
    refuseWhatCommanderAccepts(createProgram(context), [...argv]);
    await createProgram(context).parseAsync([...argv], { from: 'user' });
    return exitCode;
  } catch (error) {
    if (error instanceof ToolError) {
      output.error(error.message);
      return 1;
    }
    if (error instanceof CommanderError) {
      if (error.exitCode === 0) {
        return 0;
      }
      // A group run without a command prints its help and fails, which is not a malformed line.
      return error.code === 'commander.help' ? 1 : usageErrorCode;
    }
    throw error;
  }
};
