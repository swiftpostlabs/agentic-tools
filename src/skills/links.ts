import fs from "node:fs";
import path from "node:path";
import { ToolError } from "../core/errors.ts";
import { errorMessage } from "../core/json.ts";

/** A symlink, or on Windows a directory junction; Node reports both as symbolic links. */
export const isDirectoryLink = (target: string): boolean => {
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
};

/** Resolve through every existing component, like Python's `Path.resolve(strict=False)`. */
export const resolveLoose = (target: string): string => {
  const absolute = path.resolve(target);
  try {
    return fs.realpathSync(absolute);
  } catch {
    const parent = path.dirname(absolute);
    return parent === absolute ? absolute : path.join(resolveLoose(parent), path.basename(absolute));
  }
};

export const resolveLinkTarget = (link: string): string => {
  if (!isDirectoryLink(link)) {
    throw new ToolError(`Path '${link}' is not a supported directory link.`);
  }
  return resolveLoose(path.resolve(path.dirname(link), fs.readlinkSync(link)));
};

export const removeDirectoryLink = (link: string): void => {
  if (!isDirectoryLink(link)) {
    throw new ToolError(`Path '${link}' is not a supported directory link.`);
  }
  try {
    fs.unlinkSync(link);
  } catch {
    // Windows removes directory symlinks and junctions with rmdir, not unlink.
    fs.rmdirSync(link);
  }
};

const isPermissionError = (error: unknown): boolean =>
  error instanceof Error && "code" in error && (error.code === "EPERM" || error.code === "EACCES");

/**
 * Create a directory symlink. Windows without symlink privileges gets a junction instead, which
 * needs no elevation and behaves the same for a local directory target.
 */
export const createDirectoryLink = (destination: string, target: string): void => {
  try {
    fs.symlinkSync(target, destination, "dir");
  } catch (error) {
    if (process.platform === "win32" && isPermissionError(error)) {
      try {
        fs.symlinkSync(target, destination, "junction");
        return;
      } catch (junctionError) {
        throw new ToolError(
          `Could not create directory junction '${destination}' -> '${target}': ${errorMessage(junctionError)}`,
        );
      }
    }
    throw new ToolError(`Could not create symlink '${destination}' -> '${target}': ${errorMessage(error)}`);
  }
};
