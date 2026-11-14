#!/usr/bin/env node
/**
 * List the agent-repo migrations a repo has not applied yet, or record one as applied.
 *
 * Migrations are the numbered files in this skill's references/migrations/. The last applied number
 * lives in <repo>/.agents/local/migrations.json, which is machine-local and gitignored.
 *
 *     node pending-migrations.mts [--repo DIR]                     list pending migrations
 *     node pending-migrations.mts [--repo DIR] --record NNNN [--note TEXT]
 *
 * Listing is read-only. Exit status: 0 on success, 2 on a usage or environment error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

export type Migration = { number: string; title: string; file: string };
/** The last migration applied, when, and any note each migration asked to keep. */
export type Record = {
  applied: string;
  at: string;
  notes?: { [migration: string]: string };
};

const usage = `Usage: node pending-migrations.mts [--repo DIR] [--record NNNN [--note TEXT]]

  --repo DIR     Repository root. Defaults to the current directory.
  --record NNNN  Record migration NNNN as applied. It must be the next pending one.
  --note TEXT    A note kept with that migration's record, such as links-left.`;

const migrationsDir = path.join(
  import.meta.dirname,
  '..',
  'references',
  'migrations',
);

const recordPath = (repo: string): string =>
  path.join(repo, '.agents', 'local', 'migrations.json');

/** Every migration in this skill, oldest first, titled by its first heading. */
export const listMigrations = (directory = migrationsDir): Migration[] =>
  fs
    .readdirSync(directory)
    .filter((file) => /^\d{4}-.+\.md$/.test(file))
    .sort()
    .map((file) => {
      const text = fs.readFileSync(path.join(directory, file), 'utf8');
      const heading = /^# (.+)$/m.exec(text)?.[1] ?? file;
      return { number: file.slice(0, 4), title: heading, file };
    });

/** The repo's record, or undefined when it has none. */
export const readRecord = (repo: string): Record | undefined => {
  const file = recordPath(repo);
  if (!fs.existsSync(file)) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`${file} cannot be read as JSON; fix or delete it.`);
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('applied' in parsed) ||
    typeof parsed.applied !== 'string' ||
    !/^\d{4}$/.test(parsed.applied)
  ) {
    throw new Error(
      `${file} must hold {"applied": "NNNN", ...}; fix or delete it.`,
    );
  }
  const record = parsed as Record & { note?: unknown };
  // An early record kept one `note` for the migration it named; keep it under that number.
  if (typeof record.note === 'string' && record.notes === undefined) {
    const { note, ...rest } = record;
    return { ...rest, notes: { [record.applied]: note } };
  }
  return record;
};

export const pendingMigrations = (
  migrations: readonly Migration[],
  record: Record | undefined,
): Migration[] =>
  migrations.filter(
    (migration) => record === undefined || migration.number > record.applied,
  );

const main = (argv: string[]): number => {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        repo: { type: 'string', default: '.' },
        record: { type: 'string' },
        note: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
    }));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n${usage}\n`);
    return 2;
  }
  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return 0;
  }
  const repo = path.resolve(values.repo);
  if (
    !fs
      .statSync(path.join(repo, '.agents'), { throwIfNoEntry: false })
      ?.isDirectory()
  ) {
    process.stderr.write(`no .agents folder in ${repo}\n`);
    return 2;
  }
  const migrations = listMigrations();

  let current;
  try {
    current = readRecord(repo);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 2;
  }
  const pending = pendingMigrations(migrations, current);

  if (values.record !== undefined) {
    if (!migrations.some((migration) => migration.number === values.record)) {
      process.stderr.write(`no migration numbered '${values.record}'\n`);
      return 2;
    }
    // Migrations apply oldest first, so a skipped one would never be listed again.
    const next = pending[0]?.number;
    if (values.record !== next) {
      process.stderr.write(
        next === undefined ?
          `every migration is already recorded; nothing to record\n`
        : `the next migration to record is ${next}, not ${values.record}\n`,
      );
      return 2;
    }
    const notes = {
      ...current?.notes,
      ...(values.note === undefined ? {} : { [values.record]: values.note }),
    };
    const record: Record = {
      applied: values.record,
      at: new Date().toISOString(),
      ...(Object.keys(notes).length === 0 ? {} : { notes }),
    };
    fs.mkdirSync(path.dirname(recordPath(repo)), { recursive: true });
    fs.writeFileSync(recordPath(repo), `${JSON.stringify(record, null, 2)}\n`);
    process.stdout.write(`recorded ${values.record} as applied\n`);
    return 0;
  }

  const newest = migrations.at(-1)?.number;
  if (
    current !== undefined &&
    newest !== undefined &&
    current.applied > newest
  ) {
    process.stderr.write(
      `the record says ${current.applied}, newer than this skill's last migration (${newest}); update the skill\n`,
    );
    return 2;
  }
  if (values.note !== undefined && values.record === undefined) {
    process.stderr.write(`--note needs --record\n${usage}\n`);
    return 2;
  }
  for (const migration of pending) {
    process.stdout.write(
      `${migration.number}  ${migration.title}  references/migrations/${migration.file}\n`,
    );
  }
  return 0;
};

// Real paths on both sides: run through a symlinked or junctioned skills folder, argv[1] keeps
// the link path while import.meta.filename is already resolved.
const isEntryPoint = (): boolean => {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  try {
    return fs.realpathSync(entry) === fs.realpathSync(import.meta.filename);
  } catch {
    return false;
  }
};

if (isEntryPoint()) {
  process.exitCode = main(process.argv.slice(2));
}
