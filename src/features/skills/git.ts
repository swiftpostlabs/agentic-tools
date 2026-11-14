import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ToolError } from '../../core/errors.ts';
import { exists, isFile } from '../../core/fs.ts';
import { z } from 'zod';
import { errorMessage, toJsonText } from '../../core/json.ts';

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
        safeSegment.test(segment) &&
        !segment.startsWith('-') &&
        segment !== '.' &&
        segment !== '..',
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

const credentialsRefusal = (from: string): ToolError =>
  new ToolError(
    `Git source '${from.replace(/\/\/[^/@]*@/, '//***@')}' carries credentials in its URL. Remove them ` +
      "and let git's own credential helper or SSH key supply them: the URL is written to the lock " +
      'and printed in messages.',
  );

const parseGitUrl = (from: string, raw: string): string[] => {
  if (raw.startsWith('-')) {
    // Git would read it as an option.
    throw new ToolError(`Git source '${from}' must not start with '-'.`);
  }
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
  if (
    url.password !== '' ||
    (url.username !== '' && ['https:', 'http:'].includes(url.protocol))
  ) {
    throw credentialsRefusal(from);
  }
  if (url.protocol === 'file:') {
    return toSegments(from, fileUrlSegments(url));
  }
  if (!supportedProtocols.has(url.protocol)) {
    throw new ToolError(
      `Git source '${from}' uses '${url.protocol}', which is not supported; use https, http, ssh, git or file.`,
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

const lockOwnerSchema = z.object({
  host: z.string(),
  pid: z.number().int(),
  created: z.string(),
});

type LockOwner = z.output<typeof lockOwnerSchema>;

/** Parse a small JSON state file this tool wrote; anything unreadable is undefined. */
const readStateFile = <Schema extends z.ZodType>(
  target: string,
  schema: Schema,
): z.output<Schema> | undefined => {
  try {
    const result = schema.safeParse(
      JSON.parse(fs.readFileSync(target, 'utf8')),
    );
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
};

const readLockOwner = (lockPath: string): LockOwner | undefined =>
  readStateFile(lockPath, lockOwnerSchema);

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
 * outlive the age limit. A lock from another host is never broken automatically. A lock whose
 * owner cannot be read (a crash while writing it) is judged by its age alone.
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

/**
 * Move a stale lock aside under a name only this process uses, then look again: if another waiter
 * broke it first and a live process has locked since, the moved file is fresh and goes back.
 */
const breakStaleLock = (lockPath: string): void => {
  const claimed = `${lockPath}.stale-${String(process.pid)}-${String(Date.now())}`;
  try {
    fs.renameSync(lockPath, claimed);
  } catch {
    return;
  }
  if (!isLockStale(claimed)) {
    try {
      fs.linkSync(claimed, lockPath);
    } catch {
      // A newer lock already took its place.
    }
  }
  fs.rmSync(claimed, { force: true });
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
      breakStaleLock(lockPath);
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

/**
 * Run `action` on the shared bare clone while holding its lock, so concurrent syncs never fetch
 * into it at once. The clone is made on first use (a clone without its marker was interrupted and
 * is redone), and `origin` is pointed at this source's URL every time, because several URL forms
 * of one repository share a clone.
 */
export const withBareClone = <Result>(
  source: GitSource,
  toolsHome: string,
  waitMs: number | undefined,
  action: (gitDir: string, cloned: boolean) => Result,
): Result => {
  const target = bareClonePath(toolsHome, source);
  return withLock(
    `${target}.lock`,
    () => {
      if (isFile(path.join(target, bareCloneMarker))) {
        runGit(['remote', 'set-url', 'origin', source.url], { gitDir: target });
        return action(target, false);
      }
      fs.rmSync(target, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(target), { recursive: true });
      runGit(['clone', '--bare', '--quiet', '--', source.url, target], {
        network: true,
      });
      fs.writeFileSync(path.join(target, bareCloneMarker), '', 'utf8');
      return action(target, true);
    },
    waitMs,
  );
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

const fullCommit = /^[0-9a-f]{40}$/;
const refName = /^[A-Za-z0-9._][A-Za-z0-9._/-]*$/;

/**
 * A ref is a tag, a branch or a commit: no revision expressions (`main~1`), and not `HEAD`, which
 * in a bare clone is the default branch as it was when cloned. Leave `ref` out for the default branch.
 */
export const checkRef = (from: string, ref: string | undefined): void => {
  if (
    ref !== undefined &&
    (!refName.test(ref) ||
      ref === 'HEAD' ||
      ref.includes('..') ||
      ref.endsWith('/') ||
      ref.endsWith('.lock'))
  ) {
    throw new ToolError(
      `Ref '${ref}' for '${from}' is not a tag, branch or commit name. Leave 'ref' out to follow the default branch.`,
    );
  }
};

/** Resolve a tag, branch or commit (or the default branch) to a full commit sha. */
export const resolveRef = (
  gitDir: string,
  source: GitSource,
  ref: string | undefined,
): string => {
  checkRef(source.from, ref);
  if (ref !== undefined && fullCommit.test(ref)) {
    // A full sha may sit outside every branch and tag; fetch it by name if needed.
    ensureCommit(gitDir, source, ref);
    return ref;
  }
  const name = ref ?? defaultBranch(gitDir, source);
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

const exportMarkerSchema = z.object({
  from: z.string(),
  url: z.string(),
  commit: z.string(),
});

export type ExportMarker = z.output<typeof exportMarkerSchema>;

/** A damaged or missing marker counts as an unfinished export. */
export const readExportMarker = (folder: string): ExportMarker | undefined =>
  readStateFile(path.join(folder, exportMarker), exportMarkerSchema);

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
