import { defineCommand, type ArgsDef, type CittyPlugin, type CommandDef } from "citty";
import { UsageError } from "./errors.ts";
import type { Output } from "./output.ts";

/**
 * Everything a command needs from its environment, injected so tests run without a real shell.
 * `cwd` is final once the root command has resolved `--workspace`, which happens before any
 * feature command runs; read it inside `run`, never when building the command.
 */
export type CommandContext = {
  cwd: string;
  home: string;
  output: Output;
  setExitCode: (code: number) => void;
};

const helpFlags = ["help", "h"] as const;

const kebabCase = (name: string): string => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const optionNames = (args: ArgsDef): Set<string> => {
  const names = new Set<string>(helpFlags);
  for (const [name, arg] of Object.entries(args)) {
    if (arg.type === "positional") {
      continue;
    }
    names.add(name);
    names.add(kebabCase(name));
    const aliases = "alias" in arg ? arg.alias : undefined;
    for (const alias of typeof aliases === "string" ? [aliases] : (aliases ?? [])) {
      names.add(alias);
    }
  }
  return names;
};

const takesValue = (args: ArgsDef, flag: string): boolean =>
  Object.entries(args).some(
    ([name, arg]) =>
      (arg.type === "string" || arg.type === "enum") &&
      (name === flag || kebabCase(name) === flag || ("alias" in arg && [arg.alias].flat().includes(flag))),
  );

/** Options in `rawArgs` that `args` does not declare. citty ignores them; this CLI refuses them. */
export const findUnknownOptions = (rawArgs: readonly string[], args: ArgsDef): string[] => {
  const known = optionNames(args);
  const unknown: string[] = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index] ?? "";
    if (token === "--") {
      break;
    }
    if (!token.startsWith("-") || token === "-") {
      continue;
    }
    const [flag = "", value] = token.replace(/^-{1,2}/, "").split("=", 2);
    const name = flag.startsWith("no-") && !known.has(flag) ? flag.slice("no-".length) : flag;
    if (!known.has(name)) {
      unknown.push(token);
    } else if (value === undefined && takesValue(args, name)) {
      index += 1;
    }
  }
  return unknown;
};

/** The index of the first positional in `rawArgs`, skipping the values of options in `args`; -1 if none. */
export const firstPositionalIndex = (rawArgs: readonly string[], args: ArgsDef): number => {
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index] ?? "";
    if (token === "--") {
      return -1;
    }
    if (!token.startsWith("-")) {
      return index;
    }
    if (!token.includes("=") && takesValue(args, token.replace(/^-{1,2}/, ""))) {
      index += 1;
    }
  }
  return -1;
};

/** Every value given for a repeatable option, such as `--exclude a --exclude b`; citty keeps only the last. */
export const repeatedOption = (rawArgs: readonly string[], name: string): string[] => {
  const values: string[] = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index] ?? "";
    if (token === "--") {
      break;
    }
    if (token === `--${name}`) {
      const value = rawArgs[index + 1];
      if (value !== undefined) {
        values.push(value);
      }
      index += 1;
    } else if (token.startsWith(`--${name}=`)) {
      values.push(token.slice(`--${name}=`.length));
    }
  }
  return values;
};

const rejectUnknownOptions: CittyPlugin = {
  name: "reject-unknown-options",
  setup: async ({ rawArgs, cmd }) => {
    const args = typeof cmd.args === "function" ? await cmd.args() : await cmd.args;
    const unknown = findUnknownOptions(rawArgs, args ?? {});
    if (unknown.length > 0) {
      throw new UsageError(`Unknown option${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`);
    }
  },
};

/** A runnable command: like citty's `defineCommand`, but refuses options it does not declare. */
export const defineStrictCommand = <const T extends ArgsDef>(definition: CommandDef<T>): CommandDef<T> =>
  defineCommand({ ...definition, plugins: [...(definition.plugins ?? []), rejectUnknownOptions] });
