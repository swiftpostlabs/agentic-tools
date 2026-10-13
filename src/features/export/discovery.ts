/**
 * Read skills off disk and flatten each into one document. A skill's `SKILL.md` assumes an agent
 * that can load `references/` on instruction; a chat assistant cannot, so references are inlined and
 * the directives that pointed at them are dropped or rewritten.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../../core/frontmatter.ts';
import { isDirectory, isFile, listSorted } from '../../core/fs.ts';
import type { SkillDocument } from './models.ts';

const frontmatterBlock = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
const loadDirective =
  /^\s*[-*]?\s*(?:\*\*)?(?:Load|Read|Use)\b[^\n]*`\.\/(?:references|scripts|assets|evals)\/[^\n]*$/i;
const inlineDirective =
  /(?:Load|Read|See|Use)\s+`\.\/references\/([a-z0-9-]+)\.md`/gi;
const skillPath =
  /`?\.agents\/skills\/((?:ref|tool)-[a-z0-9-]+)(?:\/(?:SKILL\.md|references\/[a-z0-9-]+\.md))?`?/g;
const heading = /^(#{1,6})\s/gm;
const canonicalBlock =
  /^##\s+Canonical[^\n]*\n[\s\S]*?^```(?:md|markdown)?\r?\n([\s\S]*?)^```/im;

/** "api-tokens" -> "Api tokens", matching Python's `str.capitalize`. */
const titleFromStem = (stem: string): string => {
  const words = stem.replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
};

const readFields = (text: string): Map<string, string> => {
  try {
    return parseFrontmatter(text);
  } catch {
    return new Map();
  }
};

/**
 * Remove the frontmatter and the scaffolding that only means something to an agent. Standalone
 * load-directives are dropped; directives inside a sentence are rewritten to a section pointer,
 * because the reference they name is inlined further down.
 */
export const stripBody = (text: string): string => {
  const body = text.replace(frontmatterBlock, '');
  const kept = body.split(/\r?\n/).filter((line) => !loadDirective.test(line));
  const rewritten = kept
    .join('\n')
    .replace(
      inlineDirective,
      (_match, stem: string) =>
        `see the "${titleFromStem(stem)}" section below`,
    );
  return rewritten.replace(skillPath, '`$1`').trim();
};

/** Push headings down so an inlined reference nests under its skill. */
export const demoteHeadings = (text: string, levels = 1): string =>
  text.replace(
    heading,
    (_match, hashes: string) =>
      `${'#'.repeat(Math.min(hashes.length + levels, 6))} `,
  );

/** One document from a skill folder, or `undefined` when it has no `SKILL.md`. */
export const flattenSkill = (
  skillDirectory: string,
): SkillDocument | undefined => {
  const manifest = path.join(skillDirectory, 'SKILL.md');
  if (!isFile(manifest)) {
    return undefined;
  }
  const raw = fs.readFileSync(manifest, 'utf8');
  const fields = readFields(raw);

  const sections = [stripBody(raw)];
  const references = path.join(skillDirectory, 'references');
  if (isDirectory(references)) {
    for (const file of listSorted(references).filter((name) =>
      name.endsWith('.md'),
    )) {
      const content = demoteHeadings(
        stripBody(fs.readFileSync(path.join(references, file), 'utf8')),
      );
      sections.push(
        `## ${titleFromStem(path.basename(file, '.md'))}\n\n${content}`,
      );
    }
  }

  return {
    name: fields.get('name') ?? path.basename(skillDirectory),
    domain: fields.get('metadata.shareable-skills.domain') ?? 'unknown',
    visibility:
      fields.get('metadata.shareable-skills.visibility') ?? 'repo-local',
    description: fields.get('description') ?? '',
    body: sections.filter((section) => section !== '').join('\n\n'),
  };
};

/**
 * A skill's canonical projection block, if it publishes one: text that an always-loaded instruction
 * file inlines verbatim (a persona, a discipline), under a `## Canonical ... text` heading followed
 * by a fenced block. The tool projects this text and never edits it; anything that reads wrong for a
 * destination is a defect to fix in the skill.
 */
export const readCanonicalBlock = (
  skillDirectory: string,
): string | undefined => {
  const manifest = path.join(skillDirectory, 'SKILL.md');
  if (!isFile(manifest)) {
    return undefined;
  }
  return canonicalBlock.exec(fs.readFileSync(manifest, 'utf8'))?.[1]?.trim();
};

/** Flatten every skill under `skillsRoot`, sorted by name for stable output. */
export const discoverSkills = (skillsRoot: string): SkillDocument[] => {
  if (!isDirectory(skillsRoot)) {
    return [];
  }
  return listSorted(skillsRoot)
    .map((name) => path.join(skillsRoot, name))
    .filter(isDirectory)
    .map(flattenSkill)
    .filter((document) => document !== undefined);
};
