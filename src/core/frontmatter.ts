import { ToolError } from './errors.ts';

const delimiter = '---';
const keyPattern = /^([^:\s][^:]*):(.*)$/;

const unquote = (value: string): string => {
  const trimmed = value.trim();
  const first = trimmed[0];
  if (
    trimmed.length >= 2 &&
    (first === '"' || first === "'") &&
    trimmed.at(-1) === first
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

/**
 * Read a SKILL.md frontmatter block into a flat map. Nested keys are recorded with their parent as
 * a dotted prefix (`metadata.shareable-skills.visibility`).
 *
 * Only the shapes skills use are supported: top-level scalars and one level of nesting, which the
 * Agent Skills spec restricts `metadata` to anyway. No YAML parser is needed for that.
 */
export const parseFrontmatter = (text: string): Map<string, string> => {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== delimiter) {
    throw new ToolError('Skill file is missing YAML frontmatter.');
  }

  const fields = new Map<string, string>();
  let parent: string | undefined;
  for (const line of lines.slice(1)) {
    if (line.trim() === delimiter) {
      return fields;
    }
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      continue;
    }

    const indented = line[0] === ' ' || line[0] === '\t';
    const match = keyPattern.exec(line.trim());
    if (match === null) {
      if (!indented) {
        throw new ToolError(`Invalid frontmatter line: ${line}`);
      }
      continue;
    }

    const [, rawKey = '', rawValue = ''] = match;
    const key = rawKey.trim();
    const value = unquote(rawValue);
    if (!indented) {
      parent = value === '' ? key : undefined;
      if (value !== '') {
        fields.set(key, value);
      }
      continue;
    }
    if (parent !== undefined && value !== '') {
      fields.set(`${parent}.${key}`, value);
    }
  }

  throw new ToolError(
    'Skill file is missing the closing frontmatter delimiter.',
  );
};

/** The body after the frontmatter block, or the whole text when there is none. */
export const stripFrontmatter = (text: string): string => {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);
  return match === null ? text : text.slice(match[0].length);
};
