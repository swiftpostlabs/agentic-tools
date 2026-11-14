#!/usr/bin/env node
/**
 * Audit a repository against the shared agent baseline in one pass.
 *
 * Detects the local agent workspaces, the skills root and how it is materialized, the instruction
 * files (root and nested AGENTS.md, leftover bridge files), which agent clients the repo shows
 * traces of, whether .gitattributes fixes line endings, and which stack markers imply extra
 * skills. Reports findings as check IDs so the calling skill can map each one to a fix.
 *
 * Detection only: this script never writes to the audited repo.
 *
 *     node audit-agent-repo.mts [--repo PATH] [--json] [--only ID[,ID...]]
 *
 * Exit status: 0 when no check failed, 1 when at least one check failed, 2 on a usage or
 * environment error. Warnings alone do not change the exit status.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

type Status = 'pass' | 'warn' | 'fail' | 'info';
type Finding = {
  check: string;
  status: Status;
  message: string;
  detail: string[];
};

const finding = (
  check: string,
  status: Status,
  message: string,
  detail: string[] = [],
): Finding => ({
  check,
  status,
  message,
  detail,
});

const coreSkills = [
  'ref-sp-agents-skills-authoring',
  'ref-sp-agents-instructions-authoring',
  'tool-sp-maintain-skills',
  'ref-sp-agents-retro',
  'ref-sp-agents-local-tasks',
] as const;

const workspaceDirs = [
  '.agents/local/tasks',
  '.agents/local/retro',
  '.agents/local/playground',
] as const;

/** Where the workspaces lived before `.agents/local/`; tool-sp-migrate-agent-repo moves them. */
const legacyWorkspaceDirs = [
  '.agents/tasks',
  '.agents/retro',
  '.agents/playground',
] as const;

const skillRoots = [
  '.agents/skills',
  '.claude/skills',
  '.github/skills',
  '.gemini/skills',
  'skills',
] as const;

/** Repo-local evidence that a client is in use: "wire this client up", not "it is installed". */
const clientTraces = {
  claude: ['.claude', 'CLAUDE.md', '.claude/CLAUDE.md', '.claude-plugin'],
  copilot: [
    '.github/copilot-instructions.md',
    '.github/instructions',
    '.github/prompts',
    '.vscode/settings.json',
  ],
  gemini: ['GEMINI.md', '.gemini', '.aiexclude'],
  cursor: ['.cursor', '.cursorrules'],
  codex: ['.codex', 'codex.md'],
  hermes: ['.hermes.md', '.hermes'],
  openclaw: ['.openclaw', 'openclaw.json'],
} as const;

/**
 * Client-specific instruction files that should not sit next to AGENTS.md. Claude Code reads
 * AGENTS.md only when no CLAUDE.md, .claude/CLAUDE.md, or CLAUDE.local.md is on the path, so these
 * suppress AGENTS.md rather than bridge to it. Matched by file name at any depth.
 */
const bridgeNames = [
  'CLAUDE.md',
  'CLAUDE.local.md',
  'GEMINI.md',
  'AGENT.md',
  '.cursorrules',
  'copilot-instructions.md',
];

/** A leftover this small that only points at AGENTS.md is a bridge to delete; larger ones carry guidance. */
const bridgeMaxLines = 25;
/** Codex stops reading AGENTS.md files once their combined size reaches 32 KiB by default. */
const codexMaxBytes = 32 * 1024;
/** Claude Code recommends under 200 lines per instruction file. */
const agentsMdMaxLines = 200;

const scanSkipDirs = new Set([
  '.git',
  'node_modules',
  '.venv',
  'venv',
  'dist',
  'build',
  '.next',
  '__pycache__',
]);

/** Path marker to stack label. The calling skill maps labels to skills. */
const stackMarkers: ReadonlyArray<readonly [string, string]> = [
  ['package.json', 'node'],
  ['tsconfig.json', 'typescript'],
  ['deno.json', 'deno'],
  ['deno.jsonc', 'deno'],
  ['next.config.js', 'next'],
  ['next.config.mjs', 'next'],
  ['next.config.ts', 'next'],
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['supabase', 'supabase'],
  ['wp-content', 'wordpress'],
  ['style.css', 'maybe-wordpress-theme'],
  ['.github/workflows', 'github-actions'],
  ['.github/dependabot.yml', 'dependabot'],
  ['playwright.config.ts', 'playwright'],
  ['playwright.config.js', 'playwright'],
  ['CHANGELOG.md', 'release-notes'],
];

const exists = (target: string): boolean => fs.existsSync(target);

const isDirectory = (target: string): boolean => {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
};

const isFile = (target: string): boolean => {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
};

const readText = (target: string): string => {
  try {
    return fs.readFileSync(target, 'utf8');
  } catch {
    return '';
  }
};

const nonEmptyLines = (text: string): number =>
  text.split(/\r?\n/).filter((line) => line.trim() !== '').length;

const byteLength = (text: string): number => Buffer.byteLength(text, 'utf8');

export const findRepoRoot = (start: string): string => {
  let current = fs.realpathSync(start);
  for (;;) {
    if (exists(path.join(current, '.git'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return fs.realpathSync(start);
    }
    current = parent;
  }
};

/** The raw target of a symlink or Windows junction (Node reports both as links), else `null`. */
const linkTarget = (target: string): string | null => {
  try {
    return fs.lstatSync(target).isSymbolicLink() ?
        fs.readlinkSync(target)
      : null;
  } catch {
    return null;
  }
};

const git = (
  repo: string,
  args: string[],
  timeout: number,
): { status: number | null; stdout: string } | null => {
  const result = spawnSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    timeout,
  });
  return result.error === undefined ?
      { status: result.status, stdout: result.stdout }
    : null;
};

type IgnoreVerdict = {
  ignored: boolean | null;
  /** The ignore file that decided it, when git can tell; `.git/info/exclude` or a global file is machine-local. */
  source?: string;
};

const globCharacters = /[*?[\\]/;

/**
 * The repo `.gitignore` alone, read without git: literal patterns only, last match wins, and a
 * folder excluded at any level cannot be re-included below it, as in git. As in git, a pattern
 * with a slash before its end is anchored to the root, and one without matches a name at any
 * depth. A pattern with glob characters is never matched, so a path only it would decide stays
 * undecided.
 */
export const fallbackIgnored = (
  gitignore: string,
  relative: string,
): boolean | null => {
  const rules = gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const negated = line.startsWith('!');
      const body = (negated ? line.slice(1) : line).replace(/\/+$/, '');
      return {
        negated,
        anchored: body.includes('/'),
        pattern: body.replace(/^\/+/, ''),
      };
    })
    .filter(({ pattern }) => pattern !== '' && !globCharacters.test(pattern));
  const parts = relative.replace(/\/+$/, '').split('/');
  let reIncluded = false;
  for (let depth = 1; depth <= parts.length; depth += 1) {
    const level = parts.slice(0, depth).join('/');
    const name = parts[depth - 1];
    const last = rules
      .filter(({ anchored, pattern }) =>
        anchored ? pattern === level : pattern === name,
      )
      .at(-1);
    if (last === undefined) {
      continue;
    }
    if (!last.negated) {
      return true;
    }
    reIncluded = true;
  }
  return reIncluded ? false : null;
};

/**
 * Whether the ignore patterns decide `relative` is ignored, `null` when they cannot. `--no-index`
 * keeps the answer about patterns alone: otherwise one tracked file makes git report the whole
 * directory as not ignored. Tracked content is checked separately by `trackedPaths`.
 */
const isIgnored = (
  repo: string,
  relative: string,
  hasGit: boolean,
): IgnoreVerdict => {
  if (hasGit) {
    const result = git(
      repo,
      ['check-ignore', '-q', '--no-index', '--', relative],
      10_000,
    );
    if (result === null || (result.status !== 0 && result.status !== 1)) {
      return { ignored: null };
    }
    if (result.status === 1) {
      return { ignored: false };
    }
    const verbose = git(
      repo,
      ['check-ignore', '-v', '--no-index', '--', relative],
      10_000,
    );
    const source = verbose?.stdout.split(/:\d+:/)[0]?.trim();
    return source === undefined || source === '' ?
        { ignored: true }
      : { ignored: true, source };
  }
  const gitignore = readText(path.join(repo, '.gitignore'));
  return {
    ignored: gitignore === '' ? null : fallbackIgnored(gitignore, relative),
  };
};

/**
 * An ignore file that travels with the repo: a `.gitignore` inside it that git tracks, or would
 * commit because nothing ignores it. Not `.git/info/exclude`, a global file, or a `.gitignore`
 * that ignores itself.
 */
const isSharedIgnoreFile = (repo: string, source: string): boolean => {
  const resolved = path.resolve(repo, source);
  const inside = path.relative(repo, resolved);
  if (
    path.basename(resolved) !== '.gitignore' ||
    inside === '' ||
    inside.startsWith('..') ||
    path.isAbsolute(inside)
  ) {
    return false;
  }
  const relative = inside.split(path.sep).join('/');
  const tracked = git(
    repo,
    ['ls-files', '--error-unmatch', '--', relative],
    10_000,
  );
  if (tracked !== null && tracked.status === 0) {
    return true;
  }
  const ignored = git(repo, ['check-ignore', '-q', '--', relative], 10_000);
  return ignored !== null && ignored.status === 1;
};

/** Files git tracks under a path, ignore rules notwithstanding. */
const trackedPaths = (
  repo: string,
  relative: string,
  hasGit: boolean,
): string[] => {
  if (!hasGit) {
    return [];
  }
  const result = git(repo, ['ls-files', '--', relative], 10_000);
  return result === null || result.status !== 0 ?
      []
    : result.stdout.split(/\r?\n/).filter((line) => line.trim() !== '');
};

const walkFiles = (
  repo: string,
  directory: string,
  found: string[],
  wanted: ReadonlySet<string>,
): void => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    // Like os.walk: symlinked directories are listed but not descended; anything else that is not a
    // directory, dangling links included, counts as a file.
    const descend = entry.isDirectory() && !scanSkipDirs.has(entry.name);
    const isDirLink = entry.isSymbolicLink() && isDirectory(full);
    if (descend) {
      walkFiles(repo, full, found, wanted);
    } else if (!entry.isDirectory() && !isDirLink && wanted.has(entry.name)) {
      found.push(path.relative(repo, full).split(path.sep).join('/'));
    }
  }
};

/**
 * Repo-relative paths whose file name is one of `names`, at any depth. Uses git's tracked and
 * untracked-but-not-ignored files when available, so an ignored personal CLAUDE.local.md is only
 * reported when git is absent.
 */
const repoFilesNamed = (
  repo: string,
  names: readonly string[],
  hasGit: boolean,
): string[] => {
  const wanted = new Set(names);
  if (hasGit) {
    const result = git(
      repo,
      ['ls-files', '--cached', '--others', '--exclude-standard'],
      20_000,
    );
    if (result !== null && result.status === 0) {
      return [
        ...new Set(
          result.stdout
            .split(/\r?\n/)
            .filter((line) => wanted.has(line.split('/').at(-1) ?? '')),
        ),
      ].sort();
    }
  }
  const found: string[] = [];
  walkFiles(repo, repo, found, wanted);
  return found.sort();
};

const listSkills = (root: string): string[] =>
  isDirectory(root) ?
    fs
      .readdirSync(root)
      .sort()
      .filter(
        (name) =>
          isDirectory(path.join(root, name)) &&
          isFile(path.join(root, name, 'SKILL.md')),
      )
  : [];

const isRealDirectory = (target: string): boolean => {
  try {
    return fs.lstatSync(target).isDirectory();
  } catch {
    return false;
  }
};

const countFiles = (directory: string): number =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .reduce(
      (sum, entry) =>
        sum +
        (entry.isDirectory() ?
          countFiles(path.join(directory, entry.name))
        : 1),
      0,
    );

const sameFolder = (left: string, right: string): boolean => {
  try {
    return fs.realpathSync(left) === fs.realpathSync(right);
  } catch {
    return false;
  }
};

/**
 * Old workspace paths, judged as migration 0001's Check judges them: a link to the new folder or
 * a folder holding only tracked files is migrated; anything else at an old path is not.
 */
const legacyWorkspaces = (
  repo: string,
  hasGit: boolean,
): { unmigrated: string[]; trackedOnly: string[] } => {
  const unmigrated: string[] = [];
  const trackedOnly: string[] = [];
  for (const directory of legacyWorkspaceDirs) {
    const full = path.join(repo, directory);
    const replacement = path.join(
      repo,
      '.agents/local',
      path.posix.basename(directory),
    );
    const tracked = trackedPaths(repo, directory, hasGit).length;
    if (linkTarget(full) !== null) {
      if (!sameFolder(full, replacement)) {
        unmigrated.push(
          `${directory}: a link, but not to .agents/local/${path.posix.basename(directory)}`,
        );
      } else if (tracked > 0) {
        trackedOnly.push(
          `${directory}: a link to the new folder, with ${tracked} tracked file(s) under the old path`,
        );
      }
      continue;
    }
    if (!isRealDirectory(full)) {
      if (tracked > 0) {
        trackedOnly.push(`${directory}: ${tracked} tracked file(s)`);
      }
      continue;
    }
    if (countFiles(full) > tracked) {
      unmigrated.push(
        `${directory}: a folder with untracked content` +
          (tracked > 0 ? ` and ${tracked} tracked file(s)` : ''),
      );
    } else if (tracked > 0) {
      trackedOnly.push(`${directory}: ${tracked} tracked file(s)`);
    }
  }
  return { unmigrated, trackedOnly };
};

const checkWorkspaces = (repo: string, hasGit: boolean): Finding[] => {
  const findings: Finding[] = [];
  const legacy = legacyWorkspaces(repo, hasGit);
  if (legacy.unmigrated.length > 0) {
    findings.push(
      finding(
        'W4',
        'fail',
        'agent workspaces at their old paths; run tool-sp-migrate-agent-repo before creating new ones',
        legacy.unmigrated,
      ),
    );
  } else if (legacy.trackedOnly.length > 0) {
    findings.push(
      finding(
        'W4',
        'warn',
        'old workspace paths still hold tracked files; untrack them once nothing needs them',
        legacy.trackedOnly,
      ),
    );
  }

  const missing = workspaceDirs.filter(
    (directory) => !isDirectory(path.join(repo, directory)),
  );
  findings.push(
    missing.length > 0 ?
      finding(
        'W1',
        'fail',
        'local agent workspaces missing',
        [...missing].sort(),
      )
    : finding('W1', 'pass', 'local agent workspaces present'),
  );

  const notIgnored: string[] = [];
  const undecided: string[] = [];
  const machineLocal = new Set<string>();
  for (const directory of workspaceDirs) {
    const verdict = isIgnored(repo, `${directory}/`, hasGit);
    if (verdict.ignored === false) {
      notIgnored.push(directory);
    } else if (verdict.ignored === null) {
      undecided.push(directory);
    } else if (
      verdict.source !== undefined &&
      !isSharedIgnoreFile(repo, verdict.source)
    ) {
      machineLocal.add(verdict.source);
    }
  }
  const skillsIgnored =
    isIgnored(repo, '.agents/skills/', hasGit).ignored === true;
  if (notIgnored.length > 0) {
    findings.push(
      finding('W2', 'fail', 'agent workspaces are not gitignored', notIgnored),
    );
  } else if (machineLocal.size > 0) {
    findings.push(
      finding(
        'W2',
        'fail',
        "agent workspaces are ignored only on this machine; add /.agents/local/ to the repo's .gitignore",
        [...machineLocal].sort(),
      ),
    );
  } else if (undecided.length > 0) {
    findings.push(
      finding(
        'W2',
        'warn',
        'could not confirm agent workspaces are gitignored',
        undecided,
      ),
    );
  } else if (skillsIgnored) {
    findings.push(
      finding(
        'W2',
        'warn',
        'the rule that ignores the workspaces also ignores .agents/skills; ignore /.agents/local/ instead',
      ),
    );
  } else {
    findings.push(finding('W2', 'pass', 'agent workspaces are gitignored'));
  }

  const leaked = workspaceDirs.flatMap((directory) => {
    const tracked = trackedPaths(repo, directory, hasGit);
    return tracked.length > 0 ?
        [`${directory}: ${tracked.length} tracked file(s), e.g. ${tracked[0]}`]
      : [];
  });
  findings.push(
    leaked.length > 0 ?
      finding('W3', 'fail', 'local workspace content is committed', leaked)
    : finding('W3', 'pass', 'no committed workspace content'),
  );
  return findings;
};

const checkSkills = (
  repo: string,
): { findings: Finding[]; skills: string[] } => {
  const findings: Finding[] = [];
  const canonical = path.join(repo, '.agents/skills');
  const skills = listSkills(canonical);
  if (!exists(canonical)) {
    findings.push(finding('S1', 'fail', 'no .agents/skills directory'));
  } else if (skills.length === 0) {
    findings.push(
      finding('S1', 'warn', '.agents/skills exists but holds no skills'),
    );
  } else {
    findings.push(
      finding('S1', 'pass', `.agents/skills holds ${skills.length} skill(s)`),
    );
  }

  // A link at another skill root is the wanted shape and is reported by C2.
  const strays = skillRoots.slice(1).flatMap((candidate) => {
    const root = path.join(repo, candidate);
    const found = linkTarget(root) === null ? listSkills(root) : [];
    return found.length > 0 ?
        [`${candidate} (${found.length} skill(s), real directory)`]
      : [];
  });
  findings.push(
    strays.length > 0 ?
      finding('S3', 'fail', 'skills live outside .agents/skills', strays)
    : finding('S3', 'pass', 'no stray skill roots'),
  );

  const missingCore = coreSkills.filter((name) => !skills.includes(name));
  if (skills.length === 0) {
    findings.push(
      finding('S2', 'fail', 'core skills absent from the repo', [
        ...coreSkills,
      ]),
    );
  } else if (missingCore.length > 0) {
    findings.push(finding('S2', 'fail', 'core skills missing', missingCore));
  } else {
    findings.push(finding('S2', 'pass', 'core skills present'));
  }
  return { findings, skills };
};

const checkDistribution = (repo: string, skills: string[]): Finding[] => {
  const modes: string[] = [];
  const configPath = path.join(repo, '.agents/config.json');
  if (isFile(configPath)) {
    let config: unknown;
    try {
      config = JSON.parse(readText(configPath));
    } catch {
      return [finding('S4', 'fail', '.agents/config.json is not valid JSON')];
    }
    if (
      typeof config === 'object' &&
      config !== null &&
      !Array.isArray(config)
    ) {
      if ('skills' in config) {
        modes.push('sync (.agents/config.json skills.sources)');
      }
      if ('plugin' in config) {
        modes.push('publishes a plugin (.agents/config.json plugin)');
      }
    }
  }

  const settings = ['.claude/settings.json', '.claude/settings.local.json']
    .map((name) => readText(path.join(repo, name)))
    .join('');
  if (/"[^"]*plugin[^"]*"\s*:/i.test(settings)) {
    modes.push('marketplace plugin (plugin key in .claude/settings*.json)');
  }

  const linked = skills.filter(
    (name) => linkTarget(path.join(repo, '.agents/skills', name)) !== null,
  ).length;
  const vendored = skills.length - linked;
  if (linked > 0) {
    modes.push(`${linked} linked skill(s)`);
  }
  if (vendored > 0) {
    modes.push(`${vendored} in-repo skill directory(ies)`);
  }
  return modes.length === 0 ?
      [
        finding('S4', 'warn', 'no shared-skill distribution detected', [
          'pick vendoring, sync, or a marketplace plugin',
        ]),
      ]
    : [finding('S4', 'info', 'skill distribution', modes)];
};

const checkInstructions = (repo: string, hasGit: boolean): Finding[] => {
  const findings: Finding[] = [];
  const agentsMd = path.join(repo, 'AGENTS.md');
  let rootBody = '';
  if (!isFile(agentsMd)) {
    findings.push(finding('I1', 'fail', 'no root AGENTS.md'));
  } else {
    rootBody = readText(agentsMd);
    const lines = nonEmptyLines(rootBody);
    const size = byteLength(rootBody);
    const gaps: string[] = [];
    if (lines < 20) {
      gaps.push(`only ${lines} non-empty lines`);
    }
    const sections: ReadonlyArray<readonly [RegExp, string]> = [
      [/^#+ .*person/im, 'no personality/voice section'],
      [/^#+ .*(rule|polic)/im, 'no always-on rules section'],
      [/^#+ .*(workflow|command)/im, 'no workflow or commands section'],
      [/^#+ .*skill/im, 'no skill routing section'],
    ];
    for (const [heading, label] of sections) {
      if (!heading.test(rootBody)) {
        gaps.push(label);
      }
    }
    if (size > codexMaxBytes) {
      findings.push(
        finding('I1', 'fail', 'AGENTS.md exceeds the Codex size cap', [
          `${size} bytes > ${codexMaxBytes}; Codex drops the rest`,
        ]),
      );
    } else if (lines > agentsMdMaxLines) {
      gaps.push(
        `${lines} lines; Claude Code recommends under ${agentsMdMaxLines}`,
      );
    }
    if (gaps.length > 0) {
      findings.push(finding('I1', 'warn', 'AGENTS.md needs work', gaps));
    } else if (size <= codexMaxBytes) {
      findings.push(
        finding('I1', 'pass', 'AGENTS.md covers the baseline sections'),
      );
    }
  }

  const bridges: string[] = [];
  const bodies: string[] = [];
  for (const name of repoFilesNamed(repo, bridgeNames, hasGit)) {
    if (
      name.endsWith('copilot-instructions.md') &&
      name !== '.github/copilot-instructions.md'
    ) {
      continue;
    }
    const target = linkTarget(path.join(repo, name));
    if (target !== null) {
      bridges.push(`${name} -> ${target}`);
      continue;
    }
    const body = readText(path.join(repo, name));
    const lines = nonEmptyLines(body);
    if (body.includes('AGENTS.md') && lines <= bridgeMaxLines) {
      bridges.push(`${name} (${lines} lines, points at AGENTS.md): delete`);
    } else {
      bodies.push(
        `${name} (${lines} lines): merge into the AGENTS.md in its folder, then delete`,
      );
    }
  }
  if (bodies.length > 0) {
    findings.push(
      finding('I2', 'fail', 'instruction files outside AGENTS.md', [
        ...bodies,
        ...bridges,
      ]),
    );
  } else if (bridges.length > 0) {
    findings.push(
      finding(
        'I2',
        'warn',
        'leftover bridge files; a CLAUDE.md stops Claude Code reading AGENTS.md',
        bridges,
      ),
    );
  } else {
    findings.push(
      finding('I2', 'pass', 'no bridge or client-specific instruction files'),
    );
  }

  const nested = repoFilesNamed(
    repo,
    ['AGENTS.md', 'AGENTS.override.md'],
    hasGit,
  ).filter((file) => file !== 'AGENTS.md');
  if (nested.length === 0) {
    findings.push(finding('I3', 'info', 'no nested AGENTS.md files'));
    return findings;
  }
  const problems: string[] = [];
  const listed: string[] = [];
  for (const file of nested) {
    if (file.endsWith('AGENTS.override.md')) {
      problems.push(
        `${file}: override files are Codex-only; fold into AGENTS.md`,
      );
      continue;
    }
    const folder = file.slice(0, file.lastIndexOf('/'));
    listed.push(file);
    if (!rootBody.includes(folder)) {
      problems.push(
        `${file}: root AGENTS.md does not mention ${folder}/; agents launched at the root in Codex or Copilot CLI never load it`,
      );
    }
    const parts = folder.split('/');
    const chain = [
      path.join(repo, 'AGENTS.md'),
      ...parts.map((_part, depth) =>
        path.join(repo, ...parts.slice(0, depth + 1), 'AGENTS.md'),
      ),
    ];
    const total = chain
      .filter(isFile)
      .reduce((sum, item) => sum + byteLength(readText(item)), 0);
    if (total > codexMaxBytes) {
      problems.push(
        `${file}: ${total} bytes with its parents > ${codexMaxBytes}; Codex truncates`,
      );
    }
  }
  findings.push(
    problems.length > 0 ?
      finding('I3', 'warn', 'nested AGENTS.md issues', problems)
    : finding('I3', 'pass', 'nested AGENTS.md files are reachable', listed),
  );
  return findings;
};

const checkClients = (repo: string): Finding[] => {
  const findings: Finding[] = [];
  const detected = Object.entries(clientTraces).flatMap(([client, traces]) => {
    const hits = traces.filter((trace) => exists(path.join(repo, trace)));
    return hits.length > 0 ? [`${client}: ${hits.join(', ')}`] : [];
  });
  findings.push(
    finding(
      'C1',
      detected.length > 0 ? 'info' : 'warn',
      detected.length > 0 ? 'client traces found' : 'no client traces found',
      detected,
    ),
  );

  if (exists(path.join(repo, '.claude'))) {
    const link = path.join(repo, '.claude/skills');
    const target = linkTarget(link);
    if (target === null && exists(link)) {
      findings.push(
        finding(
          'C2',
          'fail',
          '.claude/skills is a real directory, not a symlink',
        ),
      );
    } else if (target === null) {
      findings.push(
        finding('C2', 'fail', 'no .claude/skills symlink to ../.agents/skills'),
      );
    } else if (!target.replaceAll('\\', '/').includes('.agents/skills')) {
      findings.push(
        finding('C2', 'fail', '.claude/skills points elsewhere', [target]),
      );
    } else {
      const ignored = readText(path.join(repo, '.claude/.gitignore'))
        .split(/\r?\n/)
        .some((line) => line.trim().replace(/^\/+|\/+$/g, '') === 'skills');
      findings.push(
        ignored ?
          finding('C2', 'pass', '.claude/skills symlink present and ignored')
        : finding(
            'C2',
            'warn',
            '.claude/skills symlink present but not gitignored',
            ["add 'skills' to .claude/.gitignore"],
          ),
      );
    }
  }

  const vscodeSettings = path.join(repo, '.vscode/settings.json');
  const copilotInUse = clientTraces.copilot.some((trace) =>
    exists(path.join(repo, trace)),
  );
  const hasNested = repoFilesNamed(
    repo,
    ['AGENTS.md'],
    exists(path.join(repo, '.git')),
  ).some((file) => file !== 'AGENTS.md');
  if (isFile(vscodeSettings)) {
    const body = readText(vscodeSettings);
    const missing: string[] = [];
    if (!body.includes('chat.useAgentsMdFile')) {
      missing.push('chat.useAgentsMdFile is unset');
    }
    if (hasNested && !body.includes('chat.useNestedAgentsMdFiles')) {
      missing.push(
        'chat.useNestedAgentsMdFiles is unset; VS Code ignores nested AGENTS.md by default',
      );
    }
    findings.push(
      missing.length > 0 ?
        finding(
          'C3',
          'warn',
          'VS Code settings do not fully enable AGENTS.md',
          missing,
        )
      : finding('C3', 'pass', 'VS Code AGENTS.md settings present'),
    );
  } else if (copilotInUse) {
    findings.push(
      finding('C3', 'warn', 'Copilot in use but no .vscode/settings.json', [
        'VS Code users need chat.useAgentsMdFile enabled',
      ]),
    );
  }
  return findings;
};

/** The catch-all `.gitattributes` line that fixes line endings, as remediation G1 ships it. */
export const lineEndingRule = '* text=auto eol=lf';

/**
 * What the catch-all lines of a .gitattributes resolve to. Git applies matching lines in order and
 * the last setting of each attribute wins; `binary` is shorthand that unsets `text`.
 */
const resolveCatchAll = (
  text: string,
): { text: 'set' | 'auto' | 'unset' | undefined; eol: string | undefined } => {
  let textState: 'set' | 'auto' | 'unset' | undefined;
  let eol: string | undefined;
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const [pattern, ...attributes] = line.trim().split(/\s+/);
    if (pattern !== '*' && pattern !== '**' && pattern !== '"*"') {
      continue;
    }
    for (const attribute of attributes) {
      if (attribute === 'text') {
        textState = 'set';
      } else if (attribute === 'text=auto') {
        textState = 'auto';
      } else if (attribute.startsWith('text=')) {
        textState = 'set';
      } else if (
        attribute === '-text' ||
        attribute === 'binary' ||
        attribute === '-crlf'
      ) {
        textState = 'unset';
      } else if (attribute === '!text') {
        textState = undefined;
      } else if (attribute.startsWith('eol=')) {
        eol = attribute.slice('eol='.length);
      } else if (attribute === '-eol' || attribute === '!eol') {
        eol = undefined;
      }
    }
  }
  return { text: textState, eol };
};

const checkLineEndings = (repo: string): Finding[] => {
  const attributesFile = path.join(repo, '.gitattributes');
  const fix = `add \`${lineEndingRule}\` at the top (see remediation G1)`;
  if (!exists(attributesFile)) {
    return [
      finding(
        'G1',
        'warn',
        'no .gitattributes: line endings follow each clone',
        [fix],
      ),
    ];
  }
  const rule = resolveCatchAll(readText(attributesFile));
  if (rule.text === 'unset') {
    return [
      finding('G1', 'info', 'line endings left as committed, by choice', [
        'the last `*` rule in .gitattributes sets -text or binary',
      ]),
    ];
  }
  // Only text=auto leaves binary files alone; text or a bare eol converts them too.
  if (rule.eol === 'lf' && rule.text === 'auto') {
    return [
      finding('G1', 'pass', 'line endings are fixed to LF by .gitattributes'),
    ];
  }
  const problem =
    rule.eol === 'lf' ? 'eol=lf without `text=auto` converts binary files too'
    : rule.text === undefined && rule.eol === undefined ?
      '.gitattributes sets no line-ending rule for `*`'
    : '.gitattributes does not fix LF for `*`: each clone can still check out CRLF';
  return [finding('G1', 'warn', problem, [fix])];
};

const checkStack = (repo: string): Finding[] => {
  const labels: string[] = [];
  for (const [marker, label] of stackMarkers) {
    if (exists(path.join(repo, marker)) && !labels.includes(label)) {
      labels.push(label);
    }
  }
  return [
    finding(
      'R1',
      'info',
      labels.length > 0 ?
        'stack markers detected'
      : 'no stack markers detected',
      labels,
    ),
  ];
};

const symbols: Record<Status, string> = {
  pass: 'ok  ',
  warn: 'warn',
  fail: 'FAIL',
  info: 'info',
};

const renderText = (repo: string, findings: Finding[]): string => {
  const lines = [`agent baseline audit: ${repo}`, ''];
  for (const item of findings) {
    lines.push(
      `[${symbols[item.status]}] ${item.check} ${item.message}`,
      ...item.detail.map((detail) => `         - ${detail}`),
    );
  }
  const failed = findings.filter((item) => item.status === 'fail').length;
  const warned = findings.filter((item) => item.status === 'warn').length;
  lines.push(
    '',
    `${failed} failed, ${warned} warning(s), ${findings.length} checks`,
  );
  return lines.join('\n');
};

export const auditRepo = (repo: string): Finding[] => {
  const hasGit = exists(path.join(repo, '.git'));
  const skills = checkSkills(repo);
  return [
    ...checkWorkspaces(repo, hasGit),
    ...skills.findings,
    ...checkDistribution(repo, skills.skills),
    ...checkInstructions(repo, hasGit),
    ...checkClients(repo),
    ...checkLineEndings(repo),
    ...checkStack(repo),
  ];
};

const usage = `Usage: audit-agent-repo.mts [--repo PATH] [--json] [--only ID[,ID...]]

Audit a repository against the shared agent baseline.

Examples:
  node audit-agent-repo.mts
  node audit-agent-repo.mts --repo ../other-repo --json
  node audit-agent-repo.mts --only W1,W2,I1
`;

const main = (argv: string[]): number => {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        repo: { type: 'string', default: '.' },
        json: { type: 'boolean' },
        only: { type: 'string', default: '' },
        help: { type: 'boolean', short: 'h' },
      },
    }));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n\n${usage}`,
    );
    return 2;
  }
  if (values.help === true) {
    process.stdout.write(usage);
    return 0;
  }

  const start =
    values.repo.startsWith('~') ?
      path.join(os.homedir(), values.repo.slice(1))
    : values.repo;
  if (!isDirectory(start)) {
    process.stderr.write(`not a directory: ${start}\n`);
    return 2;
  }
  const repo = findRepoRoot(start);
  if (!exists(path.join(repo, '.git'))) {
    process.stderr.write(
      `warning: ${repo} is not a git repo; ignore checks are best-effort\n`,
    );
  }

  const wanted = new Set(
    values.only
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item !== ''),
  );
  const findings = auditRepo(repo).filter(
    (item) => wanted.size === 0 || wanted.has(item.check),
  );

  process.stdout.write(
    values.json === true ?
      `${JSON.stringify({ repo, findings }, null, 2)}\n`
    : `${renderText(repo, findings)}\n`,
  );
  return findings.some((item) => item.status === 'fail') ? 1 : 0;
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
