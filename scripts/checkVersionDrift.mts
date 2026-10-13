/**
 * Fail when a version-bearing file drifts from `VERSION`, the repo's single source of truth.
 *
 *     node scripts/checkVersionDrift.mts check
 *
 * Plugin manifests carry the version too; `agentic-tools plugin check` owns those.
 */
import fs from "node:fs";
import path from "node:path";

const versionFile = "VERSION";
const packageJsonFile = "package.json";
const pyprojectFile = "pyproject.toml";

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export const validateSemver = (version: string): string => {
  const normalized = version.trim();
  if (!semverPattern.test(normalized)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return normalized;
};

const readText = (root: string, file: string): string => fs.readFileSync(path.join(root, file), "utf8");

const readPackageJsonVersion = (root: string): string => {
  const parsed: unknown = JSON.parse(readText(root, packageJsonFile));
  const version = typeof parsed === "object" && parsed !== null ? (parsed as { version?: unknown }).version : undefined;
  if (typeof version !== "string") {
    throw new Error("package.json is missing version");
  }
  return validateSemver(version);
};

/**
 * A static `version` in pyproject's `[project]` table, if any. The Python shim normally derives its
 * version from `VERSION` at build time, so the key is usually absent and nothing can drift.
 */
const readPyprojectVersion = (root: string): string | undefined => {
  if (!fs.existsSync(path.join(root, pyprojectFile))) {
    return undefined;
  }
  const project = /^\[project\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(readText(root, pyprojectFile))?.[1] ?? "";
  const version = /^version\s*=\s*"([^"]+)"/m.exec(project)?.[1];
  return version === undefined ? undefined : validateSemver(version);
};

/** Every version-bearing surface, keyed by file. */
export const readVersionState = (root: string): Record<string, string> => {
  const state: Record<string, string> = {
    [versionFile]: validateSemver(readText(root, versionFile)),
    [packageJsonFile]: readPackageJsonVersion(root),
  };
  const pyprojectVersion = readPyprojectVersion(root);
  if (pyprojectVersion !== undefined) {
    state[pyprojectFile] = pyprojectVersion;
  }
  return state;
};

export const checkRepositoryVersion = (root: string): string => {
  const state = readVersionState(root);
  const expected = state[versionFile] as string;
  const mismatches = Object.entries(state)
    .filter(([, actual]) => actual !== expected)
    .map(([file, actual]) => `${file}=${actual}`);
  if (mismatches.length > 0) {
    throw new Error(`Version drift detected. Expected ${expected} from ${versionFile}, got ${mismatches.join(", ")}`);
  }
  return expected;
};

const main = (argv: string[]): number => {
  if (argv[0] !== "check" || argv.length !== 1) {
    process.stderr.write("Usage: node scripts/checkVersionDrift.mts check\n");
    return 2;
  }
  try {
    process.stdout.write(`${checkRepositoryVersion(path.resolve(import.meta.dirname, ".."))}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
};

// Run only when executed directly, so tests can import the helpers.
if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  process.exitCode = main(process.argv.slice(2));
}
