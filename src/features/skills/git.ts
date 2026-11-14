import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ToolError } from '../../core/errors.ts';
import { exists, isFile } from '../../core/fs.ts';
import { errorMessage, isJsonObject, toJsonText } from '../../core/json.ts';

const gitPrefix = 'git:';
const githubPrefix = 'github:';

/** Folder names match Git's own short form: 12 characters, as Go and Claude Code use. */
export const shortCommitLength = 12;

/** A lock older than this may be stale; it is only broken when its process is gone too. */
export const lockStaleAfterMs = 10 * 60 * 1000;

const lockPollMs = 200;
const bareCloneMarker = 'agentic-tools-complete';
export const exportMarker = '.agentic-tools-source.json';

/** A `git:` or `github:` source: where to fetch it and the path segments that name it on disk. */
export type GitSource = {
  from: string;
  url: string;
  segments: string[];
};

const safeSegment = /^[A-Za-z0-9._-]+$/;

const toSegments = (from: string, parts: string[]): string[] => {
  const segments = parts.filter((part) => part !== '');
  const last = segments.at(-1);
  if (last !== undefined && last.endsWith('.git') && last !== '.git') {
    segments[segments.length - 1] = last.slice(0, -'.git'.length);
  }
  if (
    segments.length < 2 ||
    !segments.every(
      (segment) =>
        safeSegment.test(segment) && segment !== '.' && segment !== '..',
    )
  ) {
    throw new ToolError(
      `Git source '${from}' does not name a repository this tool can store: use a URL such as ` +
        `'git:https://github.com/<owner>/<repo>' or 'github:<owner>/<repo>'.`,
    );
  }
  return segments;
};

/** `file:///C:/Users/x` names `file/c/Users/x`; a UNC host such as `file://server/share` keeps it. */
const fileUrlSegments = (url: URL): string[] => {
  const parts = decodeURIComponent(url.pathname).split('/');
  const drive = parts.findIndex((part) => part !== '');
  if (drive !== -1 && /^[A-Za-z]:$/.test(parts[drive] ?? '')) {
    parts[drive] = (parts[drive] as string).slice(0, 1).toLowerCase();
  }
  return ['file', url.hostname.toLowerCase(), ...parts];
};

const hostSegment = (url: URL): string =>
  url.port === '' ?
    url.hostname.toLowerCase()
  : `${url.hostname.toLowerCase()}_${url.port}`;

const supportedProtocols = new Set(['https:', 'http:', 'ssh:', 'git:']);

const parseGitUrl = (from: string, raw: string): string[] => {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    // scp-like syntax, as Git accepts it: [user@]host:owner/repo
    const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(.+)$/.exec(raw);
    if (scp === null) {
      throw new ToolError(`Git source '${from}' is not a URL Git understands.`);
    }
    return toSegments(from, [
      (scp[1] as string).toLowerCase(),
      ...(scp[2] as string).split('/'),
    ]);
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch (error) {
    throw new ToolError(
      `Git source '${from}' is not a valid URL: ${errorMessage(error)}`,
    );
  }
  if (url.protocol === 'file:') {
    return toSegments(from, fileUrlSegments(url));
  }
  if (!supportedProtocols.has(url.protocol)) {
    throw new ToolError(
      `Git source '${from}' uses '${url.protocol}', which is not supported; use https, ssh, git or file.`,
    );
  }
  return toSegments(from, [
    hostSegment(url),
    ...decodeURIComponent(url.pathname).split('/'),
  ]);
};

/** Parse a `git:<url>` or `github:<owner>/<repo>` source; any other source is not a git source. */
export const parseGitSource = (from: string): GitSource | undefined => {
  if (from.startsWith(githubPrefix)) {
    const repository = from.slice(githubPrefix.length).trim();
    const parts = repository.split('/');
    if (parts.length !== 2) {
      throw new ToolError(
        `GitHub source '${from}' must be 'github:<owner>/<repo>'.`,
      );
    }
    const segments = toSegments(from, ['github.com', ...parts]);
    return {
      from,
      url: `https://github.com/${segments.slice(1).join('/')}.git`,
      segments,
    };
  }
  if (from.startsWith(gitPrefix)) {
    const url = from.slice(gitPrefix.length).trim();
    if (url === '') {
      throw new ToolError("Git skill sources must include a URL after 'git:'.");
    }
    return { from, url, segments: parseGitUrl(from, url) };
  }
  return undefined;
};

/** `$AGENTIC_TOOLS_HOME`, or `~/.agents/agentic-tools`: apart from `~/.agents/skills`, which clients read. */
export const toolsHomeDirectory = (
  home: string,
  environment: NodeJS.ProcessEnv = process.env,
): string => {
  const override = environment['AGENTIC_TOOLS_HOME']?.trim();
  return override !== undefined && override !== '' ?
      path.resolve(override)
    : path.join(home, '.agents', 'agentic-tools');
};

/** The shared bare clone: `<tools home>/git/db/<host>/<owner>/<repo>.git`. */
export const bareClonePath = (toolsHome: string, source: GitSource): string => {
  const database = path.resolve(toolsHome, 'git', 'db');
  const parents = source.segments.slice(0, -1);
  const name = `${source.segments.at(-1) as string}.git`;
  const target = path.resolve(database, ...parents, name);
  const relative = path.relative(database, target);
  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw new ToolError(
      `Git source '${source.from}' would be stored outside ${database}.`,
    );
  }
  return target;
};

/** The per-project export folder name: `<host>-<owner>-<repo>@<12-character commit>`. */
export const exportFolderName = (source: GitSource, commit: string): string =>
  `${source.segments.join('-')}@${commit.slice(0, shortCommitLength)}`;

const gitEnvironment = (): NodeJS.ProcessEnv => ({
  ...process.env,
  // Fail at once instead of waiting for a password nobody will type.
  GIT_TERMINAL_PROMPT: '0',
  // Git Credential Manager on Windows opens a window unless told not to.
  GCM_INTERACTIVE: 'never',
});

const authenticationHint =
  'If the repository is private, authenticate git yourself (for example with an SSH key or your ' +
  'credential helper) and run the command again; this tool stores no credentials.';

const stderrOf = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === 'string' && stderr.trim() !== '') {
      return stderr.trim();
    }
    if (Buffer.isBuffer(stderr) && stderr.length > 0) {
      return stderr.toString('utf8').trim();
    }
  }
  return errorMessage(error);
};

type GitOptions = {
  gitDir?: string;
  workTree?: string;
  indexFile?: string;
  network?: boolean;
};

const runGit = (args: readonly string[], options: GitOptions = {}): string => {
  const prefix = [
    ...(options.gitDir === undefined ? [] : ['--git-dir', options.gitDir]),
    ...(options.workTree === undefined ?
      []
    : ['--work-tree', options.workTree]),
  ];
  const environment = gitEnvironment();
  if (options.indexFile !== undefined) {
    environment['GIT_INDEX_FILE'] = options.indexFile;
  }
  try {
    return execFileSync('git', [...prefix, ...args], {
      encoding: 'utf8',
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const hint = options.network === true ? ` ${authenticationHint}` : '';
    throw new ToolError(
      `git ${args.join(' ')} failed: ${stderrOf(error)}${hint}`,
    );
  }
};

const gitSucceeds = (args: readonly string[], options: GitOptions): boolean => {
  try {
    runGit(args, options);
    return true;
  } catch {
    return false;
  }
};

const sleep = (milliseconds: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
};

type LockOwner = { host: string; pid: number; created: string };

const readLockOwner = (lockPath: string): LockOwner | undefined => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (
      isJsonObject(parsed) &&
      typeof parsed['host'] === 'string' &&
      typeof parsed['pid'] === 'number' &&
      typeof parsed['created'] === 'string'
    ) {
      return {
        host: parsed['host'],
        pid: parsed['pid'],
        created: parsed['created'],
      };
    }
  } catch {
    // An unreadable lock is judged by its age alone.
  }
  return undefined;
};

const isProcessRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as { code?: unknown }).code === 'EPERM';
  }
};

/**
 * Stale only when old and, on this host, its process is gone: a first clone on a slow link can
 * outlive the age limit. A lock from another host is never broken automatically.
 */
export const isLockStale = (
  lockPath: string,
  now: number = Date.now(),
): boolean => {
  let modified: number;
  try {
    modified = fs.statSync(lockPath).mtimeMs;
  } catch {
    return false;
  }
  if (now - modified <= lockStaleAfterMs) {
    return false;
  }
  const owner = readLockOwner(lockPath);
  if (owner === undefined) {
    return true;
  }
  return owner.host === os.hostname() && !isProcessRunning(owner.pid);
};

const tryCreateLock = (lockPath: string): boolean => {
  try {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    const owner: LockOwner = {
      host: os.hostname(),
      pid: process.pid,
      created: new Date().toISOString(),
    };
    fs.writeFileSync(lockPath, toJsonText(owner), {
      encoding: 'utf8',
      flag: 'wx',
    });
    return true;
  } catch (error) {
    if ((error as { code?: unknown }).code === 'EEXIST') {
      return false;
    }
    throw new ToolError(
      `Could not create lock file '${lockPath}': ${errorMessage(error)}`,
    );
  }
};

/** Hold `<target>.lock` while `action` runs, waiting for another process that holds it. */
export const withLock = <Result>(
  lockPath: string,
  action: () => Result,
  waitMs: number = lockStaleAfterMs,
): Result => {
  const deadline = Date.now() + waitMs;
  while (!tryCreateLock(lockPath)) {
    if (isLockStale(lockPath)) {
      fs.rmSync(lockPath, { force: true });
      continue;
    }
    if (Date.now() >= deadline) {
      const owner = readLockOwner(lockPath);
      const holder =
        owner === undefined ? 'an unknown process' : (
          `process ${String(owner.pid)} on ${owner.host} since ${owner.created}`
        );
      throw new ToolError(
        `Lock file '${lockPath}' is held by ${holder}. If no sync is running, delete that file and run the command again.`,
      );
    }
    sleep(lockPollMs);
  }
  try {
    return action();
  } finally {
    fs.rmSync(lockPath, { force: true });
  }
};

/** Clone the source as a bare repo, once; a clone without its marker was interrupted and is redone. */
export const ensureBareClone = (
  source: GitSource,
  toolsHome: string,
  waitMs?: number,
): { path: string; cloned: boolean } => {
  const target = bareClonePath(toolsHome, source);
  const cloned = withLock(
    `${target}.lock`,
    () => {
      if (isFile(path.join(target, bareCloneMarker))) {
        return false;
      }
      fs.rmSync(target, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(target), { recursive: true });
      runGit(['clone', '--bare', '--quiet', source.url, target], {
        network: true,
      });
      fs.writeFileSync(path.join(target, bareCloneMarker), '', 'utf8');
      return true;
    },
    waitMs,
  );
  return { path: target, cloned };
};

/** Bring every branch and tag up to date; `--prune` drops branches the remote deleted. */
export const fetchSource = (gitDir: string): void => {
  runGit(
    [
      'fetch',
      '--quiet',
      '--prune',
      'origin',
      '+refs/heads/*:refs/heads/*',
      '+refs/tags/*:refs/tags/*',
    ],
    { gitDir, network: true },
  );
};

export const hasCommit = (gitDir: string, commit: string): boolean =>
  gitSucceeds(['cat-file', '-e', `${commit}^{commit}`], { gitDir });

/** The remote's default branch, asked of the remote, since a bare clone's HEAD does not follow it. */
const defaultBranch = (gitDir: string, source: GitSource): string => {
  const output = runGit(['ls-remote', '--symref', 'origin', 'HEAD'], {
    gitDir,
    network: true,
  });
  const match = /^ref: refs\/heads\/(\S+)\s+HEAD$/m.exec(output);
  if (match === null) {
    throw new ToolError(
      `Could not find the default branch of ${source.url}; set 'ref' for this source.`,
    );
  }
  return match[1] as string;
};

/** Resolve a tag, branch or commit (or the default branch) to a full commit sha. */
export const resolveRef = (
  gitDir: string,
  source: GitSource,
  ref: string | undefined,
): string => {
  const name = ref ?? defaultBranch(gitDir, source);
  if (name.startsWith('-')) {
    throw new ToolError(`Ref '${name}' for ${source.from} is not valid.`);
  }
  try {
    return runGit(['rev-parse', '--verify', '--quiet', `${name}^{commit}`], {
      gitDir,
    }).trim();
  } catch {
    throw new ToolError(
      `Ref '${name}' was not found in ${source.url}. Check the source's 'ref' in the config.`,
    );
  }
};

/** Make sure a pinned commit is in the clone: fetch branches and tags, then the commit itself. */
export const ensureCommit = (
  gitDir: string,
  source: GitSource,
  commit: string,
): boolean => {
  if (hasCommit(gitDir, commit)) {
    return false;
  }
  fetchSource(gitDir);
  if (!hasCommit(gitDir, commit)) {
    gitSucceeds(['fetch', '--quiet', 'origin', commit], { gitDir });
  }
  if (!hasCommit(gitDir, commit)) {
    throw new ToolError(
      `Commit ${commit} pinned for ${source.from} is not in ${source.url}. ${authenticationHint}`,
    );
  }
  return true;
};

export type ExportMarker = { from: string; url: string; commit: string };

export const readExportMarker = (folder: string): ExportMarker | undefined => {
  const markerPath = path.join(folder, exportMarker);
  if (!isFile(markerPath)) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    if (
      isJsonObject(parsed) &&
      typeof parsed['from'] === 'string' &&
      typeof parsed['url'] === 'string' &&
      typeof parsed['commit'] === 'string'
    ) {
      return {
        from: parsed['from'],
        url: parsed['url'],
        commit: parsed['commit'],
      };
    }
  } catch {
    // A damaged marker counts as an unfinished export.
  }
  return undefined;
};

export const isCompleteExport = (folder: string, commit: string): boolean =>
  readExportMarker(folder)?.commit === commit;

/**
 * Write the commit's files into `folder` with Git itself (a throwaway index, then checkout-index),
 * so no `tar` is needed on Windows. The marker is written last: a folder without it is redone.
 */
export const exportCommit = (options: {
  gitDir: string;
  source: GitSource;
  commit: string;
  folder: string;
  waitMs?: number | undefined;
}): boolean =>
  withLock(
    `${options.folder}.lock`,
    () => {
      if (isCompleteExport(options.folder, options.commit)) {
        return false;
      }
      fs.rmSync(options.folder, { recursive: true, force: true });
      fs.mkdirSync(options.folder, { recursive: true });
      const indexFile = `${options.folder}.index`;
      const gitOptions = {
        gitDir: options.gitDir,
        workTree: options.folder,
        indexFile,
      };
      try {
        runGit(['read-tree', options.commit], gitOptions);
        runGit(['checkout-index', '--all', '--force'], gitOptions);
      } finally {
        fs.rmSync(indexFile, { force: true });
      }
      const marker: ExportMarker = {
        from: options.source.from,
        url: options.source.url,
        commit: options.commit,
      };
      fs.writeFileSync(
        path.join(options.folder, exportMarker),
        toJsonText(marker),
        'utf8',
      );
      return true;
    },
    options.waitMs,
  );

/** Export folders under `sourcesDir` that carry this tool's marker; anything else is left alone. */
export const listExportFolders = (sourcesDir: string): string[] => {
  if (!exists(sourcesDir)) {
    return [];
  }
  return fs
    .readdirSync(sourcesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(sourcesDir, entry.name))
    .filter((folder) => readExportMarker(folder) !== undefined)
    .sort();
};
