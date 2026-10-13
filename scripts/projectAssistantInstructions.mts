/**
 * Project canonical skill text into the chat-assistant instruction files.
 *
 * Every `chat-assistants/<product>/templates/<name>.template.md` holds `{{PLACEHOLDER}}` tokens that
 * stand for canonical blocks published by skills. This fills them and writes
 * `chat-assistants/<product>/<name>/instructions.md`, the file a person pastes into the product.
 *
 *     node scripts/projectAssistantInstructions.mts          # write
 *     node scripts/projectAssistantInstructions.mts --check  # verify, write nothing
 *
 * `--check` fails when a generated file no longer matches a fresh projection, which is the only
 * thing standing between a paste target and a silent fork of the persona text.
 *
 * Only templated files are projected. The short versions under `chatgpt-custom/` and
 * `duck-ai-custom/` are hand-written compressions: no canonical block fits a 500 or 1,500
 * character field.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readCanonicalBlock } from '../src/features/export/discovery.ts';

const repoRoot = path.resolve(import.meta.dirname, '..');
const skillsRoot = path.join(repoRoot, '.agents', 'skills');
const assistantsRoot = path.join(repoRoot, 'chat-assistants');
const templateSuffix = '.template.md';

/** Placeholder to the skill publishing its canonical block; named here so a rename is one line. */
const injections = {
  PERSONA: 'ref-sp-agents-mr-wolf-persona',
  VERIFICATION: 'ref-sp-agents-verification-discipline',
} as const;

/** Fill one template. Throws when a placeholder cannot be resolved. */
export const render = (
  templatePath: string,
  root: string = skillsRoot,
): string => {
  let text = fs.readFileSync(templatePath, 'utf8');
  for (const [placeholder, skillName] of Object.entries(injections)) {
    const token = `{{${placeholder}}}`;
    if (!text.includes(token)) {
      continue;
    }
    const block = readCanonicalBlock(path.join(root, skillName));
    if (block === undefined) {
      throw new Error(
        `'${skillName}' publishes no canonical block, so ${token} cannot be filled. The skill needs a ` +
          "'## Canonical ... text' heading followed by a fenced block.",
      );
    }
    text = text.replaceAll(token, block);
  }
  if (text.includes('{{')) {
    throw new Error(
      `${path.basename(templatePath)} still holds an unresolved placeholder`,
    );
  }
  return text;
};

/** `<product>/templates/<name>.template.md` -> `<product>/<name>/instructions.md`. */
export const outputPath = (templatePath: string): string =>
  path.join(
    path.dirname(path.dirname(templatePath)),
    path.basename(templatePath, templateSuffix),
    'instructions.md',
  );

const findTemplates = (): string[] =>
  fs
    .readdirSync(assistantsRoot)
    .map((product) => path.join(assistantsRoot, product, 'templates'))
    .filter(
      (directory) =>
        fs.existsSync(directory) && fs.statSync(directory).isDirectory(),
    )
    .flatMap((directory) =>
      fs
        .readdirSync(directory)
        .filter((name) => name.endsWith(templateSuffix))
        .map((name) => path.join(directory, name)),
    )
    .sort();

const main = (argv: string[]): number => {
  const check = argv.includes('--check');
  const templates = findTemplates();
  if (templates.length === 0) {
    process.stderr.write(`no templates found under ${assistantsRoot}\n`);
    return 1;
  }

  const stale: string[] = [];
  for (const templatePath of templates) {
    let rendered: string;
    try {
      rendered = render(templatePath);
    } catch (error) {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      return 1;
    }
    const destination = outputPath(templatePath);
    const relative = path
      .relative(repoRoot, destination)
      .split(path.sep)
      .join('/');
    if (check) {
      const current =
        fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8') : '';
      if (current !== rendered) {
        stale.push(relative);
        process.stderr.write(`stale: ${relative}\n`);
      }
      continue;
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, rendered, 'utf8');
    // Instruction-field limits are undocumented on these products, so report the size.
    process.stdout.write(
      `wrote ${relative} (${Array.from(rendered).length.toLocaleString('en-US')} chars)\n`,
    );
  }

  if (stale.length > 0) {
    process.stderr.write(
      `\n${stale.length} file(s) no longer match their template. Run: node scripts/projectAssistantInstructions.mts\n`,
    );
    return 1;
  }
  if (check) {
    process.stdout.write(
      `${templates.length} generated file(s) match their templates\n`,
    );
  }
  return 0;
};

// Run only when executed directly, so tests can import the helpers.
if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === import.meta.filename
) {
  process.exitCode = main(process.argv.slice(2));
}
