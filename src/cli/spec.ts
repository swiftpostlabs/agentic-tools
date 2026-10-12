import type { Output } from "../core/output.ts";

export type OptionSpec =
  | { type: "string"; short?: string; description: string; multiple?: boolean; default?: string; valueName?: string }
  | { type: "boolean"; short?: string; description: string };

export type OptionSpecs = Record<string, OptionSpec>;

export type ParsedValues = Record<string, string | boolean | string[] | undefined>;

/** Everything a command needs from its environment, injected so tests run without a real shell. */
export type CommandContext = { cwd: string; home: string; output: Output };

export type CommandSpec = {
  description: string;
  options: OptionSpecs;
  /** A variadic positional, such as the skill names of `skills link`. */
  positional?: { name: string; description: string };
  run: (context: CommandContext, values: ParsedValues, positionals: string[]) => number | void;
};

export type CommandGroup = { description: string; commands: Record<string, CommandSpec> };

export const stringValue = (values: ParsedValues, key: string): string | undefined => {
  const value = values[key];
  return typeof value === "string" ? value : undefined;
};

export const booleanValue = (values: ParsedValues, key: string): boolean => values[key] === true;

export const listValue = (values: ParsedValues, key: string): string[] => {
  const value = values[key];
  return Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
};
