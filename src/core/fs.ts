import fs from 'node:fs';
import path from 'node:path';

export const isFile = (target: string): boolean => {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
};

export const isDirectory = (target: string): boolean => {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
};

/** True when something exists at `target`, following links. A dangling link is false. */
export const exists = (target: string): boolean => fs.existsSync(target);

export const readTextOrUndefined = (target: string): string | undefined =>
  isFile(target) ? fs.readFileSync(target, 'utf8') : undefined;

export const writeText = (target: string, content: string): void => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
};

/** Write `content`, or delete the file when there is nothing to write. */
export const writeOrRemove = (
  target: string,
  content: string | undefined,
): boolean => {
  if (content !== undefined) {
    writeText(target, content);
    return true;
  }
  fs.rmSync(target, { force: true });
  return false;
};

/** Directory entries sorted by name, so output does not depend on filesystem order. */
export const listSorted = (directory: string): string[] =>
  fs.readdirSync(directory).sort((left, right) =>
    left < right ? -1
    : left > right ? 1
    : 0,
  );
