import fs from "node:fs";
import JSON5 from "json5";
import { z } from "zod";
import { ToolError } from "./errors.ts";

export type JsonObject = { [key: string]: unknown };

export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Render JSON the way every generated file in this repo is written: two spaces, final newline. */
export const toJsonText = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** Parse a JSON or JSON5 file. Returns `undefined` when the file is missing. */
export const readJson5File = (target: string, context: string): unknown => {
  if (!fs.existsSync(target)) {
    return undefined;
  }
  try {
    return JSON5.parse(fs.readFileSync(target, "utf8"));
  } catch (error) {
    throw new ToolError(`${context} contains invalid JSON: ${errorMessage(error)}`);
  }
};

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Validate `value` with `schema`, turning the first issue into a readable `ToolError`. Without a
 * `context`, the issue message is used as-is, for schemas whose messages already name the field.
 */
export const parseWith = <Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  context?: string,
  pathPrefix: readonly string[] = [],
): z.output<Schema> => {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  const [issue] = result.error.issues;
  if (context === undefined) {
    throw new ToolError(issue?.message ?? "Invalid value.");
  }
  if (issue === undefined) {
    throw new ToolError(`${context} is invalid.`);
  }
  // An unknown key is reported at the key itself, which is where the author has to look.
  const unknownKey = issue.code === "unrecognized_keys" ? issue.keys.slice(0, 1) : [];
  const message = issue.code === "unrecognized_keys" ? "Extra inputs are not permitted" : issue.message;
  const location = [...pathPrefix, ...issue.path.map(String), ...unknownKey].join(".");
  throw new ToolError(
    location === "" ? `${context} is invalid: ${message}` : `${context} is invalid at ${location}: ${message}`,
  );
};
