/**
 * Run the same commands under Node and Bun and fail on any difference in stdout, stderr, or exit
 * code. Everything that runs here, the CLI, repo scripts, and skill scripts, must behave the same on
 * both runtimes.
 *
 *     node scripts/checkRuntimeParity.mts [--bun <path>]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type Run = { stdout: string; stderr: string; status: number | null };

const skillScript = (skill: string, script: string): string =>
  `.agents/skills/${skill}/scripts/${script}.mts`;

/**
 * Deterministic commands only: each must give the same output on every run on one machine. Commands
 * that read host state (models, sessions) appear as `--help`.
 */
export const parityCommands: readonly (readonly [string, ...string[]])[] = [
  ['src/core/cli.mts', '--help'],
  ['src/core/cli.mts', 'skills', 'link', '--help'],
  ['src/core/cli.mts', 'skills', 'list'],
  ['src/core/cli.mts', 'skills', 'list', '--bogus'],
  ['src/core/cli.mts', 'nope'],
  ['src/core/cli.mts', 'policy'],
  ['src/core/cli.mts', 'policy', 'check'],
  ['src/core/cli.mts', 'plugin', 'check'],
  [
    'src/core/cli.mts',
    'export',
    'build',
    '--dry-run',
    '--preset',
    'everything',
    '--exclude',
    'ref-sp-web-seo',
    '--exclude=ref-sp-web-seo-ai',
  ],
  ['scripts/checkVersionDrift.mts', 'check'],
  ['scripts/projectAssistantInstructions.mts', '--check'],
  [
    skillScript('ref-sp-agents-skills-authoring', 'validate-skill'),
    '.agents/skills',
    '--all',
  ],
  [
    skillScript('ref-sp-agents-shareable-skills', 'validate-sharing'),
    '.agents/skills',
    '--all',
  ],
  [
    skillScript('ref-sp-agents-shareable-skills', 'check-vendored-drift'),
    '.agents/skills',
  ],
  [skillScript('tool-sp-setup-agent-repo', 'audit-agent-repo'), '--repo', '.'],
  [skillScript('tool-sp-setup-local-agents', 'audit-local-setup'), '--help'],
  [skillScript('ref-sp-agents-local-setup', 'local-model-fit'), '--help'],
  [
    skillScript('ref-sp-agents-skills-authoring', 'aggregate-eval-results'),
    '--help',
  ],
  [skillScript('tool-sp-recover-sessions', 'find-sessions'), '--help'],
];

/**
 * Commands that read a workspace by convention rather than by argument. They run from a fixture
 * directory, with the script path resolved from the repo root.
 */
export const fixtureCommands: readonly (readonly [string, ...string[]])[] = [
  ['.agents/skills/ref-sp-agents-local-tasks/assets/next-todo.mts'],
];

/** The first way two runs differ, or undefined when they match. */
export const describeDifference = (node: Run, bun: Run): string | undefined => {
  if (node.status !== bun.status) {
    return `exit code: node ${String(node.status)}, bun ${String(bun.status)}`;
  }
  for (const stream of ['stdout', 'stderr'] as const) {
    if (node[stream] !== bun[stream]) {
      return `${stream} differs:\n--- node\n${node[stream]}\n--- bun\n${bun[stream]}`;
    }
  }
  return undefined;
};

const run = (runtime: string, args: readonly string[], cwd: string): Run => {
  const result = spawnSync(runtime, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
};

const writeFixtureWorkspace = (directory: string): void => {
  const tasks = path.join(directory, '.agents', 'tasks');
  fs.mkdirSync(tasks, { recursive: true });
  fs.writeFileSync(
    path.join(tasks, 'TODO.md'),
    '# TODO\n\n- [x] done item\n- [ ] first open item\n- [ ] second open item\n',
    'utf8',
  );
};

const main = (argv: string[]): number => {
  const bunFlag = argv.indexOf('--bun');
  const bun = bunFlag === -1 ? 'bun' : argv[bunFlag + 1];
  if (bun === undefined) {
    process.stderr.write(
      'Usage: node scripts/checkRuntimeParity.mts [--bun <path>]\n',
    );
    return 2;
  }
  if (spawnSync(bun, ['--version']).error !== undefined) {
    process.stderr.write(
      `Bun not found at '${bun}'. Install Bun or pass --bun <path>.\n`,
    );
    return 2;
  }

  const root = path.resolve(import.meta.dirname, '..');
  const fixtures = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-parity-'));
  writeFixtureWorkspace(fixtures);
  const runs = [
    ...parityCommands.map((command) => ({ args: command, cwd: root })),
    ...fixtureCommands.map(([script, ...rest]) => ({
      args: [path.join(root, script), ...rest],
      cwd: fixtures,
    })),
  ];
  let failures = 0;
  try {
    for (const { args, cwd } of runs) {
      const difference = describeDifference(
        run(process.execPath, args, cwd),
        run(bun, args, cwd),
      );
      const label = args.join(' ').replaceAll(`${root}/`, '');
      if (difference === undefined) {
        process.stdout.write(`same  ${label}\n`);
      } else {
        failures += 1;
        process.stdout.write(`DIFF  ${label}\n${difference}\n`);
      }
    }
  } finally {
    fs.rmSync(fixtures, { recursive: true, force: true });
  }
  process.stdout.write(
    `\n${String(runs.length - failures)} of ${String(runs.length)} commands match on Node and Bun\n`,
  );
  return failures === 0 ? 0 : 1;
};

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === import.meta.filename
) {
  process.exitCode = main(process.argv.slice(2));
}
