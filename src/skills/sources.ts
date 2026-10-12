import fs from "node:fs";
import path from "node:path";
import { ToolError } from "../core/errors.ts";
import { isDirectory, isFile } from "../core/fs.ts";
import { isJsonObject } from "../core/json.ts";
import { agentsPaths, resolveUserPath } from "../core/paths.ts";
import { configBaseRoot } from "./config.ts";

const packageSourcePrefix = "package:";

/** Names this package answers to: its npm name and the Python shim's distribution and module. */
const selfNames = (packageName: string): string[] => [packageName, packageName.replaceAll("-", "_")];

const readPackageName = (packageJson: string): string | undefined => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(packageJson, "utf8"));
    return isJsonObject(parsed) && typeof parsed["name"] === "string" ? parsed["name"] : undefined;
  } catch {
    return undefined;
  }
};

/** The root of the installed agentic-tools package: the nearest `package.json` above this module. */
export const findOwnPackageRoot = (start: string = import.meta.dirname): string => {
  let current = start;
  for (;;) {
    if (isFile(path.join(current, "package.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new ToolError(`Could not locate the agentic-tools package root from ${start}.`);
    }
    current = parent;
  }
};

const hasSkills = (packageRoot: string): boolean => isDirectory(path.join(packageRoot, agentsPaths.skills));

/**
 * Find an installed package's root: `node_modules/<name>` in the config's repo or any parent, the
 * way Node resolves it, and then this package itself, which covers running through the Python
 * shim where nothing is under `node_modules`.
 */
export const resolvePackageSourceRoot = (packageName: string, fromDirectory: string, ownRoot: string): string => {
  let current = path.resolve(fromDirectory);
  for (;;) {
    const candidate = path.join(current, "node_modules", packageName);
    if (hasSkills(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  const ownName = readPackageName(path.join(ownRoot, "package.json"));
  if (ownName !== undefined && selfNames(ownName).includes(packageName) && hasSkills(ownRoot)) {
    return ownRoot;
  }

  throw new ToolError(
    `Could not resolve package source '${packageName}'. Checked node_modules/${packageName} above ${fromDirectory}` +
      ` and the running agentic-tools package.`,
  );
};

/** Resolve one `sources[].from`: a `package:<name>` or a path relative to the config's repo. */
export const resolveConfiguredSourceRoot = (options: {
  source: string;
  configPath: string;
  home: string;
  ownRoot: string;
}): string => {
  const base = configBaseRoot(options.configPath);
  if (options.source.startsWith(packageSourcePrefix)) {
    const packageName = options.source.slice(packageSourcePrefix.length).trim();
    if (packageName === "") {
      throw new ToolError("Package skill sources must include a package name after 'package:'.");
    }
    return resolvePackageSourceRoot(packageName, base, options.ownRoot);
  }
  return resolveUserPath(options.source, base, options.home);
};
