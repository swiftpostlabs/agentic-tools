// @ts-check
import { consola, createConsola } from "consola";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

/** @typedef {Record<string, unknown>} JsonObject */
/** @typedef {(message: string) => void} OutputFn */
/** @typedef {{ log: (...args: unknown[]) => void, error: (...args: unknown[]) => void }} LoggerLike */
/** @typedef {{ cwd?: string, output?: OutputFn, logger?: LoggerLike }} RunOptions */
/** @typedef {{ cwd: string, output: OutputFn, logger: LoggerLike }} ExecutionOptions */

export class ToolError extends Error {}

export const DEFAULT_GLOBAL_SKILLS_DIR = path.join(
  os.homedir(),
  ".agents",
  "skills",
);
export const PACKAGE_SOURCE_PREFIX = "package:";
export const SYNC_CONFIG_FILENAME = "skills.json";

/**
 * @param {string | null | undefined} rawPath
 * @param {string} [cwd]
 * @returns {string}
 */
export function resolvePath(rawPath, cwd = process.cwd()) {
  return path.resolve(cwd, rawPath ?? ".");
}

/**
 * @param {string} targetPath
 * @returns {boolean}
 */
export function pathExists(targetPath) {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} targetPath
 * @returns {boolean}
 */
export function isDirectory(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * @param {string} targetPath
 * @returns {boolean}
 */
export function isFile(targetPath) {
  try {
    return fs.statSync(targetPath).isFile();
  } catch {
    return false;
  }
}

/**
 * @param {unknown} value
 * @param {string} context
 * @returns {JsonObject}
 */
export function ensureJsonObject(value, context) {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new ToolError(`${context} must be a JSON object.`);
  }

  return /** @type {JsonObject} */ (value);
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function getStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry) => typeof entry === "string");
}

/**
 * @param {unknown} value
 * @returns {Record<string, string>}
 */
export function getStringRecord(value) {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === "string"),
  );
}

/**
 * @param {unknown} value
 * @returns {Record<string, boolean>}
 */
export function getBooleanRecord(value) {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === "boolean"),
  );
}

/**
 * @param {string[]} items
 * @returns {string[]}
 */
export function deduplicatePreservingOrder(items) {
  const seen = new Set();
  /** @type {string[]} */
  const ordered = [];

  for (const item of items) {
    if (seen.has(item)) {
      continue;
    }

    seen.add(item);
    ordered.push(item);
  }

  return ordered;
}

/**
 * @param {string} value
 * @returns {string}
 */
export function stripYamlString(value) {
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

/**
 * @param {string} text
 * @returns {JsonObject}
 */
export function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/u);
  if (lines.length === 0 || lines[0].trim() !== "---") {
    throw new ToolError("Skill file is missing YAML frontmatter.");
  }

  /** @type {JsonObject} */
  const frontmatter = {};
  /** @type {Record<string, string> | null} */
  let currentMapping = null;

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

/**
 * @param {string} text
 * @returns {string}
 */
export function stripJsonc(text) {
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

/**
 * @template T
 * @param {string} targetPath
 * @param {T} fallback
 * @returns {T | unknown}
 */
export function readJsonFile(targetPath, fallback) {
  if (!pathExists(targetPath)) {
    return fallback;
  }

  const text = fs.readFileSync(targetPath, "utf8");
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(stripJsonc(text));
  }
}

/**
 * @param {string} targetPath
 * @param {JsonObject} data
 * @returns {void}
 */
export function writeJsonFile(targetPath, data) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/**
 * @param {string} targetPath
 * @param {string} content
 * @returns {void}
 */
export function writeTextFile(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}

/**
 * @param {string} targetPath
 * @param {JsonObject} data
 * @returns {void}
 */
export function syncJsonFile(targetPath, data) {
  if (Object.keys(data).length > 0) {
    writeJsonFile(targetPath, data);
    return;
  }

  if (pathExists(targetPath)) {
    fs.rmSync(targetPath, { force: true });
  }
}

/**
 * @param {string} [cwd]
 */
export function createConsumerRequire(cwd = process.cwd()) {
  return createRequire(path.join(path.resolve(cwd), "__agentic_tools__.js"));
}

/**
 * @param {string} packageName
 * @param {string} [cwd]
 * @returns {string}
 */
export function resolvePackageRoot(packageName, cwd = process.cwd()) {
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

/**
 * @param {string} targetPath
 * @returns {boolean}
 */
export function isDirectoryLink(targetPath) {
  try {
    return fs.lstatSync(targetPath).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * @param {string} targetPath
 * @returns {string}
 */
export function resolveExistingLinkTarget(targetPath) {
  if (!isDirectoryLink(targetPath)) {
    throw new ToolError(`Path '${targetPath}' is not a supported directory link.`);
  }

  return path.resolve(path.dirname(targetPath), fs.readlinkSync(targetPath));
}

/**
 * @param {string} targetPath
 * @returns {void}
 */
export function removeDirectoryLink(targetPath) {
  if (!isDirectoryLink(targetPath)) {
    throw new ToolError(`Path '${targetPath}' is not a supported directory link.`);
  }

  fs.rmSync(targetPath, { recursive: true, force: false });
}

/**
 * @param {string} destinationPath
 * @param {string} targetPath
 * @returns {void}
 */
export function createDirectoryLink(destinationPath, targetPath) {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.symlinkSync(
    targetPath,
    destinationPath,
    process.platform === "win32" ? "junction" : "dir",
  );
}

/**
 * @param {string} targetPath
 * @returns {string}
 */
export function toPosixPath(targetPath) {
  return targetPath.split(path.sep).join("/");
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatLogArg(value) {
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

/**
 * @param {OutputFn} [output]
 * @returns {LoggerLike}
 */
export function createLogger(output) {
  if (typeof output !== "function") {
    return consola;
  }

  return createConsola({
    reporters: [
      {
        /** @param {{ args: unknown[] }} logObject */
        log(logObject) {
          output(logObject.args.map((arg) => formatLogArg(arg)).join(" "));
        },
      },
    ],
  });
}

/**
 * @param {RunOptions} [options]
 * @returns {ExecutionOptions}
 */
export function createExecutionOptions(options = {}) {
  const logger = options.logger ?? createLogger(options.output);
  /** @type {OutputFn} */
  const output =
    options.output ??
    ((message) => {
      logger.log(message);
    });

  return {
    cwd: options.cwd ?? process.cwd(),
    logger,
    output,
  };
}
