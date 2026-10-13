import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  defineCommand,
  renderUsage,
  runCommand,
  type CommandDef,
  type Resolvable,
} from 'citty';
import { createExportCommand } from '../features/export/export.command.ts';
import { createPluginCommand } from '../features/plugin/plugin.command.ts';
import { createPolicyCommand } from '../features/policy/policy.command.ts';
import { createSkillsCommand } from '../features/skills/skills.command.ts';
import { firstPositionalIndex, type CommandContext } from './command.ts';
import { ToolError, UsageError } from './errors.ts';
import { createConsoleOutput, type Output } from './output.ts';

const programName = 'agentic-tools';
const usageErrorCode = 2;

export type RunOptions = { cwd?: string; home?: string; output?: Output };

// citty types sub-commands as `CommandDef<any>` (SubCommandsDef), and a command typed with its own
// args is not assignable to `CommandDef<ArgsDef>`, so walking the tree needs the same escape hatch.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCommand = CommandDef<any>;

const resolve = async <T>(value: Resolvable<T>): Promise<T> =>
  typeof value === 'function' ? (value as () => T | Promise<T>)() : value;

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
const createProgram = (context: CommandContext) =>
  defineCommand({
    meta: {
      name: programName,
      description:
        'Run shared policy, skills, plugin, and export workflows from one CLI.',
    },
    args: {
      workspace: {
        type: 'string',
        alias: 'w',
        description: 'Run the command from this workspace directory.',
        valueHint: 'path',
      },
    },
    setup: ({ args }) => {
      context.cwd = resolveWorkspace(args.workspace, context.cwd);
    },
    subCommands: {
      policy: createPolicyCommand(context),
      skills: createSkillsCommand(context),
      plugin: createPluginCommand(context),
      export: createExportCommand(context),
    },
  });

/** The deepest command `argv` names, and the names leading to it, for help and usage errors. */
const resolveCommandPath = async (
  root: AnyCommand,
  argv: readonly string[],
) => {
  const names = [programName];
  let command = root;
  let rest = argv;
  for (;;) {
    const subCommands =
      command.subCommands === undefined ?
        undefined
      : await resolve(command.subCommands);
    const index = firstPositionalIndex(
      rest,
      command.args === undefined ? {} : await resolve(command.args),
    );
    const name = index === -1 ? undefined : rest[index];
    const next =
      name === undefined || subCommands === undefined ?
        undefined
      : subCommands[name];
    if (name === undefined || next === undefined) {
      return { names, command };
    }
    names.push(name);
    command = await resolve(next);
    rest = rest.slice(index + 1);
  }
};

const usageFor = async (
  root: AnyCommand,
  argv: readonly string[],
): Promise<string> => {
  const { names, command } = await resolveCommandPath(root, argv);
  const parent =
    names.length > 1 ?
      { meta: { name: names.slice(0, -1).join(' ') } }
    : undefined;
  return renderUsage(command, parent);
};

const asksForHelp = (argv: readonly string[]): boolean => {
  const end = argv.indexOf('--');
  return (end === -1 ? argv : argv.slice(0, end)).some(
    (token) => token === '--help' || token === '-h',
  );
};

const cittyErrorCode = (error: unknown): string | undefined =>
  (
    error instanceof Error &&
    error.name === 'CLIError' &&
    'code' in error &&
    typeof error.code === 'string'
  ) ?
    error.code
  : undefined;

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
  const program: AnyCommand = createProgram(context);
  if (asksForHelp(argv)) {
    output.info(await usageFor(program, argv));
    return 0;
  }
  try {
    await runCommand(program, { rawArgs: [...argv] });
    return exitCode;
  } catch (error) {
    const cittyCode = cittyErrorCode(error);
    if (error instanceof UsageError || cittyCode !== undefined) {
      output.error(
        `${(error as Error).message}\n\n${await usageFor(program, argv)}`,
      );
      return cittyCode === 'E_NO_COMMAND' ? 1 : usageErrorCode;
    }
    if (error instanceof ToolError) {
      output.error(error.message);
      return 1;
    }
    throw error;
  }
};
