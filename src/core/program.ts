import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  defineCommand,
  renderUsage,
  type ArgsDef,
  type CommandDef,
  type ParsedArgs,
  type Resolvable,
} from 'citty';
import { createExportCommand } from '../features/export/export.command.ts';
import { createPluginCommand } from '../features/plugin/plugin.command.ts';
import { createPolicyCommand } from '../features/policy/policy.command.ts';
import { createSkillsCommand } from '../features/skills/skills.command.ts';
import {
  resolveValue,
  takesPositionals,
  toParseArgsOptions,
  type CommandContext,
} from './command.ts';
import { ToolError } from './errors.ts';
import { createConsoleOutput, type Output } from './output.ts';

const programName = 'agentic-tools';
const usageErrorCode = 2;

export type RunOptions = { cwd?: string; home?: string; output?: Output };

// citty types sub-commands as `CommandDef<any>` (SubCommandsDef), and a command typed with its own
// args is not assignable to `CommandDef<ArgsDef>`. This module is the one boundary that walks the
// tree, so it holds the escape hatch and narrows `args` once, in `argsOf`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCommand = CommandDef<any>;

const argsOf = async (command: AnyCommand): Promise<ArgsDef> =>
  command.args === undefined ?
    {}
  : resolveValue(command.args as Resolvable<ArgsDef>);

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
    subCommands: {
      policy: createPolicyCommand(context),
      skills: createSkillsCommand(context),
      plugin: createPluginCommand(context),
      export: createExportCommand(context),
    },
  });

type Parsed = ReturnType<typeof parseArgs>;

/** What `argv` asks for, after every level has been validated strictly. */
type Invocation = { names: string[]; command: AnyCommand } & (
  | {
      kind: 'run';
      args: ArgsDef;
      parsed: Parsed;
      rawArgs: string[];
      workspace: string | undefined;
    }
  | { kind: 'help' }
  | { kind: 'usage-error'; message: string; exitCode: number }
);

const parseStrictly = (
  argv: readonly string[],
  args: ArgsDef,
  allowPositionals: boolean,
): Parsed | string => {
  try {
    return parseArgs({
      args: [...argv],
      options: toParseArgsOptions(args),
      strict: true,
      allowPositionals,
    });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

/** Index of the token that names the sub-command, skipping declared options and their values. */
const commandNameIndex = (argv: readonly string[], args: ArgsDef) =>
  parseArgs({
    args: [...argv],
    options: toParseArgsOptions(args),
    strict: false,
    allowPositionals: true,
    tokens: true,
  }).tokens.find(
    (token) =>
      token.kind === 'positional' || token.kind === 'option-terminator',
  );

/**
 * Walk from the root to the command `argv` names. Options belong to the level they follow:
 * `--workspace` before the group, a command's own options after its name.
 */
const resolveInvocation = async (
  root: AnyCommand,
  argv: readonly string[],
): Promise<Invocation> => {
  const names = [programName];
  let command = root;
  let rest = [...argv];
  let help = false;
  let workspace: string | undefined;
  for (;;) {
    const args = await argsOf(command);
    const subCommands =
      command.subCommands === undefined ?
        undefined
      : await resolveValue(command.subCommands);

    if (subCommands === undefined) {
      const parsed = parseStrictly(rest, args, takesPositionals(args));
      if (typeof parsed === 'string') {
        return {
          names,
          command,
          kind: 'usage-error',
          message: parsed,
          exitCode: usageErrorCode,
        };
      }
      if (help || parsed.values['help'] === true) {
        return { names, command, kind: 'help' };
      }
      return {
        names,
        command,
        kind: 'run',
        args,
        parsed,
        rawArgs: rest,
        workspace,
      };
    }

    const nameToken = commandNameIndex(rest, args);
    const end = nameToken?.index ?? rest.length;
    const parsed = parseStrictly(rest.slice(0, end), args, false);
    if (typeof parsed === 'string') {
      return {
        names,
        command,
        kind: 'usage-error',
        message: parsed,
        exitCode: usageErrorCode,
      };
    }
    help ||= parsed.values['help'] === true;
    if (names.length === 1) {
      const value = parsed.values['workspace'];
      workspace = typeof value === 'string' ? value : undefined;
    }
    if (nameToken === undefined) {
      return help ?
          { names, command, kind: 'help' }
        : {
            names,
            command,
            kind: 'usage-error',
            message: 'No command specified.',
            exitCode: 1,
          };
    }
    const name = rest[end] ?? '';
    const next =
      nameToken.kind === 'positional' ? subCommands[name] : undefined;
    if (next === undefined) {
      return {
        names,
        command,
        kind: 'usage-error',
        message:
          nameToken.kind === 'positional' ?
            `Unknown command '${name}'.`
          : `Expected a command before '--'.`,
        exitCode: usageErrorCode,
      };
    }
    names.push(name);
    command = await resolveValue(next);
    rest = rest.slice(end + 1);
  }
};

const usageOf = (invocation: Invocation): Promise<string> => {
  const parent =
    invocation.names.length > 1 ?
      { meta: { name: invocation.names.slice(0, -1).join(' ') } }
    : undefined;
  return renderUsage(invocation.command, parent);
};

/** The command's `run`, given what citty's own parser would: values, positionals, and the first positional by name. */
const runCommand = async (
  invocation: Extract<Invocation, { kind: 'run' }>,
): Promise<string | undefined> => {
  const { args, parsed } = invocation;
  const positional = Object.entries(args).find(
    ([, arg]) => arg.type === 'positional',
  );
  const first = parsed.positionals[0];
  if (
    positional !== undefined &&
    first === undefined &&
    positional[1].required !== false
  ) {
    return `Missing required argument: ${positional[0].toUpperCase()}`;
  }
  const values = {
    _: parsed.positionals,
    ...parsed.values,
    ...(positional === undefined ? {} : { [positional[0]]: first }),
  };
  await invocation.command.run?.({
    rawArgs: invocation.rawArgs,
    // The shape citty's own parser produces; its ParsedArgs type cannot express `_` beside the
    // string index signature.
    args: values as ParsedArgs,
    cmd: invocation.command,
  });
  return undefined;
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
  const invocation = await resolveInvocation(createProgram(context), argv);
  switch (invocation.kind) {
    case 'help':
      output.info(await usageOf(invocation));
      return 0;
    case 'usage-error':
      output.error(`${invocation.message}\n\n${await usageOf(invocation)}`);
      return invocation.exitCode;
    case 'run':
      try {
        context.cwd = resolveWorkspace(invocation.workspace, context.cwd);
        const missing = await runCommand(invocation);
        if (missing !== undefined) {
          output.error(`${missing}\n\n${await usageOf(invocation)}`);
          return usageErrorCode;
        }
        return exitCode;
      } catch (error) {
        if (error instanceof ToolError) {
          output.error(error.message);
          return 1;
        }
        throw error;
      }
  }
};
