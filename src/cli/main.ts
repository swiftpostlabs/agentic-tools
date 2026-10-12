import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { ToolError } from "../core/errors.ts";
import { errorMessage } from "../core/json.ts";
import { createConsoleOutput, type Output } from "../core/output.ts";
import { commandGroups } from "./commands.ts";
import type { CommandSpec, OptionSpecs, ParsedValues } from "./spec.ts";

const programName = "agentic-tools";
const usageErrorCode = 2;

export type RunOptions = { cwd?: string; home?: string; output?: Output };

const optionLabel = (name: string, spec: OptionSpecs[string]): string => {
  const flags = spec.short === undefined ? `--${name}` : `-${spec.short}, --${name}`;
  return spec.type === "string" ? `${flags} <${spec.valueName ?? "value"}>` : flags;
};

const renderTable = (rows: Array<[string, string]>): string[] => {
  const width = Math.max(...rows.map(([label]) => label.length));
  return rows.map(([label, description]) => `  ${label.padEnd(width)}  ${description}`);
};

const rootHelp = (): string =>
  [
    `Usage: ${programName} [--workspace <path>] <group> <command> [options]`,
    "",
    "Run shared policy, skills, plugin, and export workflows from one CLI.",
    "",
    "Options:",
    ...renderTable([
      ["-w, --workspace <path>", "Run the command from this workspace directory."],
      ["-h, --help", "Show help."],
    ]),
    "",
    "Groups:",
    ...renderTable(Object.entries(commandGroups).map(([name, group]) => [name, group.description])),
  ].join("\n");

const groupHelp = (groupName: string): string => {
  const group = commandGroups[groupName];
  if (group === undefined) {
    return rootHelp();
  }
  return [
    `Usage: ${programName} ${groupName} <command> [options]`,
    "",
    group.description,
    "",
    "Commands:",
    ...renderTable(Object.entries(group.commands).map(([name, command]) => [name, command.description])),
  ].join("\n");
};

const commandHelp = (groupName: string, commandName: string, command: CommandSpec): string => {
  const positional = command.positional === undefined ? "" : ` <${command.positional.name}...>`;
  const rows: Array<[string, string]> = Object.entries(command.options).map(([name, spec]) => {
    const fallback = spec.type === "string" && spec.default !== undefined ? ` (default: ${spec.default})` : "";
    return [optionLabel(name, spec), `${spec.description}${fallback}`];
  });
  rows.push(["-h, --help", "Show help."]);
  return [
    `Usage: ${programName} ${groupName} ${commandName}${positional} [options]`,
    "",
    command.description,
    "",
    "Options:",
    ...renderTable(rows),
  ].join("\n");
};

/** Pull `--workspace`/`-w` and a leading `--help` off the front, before the group name. */
const parseGlobalOptions = (argv: string[]): { workspace: string | undefined; help: boolean; rest: string[] } => {
  let workspace: string | undefined;
  let help = false;
  let index = 0;
  while (index < argv.length) {
    const argument = argv[index] ?? "";
    if (argument === "--workspace" || argument === "-w") {
      workspace = argv[index + 1];
      if (workspace === undefined) {
        throw new ToolError(`Option '${argument}' requires a value.`);
      }
      index += 2;
    } else if (argument.startsWith("--workspace=")) {
      workspace = argument.slice("--workspace=".length);
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      help = true;
      index += 1;
    } else {
      break;
    }
  }
  return { workspace, help, rest: argv.slice(index) };
};

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

const runCommand = (
  groupName: string,
  commandName: string,
  command: CommandSpec,
  argv: string[],
  context: { cwd: string; home: string; output: Output },
): number => {
  const options: ParseArgsOptionsConfig = { help: { type: "boolean", short: "h" } };
  for (const [name, spec] of Object.entries(command.options)) {
    options[name] =
      spec.type === "boolean"
        ? { type: "boolean", ...(spec.short === undefined ? {} : { short: spec.short }) }
        : {
            type: "string",
            ...(spec.short === undefined ? {} : { short: spec.short }),
            ...(spec.multiple === true ? { multiple: true } : {}),
            ...(spec.default === undefined ? {} : { default: spec.default }),
          };
  }
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options, allowPositionals: command.positional !== undefined, strict: true });
  } catch (error) {
    context.output.error(`${errorMessage(error)}\n\n${commandHelp(groupName, commandName, command)}`);
    return usageErrorCode;
  }
  if (parsed.values["help"] === true) {
    context.output.info(commandHelp(groupName, commandName, command));
    return 0;
  }
  if (command.positional !== undefined && parsed.positionals.length === 0) {
    context.output.error(
      `Missing ${command.positional.name} argument.\n\n${commandHelp(groupName, commandName, command)}`,
    );
    return usageErrorCode;
  }
  return command.run(context, parsed.values as ParsedValues, parsed.positionals) ?? 0;
};

/** Run the CLI and return its exit code. Expected failures print their message and return 1. */
export const runCli = (argv: string[], options: RunOptions = {}): number => {
  const output = options.output ?? createConsoleOutput();
  try {
    const globals = parseGlobalOptions(argv);
    const [groupName, commandName, ...rest] = globals.rest;
    if (groupName === undefined) {
      (globals.help ? output.info : output.error)(rootHelp());
      return globals.help ? 0 : 1;
    }
    const group = commandGroups[groupName];
    if (group === undefined) {
      output.error(`Unknown command group '${groupName}'.\n\n${rootHelp()}`);
      return usageErrorCode;
    }
    if (commandName === undefined || commandName === "--help" || commandName === "-h") {
      const asked = globals.help || commandName !== undefined;
      (asked ? output.info : output.error)(groupHelp(groupName));
      return asked ? 0 : 1;
    }
    const command = group.commands[commandName];
    if (command === undefined) {
      output.error(`Unknown command '${groupName} ${commandName}'.\n\n${groupHelp(groupName)}`);
      return usageErrorCode;
    }
    const cwd = resolveWorkspace(globals.workspace, options.cwd ?? process.cwd());
    const helpArgs = globals.help ? ["--help"] : [];
    return runCommand(groupName, commandName, command, [...rest, ...helpArgs], {
      cwd,
      home: options.home ?? os.homedir(),
      output,
    });
  } catch (error) {
    if (error instanceof ToolError) {
      output.error(error.message);
      return 1;
    }
    throw error;
  }
};
