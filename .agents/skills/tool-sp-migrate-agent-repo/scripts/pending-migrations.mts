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
export type Record = { applied: string; at: string; note?: string };

const usage = `Usage: node pending-migrations.mts [--repo DIR] [--record NNNN [--note TEXT]]

  --repo DIR     Repository root. Defaults to the current directory.
  --record NNNN  Record migration NNNN as the last one applied.
  --note TEXT    A note saved with the record, such as links-left.`;

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
  const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
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
  return parsed as Record;
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
  if (!fs.existsSync(path.join(repo, '.agents'))) {
    process.stderr.write(`no .agents folder in ${repo}\n`);
    return 2;
  }
  const migrations = listMigrations();

  if (values.record !== undefined) {
    if (!migrations.some((migration) => migration.number === values.record)) {
      process.stderr.write(`no migration numbered '${values.record}'\n`);
      return 2;
    }
    const record: Record = {
      applied: values.record,
      at: new Date().toISOString(),
      ...(values.note === undefined ? {} : { note: values.note }),
    };
    fs.mkdirSync(path.dirname(recordPath(repo)), { recursive: true });
    fs.writeFileSync(recordPath(repo), `${JSON.stringify(record, null, 2)}\n`);
    process.stdout.write(`recorded ${values.record} as applied\n`);
    return 0;
  }

  let record;
  try {
    record = readRecord(repo);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 2;
  }
  for (const migration of pendingMigrations(migrations, record)) {
    process.stdout.write(
      `${migration.number}  ${migration.title}  references/migrations/${migration.file}\n`,
    );
  }
  return 0;
};

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === import.meta.filename
) {
  process.exitCode = main(process.argv.slice(2));
}
