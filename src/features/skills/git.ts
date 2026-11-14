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
// Names Windows will not create as files or folders, with or without an extension.
const windowsReserved = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;

const isStorableSegment = (segment: string): boolean =>
  safeSegment.test(segment) &&
  segment !== '.' &&
  segment !== '..' &&
  !segment.endsWith('.') &&
  !windowsReserved.test(segment);

const storeRefusal = (from: string): ToolError =>
  new ToolError(
    `Git source '${from}' does not name a repository this tool can store: use a URL such as ` +
      `'git:https://github.com/<owner>/<repo>' or 'github:<owner>/<repo>'.`,
  );

/**
 * The first segment is the host, which git reaches over the network: one starting with '-' would
 * be read as an option by ssh. Later segments only name folders.
 */
const toSegments = (from: string, parts: string[]): string[] => {
  const segments = parts.filter((part) => part !== '');
  const last = segments.at(-1);
  if (last !== undefined && last.endsWith('.git') && last !== '.git') {
    segments[segments.length - 1] = last.slice(0, -'.git'.length);
  }
  if (
    segments.length < 2 ||
    (segments[0] as string).startsWith('-') ||
    !segments.every(isStorableSegment)
  ) {
    throw storeRefusal(from);
  }
  return segments;
};

const decodePath = (from: string, encoded: string): string[] => {
  try {
    return decodeURIComponent(encoded).split('/');
  } catch {
    throw new ToolError(
      `Git source '${from}' has a malformed percent-encoding.`,
    );
  }
};

/**
 * `file:///C:/Users/x` names `file/localhost/c-drive/Users/x`, so it cannot meet the POSIX path
 * `/c/Users/x`; a UNC host such as `file://server/share` keeps its name in place of `localhost`.
 */
const fileUrlSegments = (from: string, url: URL): string[] => {
  const parts = decodePath(from, url.pathname);
  const drive = parts.findIndex((part) => part !== '');
  if (drive !== -1 && /^[A-Za-z]:$/.test(parts[drive] ?? '')) {
    parts[drive] =
      `${(parts[drive] as string).slice(0, 1).toLowerCase()}-drive`;
  }
  const host = url.hostname.toLowerCase();
  return ['file', host === '' ? 'localhost' : host, ...parts];
};

const hostSegment = (url: URL): string =>
  url.port === '' ?
    url.hostname.toLowerCase()
  : `${url.hostname.toLowerCase()}_${url.port}`;

const supportedProtocols = new Set(['https:', 'http:', 'ssh:', 'git:']);

/** The source as it may be printed: user info, query and fragment hidden. */
const maskCredentials = (from: string): string =>
  from
    .replace(/\/\/[^/]*@/, '//***@')
    .replace(/^(git:)[^/@]*:[^/@]*@/, '$1***@')
    .replace(/[?#].*$/, '');

const credentialsRefusal = (from: string): ToolError =>
  new ToolError(
    `Git source '${maskCredentials(from)}' may carry ` +
      'credentials in its URL (a password, a user name on http or https, a query or a fragment). ' +
      "Remove them and let git's own credential helper or SSH key supply them: the URL is written " +
      'to the lock and printed in messages.',
  );

// WHATWG URLs resolve `.`/`..` segments, encoded or not, but git sends the path as written.
const dotSegment = /(^|\/)(\.|%2e){1,2}(\/|$)/i;

const parseGitUrl = (from: string, raw: string): string[] => {
  if (raw.startsWith('-')) {
    // Git would read it as an option.
    throw new ToolError(`Git source '${from}' must not start with '-'.`);
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    // scp-like syntax, as git reads it: [user@]host:path, the host ending at the first ':'.
    if (/^[^@/]*:[^@/]*@/.test(raw)) {
      throw credentialsRefusal(from);
    }
    const scp = /^(?:([^@/:\s]+)@)?([^@:/\s]+):([^@:\s]+)$/.exec(raw);
    if (scp === null) {
      throw new ToolError(`Git source '${from}' is not a URL git understands.`);
    }
    if (dotSegment.test(scp[3] as string)) {
      throw storeRefusal(from);
    }
    return toSegments(from, [
      (scp[2] as string).toLowerCase(),
      ...(scp[3] as string).split('/'),
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
    url.search !== '' ||
    url.hash !== '' ||
    raw.includes('?') ||
    raw.includes('#') ||
    (url.username !== '' && ['https:', 'http:'].includes(url.protocol))
  ) {
    throw credentialsRefusal(from);
  }
  const rawPath = raw.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '');
  if (dotSegment.test(rawPath.replaceAll('\\', '/'))) {
    throw storeRefusal(from);
  }
  if (url.protocol === 'file:') {
    return toSegments(from, fileUrlSegments(from, url));
  }
  if (!supportedProtocols.has(url.protocol)) {
    throw new ToolError(
      `Git source '${from}' uses '${url.protocol}', which is not supported; use https, http, ssh, git or file.`,
    );
  }
  return toSegments(from, [
    hostSegment(url),
    ...decodePath(from, url.pathname),
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

/**
 * The shared bare clone: `<tools home>/git/db/<host>/<owner>/<repo>.git`. The URL scheme is not
 * part of the name, so the https, http and ssh forms of one repository share a clone; that is safe
 * because `withBareClone` points `origin` at the configured URL on every use.
 */
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

// Set when sync runs from a git hook; they would point every call at the consumer's own repo.
const inheritedRepositoryVariables = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_NAMESPACE',
  'GIT_PREFIX',
];

const gitEnvironment = (): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    // Fail at once instead of waiting for a password nobody will type.
    GIT_TERMINAL_PROMPT: '0',
    // Git Credential Manager on Windows opens a window unless told not to.
    GCM_INTERACTIVE: 'never',
  };
  for (const name of inheritedRepositoryVariables) {
    Reflect.deleteProperty(environment, name);
  }
  return environment;
};

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
 * A lock whose process on this host is gone is stale at once, so an interrupted sync (Ctrl+C runs
 * no cleanup) does not hold up the next one. A lock from another host is never broken: its
 * process cannot be checked. A lock whose owner cannot be read (a crash while writing it) is
 * stale once older than the age limit.
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
  const owner = readLockOwner(lockPath);
  if (owner === undefined) {
    return now - modified > lockStaleAfterMs;
  }
  return owner.host === os.hostname() && !isProcessRunning(owner.pid);
};

const windowsBusyCodes = new Set(['EPERM', 'EACCES', 'EBUSY']);

/** Create the lock file only if none exists; returns this process's owner record, or undefined. */
const tryCreateLock = (lockPath: string): LockOwner | undefined => {
  const owner: LockOwner = {
    host: os.hostname(),
    pid: process.pid,
    created: new Date().toISOString(),
  };
  try {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.writeFileSync(lockPath, toJsonText(owner), {
      encoding: 'utf8',
      flag: 'wx',
    });
    return owner;
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    // On Windows, a file another process is deleting cannot be created for a moment: try again.
    if (
      code === 'EEXIST' ||
      (process.platform === 'win32' && windowsBusyCodes.has(String(code)))
    ) {
      return undefined;
    }
    throw new ToolError(
      `Could not create lock file '${lockPath}': ${errorMessage(error)}`,
    );
  }
};

/** A guard is held for a few file operations; one this old was left by a crash. */
const guardStaleAfterMs = 30 * 1000;

/**
 * Remove a stale lock while holding `<lock>.break`, re-checking under that guard, so two waiters
 * that both saw the stale lock cannot remove each other's fresh one. Returns whether it removed it.
 */
const breakStaleLock = (lockPath: string): boolean => {
  const guard = `${lockPath}.break`;
  try {
    if (Date.now() - fs.statSync(guard).mtimeMs > guardStaleAfterMs) {
      fs.rmSync(guard, { force: true });
    }
  } catch {
    // No guard, or another waiter removed it first.
  }
  if (tryCreateLock(guard) === undefined) {
    return false;
  }
  try {
    if (!isLockStale(lockPath)) {
      return false;
    }
    try {
      fs.rmSync(lockPath, { force: true });
    } catch (error) {
      throw new ToolError(
        `Could not remove stale lock file '${lockPath}': ${errorMessage(error)}. ${clearHint}`,
      );
    }
    return true;
  } finally {
    fs.rmSync(guard, { force: true });
  }
};

/** Remove the lock only while it is still this process's own record. */
const releaseLock = (lockPath: string, owner: LockOwner): void => {
  const current = readLockOwner(lockPath);
  if (
    current?.host === owner.host &&
    current.pid === owner.pid &&
    current.created === owner.created
  ) {
    fs.rmSync(lockPath, { force: true });
  }
};

/** How long to wait on another sync's lock, and whom to tell while waiting. */
export type LockWait = {
  /** Give up after this long; defaults to the stale limit. */
  waitMs?: number | undefined;
  /** Told once, after `noticeAfterMs`, so a long wait does not look like a hang. */
  onWait?: ((message: string) => void) | undefined;
  noticeAfterMs?: number | undefined;
};

const defaultNoticeAfterMs = 3000;

const clearHint =
  'If no sync is running, delete that file and run the command again.';

const describeHolder = (lockPath: string): string => {
  const owner = readLockOwner(lockPath);
  return owner === undefined ? 'an unknown process' : (
      `process ${String(owner.pid)} on ${owner.host} since ${owner.created}`
    );
};

/** Hold `<target>.lock` while `action` runs, waiting for another process that holds it. */
export const withLock = <Result>(
  lockPath: string,
  action: () => Result,
  wait: LockWait = {},
): Result => {
  const started = Date.now();
  const deadline = started + (wait.waitMs ?? lockStaleAfterMs);
  const noticeAt = started + (wait.noticeAfterMs ?? defaultNoticeAfterMs);
  let noticed = false;
  for (;;) {
    const owned = tryCreateLock(lockPath);
    if (owned !== undefined) {
      try {
        return action();
      } finally {
        releaseLock(lockPath, owned);
      }
    }
    if (isLockStale(lockPath) && breakStaleLock(lockPath)) {
      continue;
    }
    const now = Date.now();
    if (now >= deadline) {
      throw new ToolError(
        `Lock file '${lockPath}' is held by ${describeHolder(lockPath)}. ${clearHint}`,
      );
    }
    if (!noticed && now >= noticeAt && wait.onWait !== undefined) {
      noticed = true;
      wait.onWait(
        `Waiting for lock file '${lockPath}', held by ${describeHolder(lockPath)}. ${clearHint}`,
      );
    }
    sleep(lockPollMs);
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
  wait: LockWait,
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
    wait,
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
const abbreviatedCommit = /^[0-9a-f]{7,39}$/;
const refName = /^[A-Za-z0-9._][A-Za-z0-9._/-]*$/;

/**
 * A ref is a tag, a branch or a commit: no revision expressions (`main~1`), and no `HEAD` or
 * pseudo-refs such as `FETCH_HEAD`, which name the clone's state rather than the remote's. Leave
 * `ref` out for the default branch.
 */
export const checkRef = (from: string, ref: string | undefined): void => {
  if (
    ref !== undefined &&
    (!refName.test(ref) ||
      /^([A-Z_]+_)?HEAD$/.test(ref) ||
      ref.includes('..') ||
      ref.endsWith('/') ||
      ref.endsWith('.lock'))
  ) {
    throw new ToolError(
      `Ref '${ref}' for '${from}' is not a tag, branch or commit name. Leave 'ref' out to follow the default branch.`,
    );
  }
};

const revParse = (gitDir: string, revision: string): string | undefined => {
  try {
    return runGit(
      ['rev-parse', '--verify', '--quiet', `${revision}^{commit}`],
      {
        gitDir,
      },
    ).trim();
  } catch {
    return undefined;
  }
};

/** Look a ref up in the clone only as a tag, then a branch, then a commit, never as an expression. */
const lookUpRef = (
  gitDir: string,
  source: GitSource,
  ref: string | undefined,
): string | undefined => {
  if (ref === undefined) {
    return revParse(gitDir, `refs/heads/${defaultBranch(gitDir, source)}`);
  }
  return (
    revParse(gitDir, `refs/tags/${ref}`) ??
    revParse(gitDir, `refs/heads/${ref}`) ??
    (abbreviatedCommit.test(ref) ? revParse(gitDir, ref) : undefined)
  );
};

/** Resolve a tag, branch or commit (or the default branch) to a full commit sha. */
export const resolveRef = (
  gitDir: string,
  source: GitSource,
  ref: string | undefined,
): string => {
  checkRef(source.from, ref);
  if (ref !== undefined && fullCommit.test(ref)) {
    // A full sha the config names may sit outside every branch and tag; fetch it by name.
    ensureCommit(gitDir, source, ref, { fetchBySha: true });
    return ref;
  }
  const commit = lookUpRef(gitDir, source, ref);
  if (commit === undefined) {
    throw new ToolError(
      `Ref '${ref ?? 'the default branch'}' was not found in ${source.url}. Check the source's 'ref' in the config.`,
    );
  }
  return commit;
};

/**
 * Make sure a pinned commit is in the clone by fetching branches and tags. Fetching a commit by its
 * sha is allowed only when the config itself names that sha: a sha that only the lock names could
 * be any commit the host serves, including one pushed to a fork.
 */
export const ensureCommit = (
  gitDir: string,
  source: GitSource,
  commit: string,
  options: { fetchBySha: boolean } = { fetchBySha: false },
): boolean => {
  if (hasCommit(gitDir, commit)) {
    return false;
  }
  fetchSource(gitDir);
  if (!hasCommit(gitDir, commit) && options.fetchBySha) {
    gitSucceeds(['fetch', '--quiet', 'origin', commit], { gitDir });
  }
  if (!hasCommit(gitDir, commit)) {
    throw new ToolError(
      `Commit ${commit} pinned for ${source.from} is on no branch or tag of ${source.url}. ${authenticationHint}`,
    );
  }
  return true;
};

const isAncestor = (gitDir: string, commit: string, tip: string): boolean =>
  gitSucceeds(['merge-base', '--is-ancestor', commit, tip], { gitDir });

/**
 * The lock is a committed file anyone can edit in a pull request, so before exporting a pinned
 * commit, check that the config's ref reaches it: the ref's commit itself, or one of its ancestors
 * (a branch that moved on). A full-sha ref must equal the pin.
 */
export const verifyPinnedCommit = (
  gitDir: string,
  source: GitSource,
  ref: string | undefined,
  commit: string,
): void => {
  if (ref !== undefined && fullCommit.test(ref)) {
    if (ref !== commit) {
      throw pinMismatch(source, ref, commit);
    }
    return;
  }
  const reaches = (): boolean => {
    const tip = lookUpRef(gitDir, source, ref);
    return (
      tip !== undefined && (tip === commit || isAncestor(gitDir, commit, tip))
    );
  };
  if (reaches()) {
    return;
  }
  fetchSource(gitDir);
  if (!reaches()) {
    throw pinMismatch(source, ref ?? 'the default branch', commit);
  }
};

const pinMismatch = (
  source: GitSource,
  ref: string,
  commit: string,
): ToolError =>
  new ToolError(
    `The lock pins ${commit} for '${source.from}', but '${ref}' in ${source.url} does not reach ` +
      'it. If the lock was edited by hand, restore it, or run skills sync without --locked to pin again.',
  );

const exportMarkerSchema = z.object({
  from: z.string(),
  url: z.string(),
  commit: z.string(),
});

export type ExportMarker = z.output<typeof exportMarkerSchema>;

/** A damaged or missing marker counts as an unfinished export. */
export const readExportMarker = (folder: string): ExportMarker | undefined =>
  readStateFile(path.join(folder, exportMarker), exportMarkerSchema);

/**
 * Is `folder` a finished export of this source at this commit? A marker naming another source
 * means two sources map to one folder name; refuse rather than overwrite the other's files.
 */
export const isCompleteExport = (
  folder: string,
  source: GitSource,
  commit: string,
): boolean => {
  const marker = readExportMarker(folder);
  if (marker === undefined) {
    return false;
  }
  if (marker.from !== source.from) {
    throw new ToolError(
      `Export folder ${folder} already holds '${marker.from}', which maps to the same name as ` +
        `'${source.from}'. Configure only one of them.`,
    );
  }
  return marker.commit === commit;
};

/** Delete an export under its own lock, so a sync exporting into it at the same time is not cut short. */
export const removeExport = (folder: string, wait?: LockWait): void => {
  withLock(
    `${folder}.lock`,
    () => {
      fs.rmSync(folder, { recursive: true, force: true });
    },
    wait,
  );
};

/**
 * Write the commit's files into `folder` with Git itself (a throwaway index, then checkout-index),
 * so no `tar` is needed on Windows. The marker is written last: a folder without it is redone.
 */
export const exportCommit = (options: {
  gitDir: string;
  source: GitSource;
  commit: string;
  folder: string;
  wait?: LockWait | undefined;
}): boolean =>
  withLock(
    `${options.folder}.lock`,
    () => {
      if (isCompleteExport(options.folder, options.source, options.commit)) {
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
    options.wait,
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
