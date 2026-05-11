import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { consola, createConsola } from "consola";

export class ToolError extends Error {}

export type JsonObject = Record<string, unknown>;
export type OutputFn = (message: string) => void;

export interface LoggerLike {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface RunOptions {
  cwd?: string;
  output?: OutputFn;
  logger?: LoggerLike;
}

export interface ExecutionOptions {
  cwd: string;
  output: OutputFn;
  logger: LoggerLike;
}

export const DEFAULT_GLOBAL_SKILLS_DIR = path.join(
  os.homedir(),
  ".agents",
  "skills",
);
export const PACKAGE_SOURCE_PREFIX = "package:";
export const SYNC_CONFIG_FILENAME = "skills.json";

export function resolvePath(rawPath: string | null | undefined, cwd = process.cwd()): string {
  return path.resolve(cwd, rawPath ?? ".");
}

export function pathExists(targetPath: string): boolean {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function isDirectory(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

export function isFile(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isFile();
  } catch {
    return false;
  }
}

export function ensureJsonObject(value: unknown, context: string): JsonObject {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new ToolError(`${context} must be a JSON object.`);
  }

  return value as JsonObject;
}

export function getStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export function getStringRecord(value: unknown): Record<string, string> {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => typeof entry === "string",
    ),
  );
}

export function getBooleanRecord(value: unknown): Record<string, boolean> {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => typeof entry === "boolean",
    ),
  );
}

export function deduplicatePreservingOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const item of items) {
    if (seen.has(item)) {
      continue;
    }

    seen.add(item);
    ordered.push(item);
  }

  return ordered;
}

export function stripYamlString(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    trimmed[0] === trimmed.at(-1) &&
    (trimmed[0] === '"' || trimmed[0] === "'")
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function parseFrontmatter(text: string): JsonObject {
  const lines = text.split(/\r?\n/u);
  if (lines.length === 0 || lines[0].trim() !== "---") {
    throw new ToolError("Skill file is missing YAML frontmatter.");
  }

  const frontmatter: JsonObject = {};
  let currentMapping: Record<string, string> | null = null;

  for (const line of lines.slice(1)) {
    if (line.trim() === "---") {
      return frontmatter;
    }

    if (line.trim() === "") {
      continue;
    }

    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        throw new ToolError(`Invalid frontmatter line: ${line}`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      if (rawValue === "") {
        currentMapping = {};
        frontmatter[key] = currentMapping;
        continue;
      }

      frontmatter[key] = stripYamlString(rawValue);
      currentMapping = null;
      continue;
    }

    if (currentMapping === null) {
      continue;
    }

    const nestedLine = line.trim();
    const separatorIndex = nestedLine.indexOf(":");
    if (separatorIndex === -1) {
      throw new ToolError(`Invalid nested frontmatter line: ${line}`);
    }

    const nestedKey = nestedLine.slice(0, separatorIndex).trim();
    const rawValue = nestedLine.slice(separatorIndex + 1).trim();
    currentMapping[nestedKey] = stripYamlString(rawValue);
  }

  throw new ToolError("Skill file is missing the closing frontmatter delimiter.");
}

export function stripJsonc(text: string): string {
  let output = "";
  let index = 0;
  let inString = false;
  let quoteChar = "";

  while (index < text.length) {
    const currentChar = text[index];

    if (inString) {
      output += currentChar;
      if (currentChar === "\\") {
        const nextChar = text[index + 1];
        if (nextChar !== undefined) {
          output += nextChar;
          index += 2;
          continue;
        }
      } else if (currentChar === quoteChar) {
        inString = false;
      }

      index += 1;
      continue;
    }

    if (currentChar === '"' || currentChar === "'") {
      inString = true;
      quoteChar = currentChar;
      output += currentChar;
      index += 1;
      continue;
    }

    if (currentChar === "/" && text[index + 1] === "/") {
      index += 2;
      while (index < text.length && text[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (currentChar === "/" && text[index + 1] === "*") {
      index += 2;
      while (
        index + 1 < text.length &&
        !(text[index] === "*" && text[index + 1] === "/")
      ) {
        index += 1;
      }
      index += index + 1 < text.length ? 2 : 1;
      continue;
    }

    output += currentChar;
    index += 1;
  }

  return output.replace(/,\s*(?=[}\]])/gu, "");
}

export function readJsonFile<T>(targetPath: string, fallback: T): T | unknown {
  if (!pathExists(targetPath)) {
    return fallback;
  }

  const text = fs.readFileSync(targetPath, "utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return JSON.parse(stripJsonc(text)) as unknown;
  }
}

export function writeJsonFile(targetPath: string, data: JsonObject): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function writeTextFile(targetPath: string, content: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}

export function syncJsonFile(targetPath: string, data: JsonObject): void {
  if (Object.keys(data).length > 0) {
    writeJsonFile(targetPath, data);
    return;
  }

  if (pathExists(targetPath)) {
    fs.rmSync(targetPath, { force: true });
  }
}

export function createConsumerRequire(cwd = process.cwd()) {
  return createRequire(path.join(path.resolve(cwd), "__agentic_tools__.js"));
}

export function resolvePackageRoot(packageName: string, cwd = process.cwd()): string {
  const consumerRequire = createConsumerRequire(cwd);
  const candidateNames = deduplicatePreservingOrder([
    packageName,
    packageName.replaceAll("-", "_"),
  ]);

  for (const candidateName of candidateNames) {
    try {
      const packageJsonPath = consumerRequire.resolve(
        `${candidateName}/package.json`,
      );
      return path.dirname(packageJsonPath);
    } catch {
      continue;
    }
  }

  throw new ToolError(
    `Could not resolve package source '${packageName}'. Checked module names: ${candidateNames.join(", ")}.`,
  );
}

export function isDirectoryLink(targetPath: string): boolean {
  try {
    return fs.lstatSync(targetPath).isSymbolicLink();
  } catch {
    return false;
  }
}

export function resolveExistingLinkTarget(targetPath: string): string {
  if (!isDirectoryLink(targetPath)) {
    throw new ToolError(`Path '${targetPath}' is not a supported directory link.`);
  }

  return path.resolve(path.dirname(targetPath), fs.readlinkSync(targetPath));
}

export function removeDirectoryLink(targetPath: string): void {
  if (!isDirectoryLink(targetPath)) {
    throw new ToolError(`Path '${targetPath}' is not a supported directory link.`);
  }

  fs.rmSync(targetPath, { recursive: true, force: false });
}

export function createDirectoryLink(destinationPath: string, targetPath: string): void {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.symlinkSync(
    targetPath,
    destinationPath,
    process.platform === "win32" ? "junction" : "dir",
  );
}

export function toPosixPath(targetPath: string): string {
  return targetPath.split(path.sep).join("/");
}

function formatLogArg(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.message;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function createLogger(output?: OutputFn): LoggerLike {
  if (typeof output !== "function") {
    return consola;
  }

  return createConsola({
    reporters: [
      {
        log(logObject: { args: unknown[] }) {
          output(logObject.args.map((arg) => formatLogArg(arg)).join(" "));
        },
      },
    ],
  });
}

export function createExecutionOptions(options: RunOptions = {}): ExecutionOptions {
  const logger = options.logger ?? createLogger(options.output);

  return {
    cwd: options.cwd ?? process.cwd(),
    logger,
    output: options.output ?? ((message: string) => {
      logger.log(message);
    }),
  };
}