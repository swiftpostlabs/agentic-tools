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
import { pathToFileURL } from 'node:url';

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
  ['src/core/cli.mts', 'skills', 'list', '--from'],
  ['src/core/cli.mts', 'skills', 'list', 'extra'],
  ['src/core/cli.mts', 'skills', 'list', '-from'],
  ['src/core/cli.mts', 'skills', 'list', '-help'],
  ['src/core/cli.mts', 'skills', 'sync', '-xg'],
  ['src/core/cli.mts', 'skills', 'sync', '--force=false'],
  ['src/core/cli.mts', 'export', 'build', '--exclude', '--dry-run'],
  ['src/core/cli.mts', '--bogus', 'skills', 'list'],
  ['src/core/cli.mts', '-w'],
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
  [skillScript('tool-sp-migrate-agent-repo', 'pending-migrations'), '--help'],
  [skillScript('tool-sp-start-agents-collaboration', 'board'), '--help'],
];

/**
 * Commands that read a workspace by convention rather than by argument. They run from a fixture
 * directory, with the script path resolved from the repo root.
 */
export const fixtureCommands: readonly (readonly [string, ...string[]])[] = [
  ['src/core/cli.mts', 'policy', 'sync'],
  ['.agents/skills/ref-sp-agents-local-tasks/assets/next-todo.mts'],
  [
    skillScript('tool-sp-start-agents-collaboration', 'board'),
    'room',
    'link',
    '--room',
    'demo',
    '--task',
    '2026-01-02-demo',
  ],
  [
    skillScript('tool-sp-start-agents-collaboration', 'board'),
    'room',
    'join',
    '--room',
    'demo',
    '--me',
    'abc123',
  ],
  [skillScript('tool-sp-start-agents-collaboration', 'board'), 'render'],
  // Against the fixture's file:// git source, already pinned and exported: no network.
  ['src/core/cli.mts', 'skills', 'sync', '--dry-run'],
  ['src/core/cli.mts', 'skills', 'sync', '--locked'],
  [skillScript('tool-sp-start-agents-collaboration', 'board'), 'room', 'list'],
  [
    skillScript('tool-sp-start-agents-collaboration', 'board'),
    'unread',
    '--me',
    'def456',
    '--since',
    '2026-01-01T00:00:00Z',
  ],
  [
    skillScript('tool-sp-start-agents-collaboration', 'board'),
    'post',
    '--from',
    'acme / demo / abc123',
    '--to',
    'all',
    '--body',
    'Hi',
  ],
  [
    skillScript('tool-sp-start-agents-collaboration', 'board'),
    'post',
    '--room',
    'demo',
    '--from',
    String.raw`acme / demo / ..\..\CLAUDE`,
    '--to',
    'all',
    '--body',
    'Hi',
  ],
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

const gitSourceDirectory = 'git-source';

/** A one-skill git repo the fixture's config syncs from, built with the machine's config ignored. */
const writeGitSource = (directory: string): void => {
  const source = path.join(directory, gitSourceDirectory);
  const skill = path.join(source, '.agents', 'skills', 'ref-demo-base');
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(
    path.join(skill, 'SKILL.md'),
    '---\nname: ref-demo-base\ndescription: "A demo skill. Use in parity checks."\nlicense: MIT\n' +
      'metadata:\n  shareable-skills.domain: "dev"\n  shareable-skills.visibility: "public"\n---\n\n# Demo\n',
    'utf8',
  );
  const emptyConfig = path.join(directory, 'empty-gitconfig');
  fs.writeFileSync(emptyConfig, '', 'utf8');
  const environment = {
    ...process.env,
    GIT_CONFIG_GLOBAL: emptyConfig,
    GIT_CONFIG_NOSYSTEM: '1',
  };
  for (const args of [
    ['init', '--quiet', '--initial-branch', 'main'],
    ['add', '.'],
    [
      '-c',
      'user.name=Parity',
      '-c',
      'user.email=parity@example.com',
      'commit',
      '--quiet',
      '-m',
      'demo',
    ],
  ]) {
    const result = spawnSync('git', args, {
      cwd: source,
      env: environment,
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    }
  }
  fs.writeFileSync(
    path.join(directory, '.agents', 'config.json'),
    `${JSON.stringify(
      {
        skills: {
          sources: [
            {
              from: `git:${pathToFileURL(source).href}`,
              skills: ['ref-demo-base'],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
};

const writeFixtureWorkspace = (directory: string): void => {
  // A hand-added deny rule, so `policy sync` takes its stop path without writing anything.
  const agents = path.join(directory, '.agents');
  fs.mkdirSync(path.join(directory, '.claude'), { recursive: true });
  fs.mkdirSync(agents, { recursive: true });
  const writeJsonFile = (target: string, value: unknown): void => {
    fs.writeFileSync(target, `${JSON.stringify(value)}\n`, 'utf8');
  };
  writeJsonFile(path.join(agents, 'config.json'), {
    policy: { services: ['claude'], protectedFiles: ['.env'] },
  });
  writeJsonFile(path.join(agents, 'policy.lock.json'), {
    version: 1,
    claude: { deny: ['Read(.env)'] },
    vscode: {},
    aiexclude: null,
  });
  writeJsonFile(path.join(directory, '.claude', 'settings.json'), {
    permissions: { deny: ['Read(.env)', 'Read(./mine)'] },
  });
  const tasks = path.join(directory, '.agents', 'local', 'tasks');
  fs.mkdirSync(tasks, { recursive: true });
  fs.writeFileSync(
    path.join(tasks, 'TODO.md'),
    '# TODO\n\n- [x] done item\n- [ ] first open item\n- [ ] second open item\n',
    'utf8',
  );
  const room = path.join(
    directory,
    '.agents',
    'local',
    'collaboration',
    'rooms',
    '2026-01-02-demo',
  );
  fs.mkdirSync(path.join(room, 'messages'), { recursive: true });
  fs.writeFileSync(
    path.join(room, 'README.md'),
    '---\ntitle: Demo\nstatus: open\ntask: 2026-01-02-demo\nmembers: abc123, def456\n---\n\n# Demo\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(room, 'messages', '2026-01-02T030405678Z-abc123.md'),
    '---\nfrom: acme / demo / abc123\nto: all\nsent: 2026-01-02T03:04:05.678Z\n---\n\nHello members.\n',
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
  writeGitSource(fixtures);
  // Both runtimes share this bare-clone store, so the setup sync below pins and exports once.
  process.env['AGENTIC_TOOLS_HOME'] = path.join(fixtures, 'tools-home');
  const setup = run(
    process.execPath,
    [path.join(root, 'src/core/cli.mts'), 'skills', 'sync'],
    fixtures,
  );
  if (setup.status !== 0) {
    process.stderr.write(`Fixture skills sync failed:\n${setup.stderr}`);
    fs.rmSync(fixtures, { recursive: true, force: true });
    return 2;
  }
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
