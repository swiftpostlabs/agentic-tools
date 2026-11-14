import path from 'node:path';
import { ToolError } from '../../core/errors.ts';
import {
  ensureBareClone,
  ensureCommit,
  exportCommit,
  exportFolderName,
  fetchSource,
  isCompleteExport,
  resolveRef,
  shortCommitLength,
  type GitSource,
} from './git.ts';
import type { LockedSource } from './lock.ts';

/** Exports live in the consumer's gitignored local folder, one per pinned commit. */
export const sourcesDirectory = (configRoot: string): string =>
  path.join(configRoot, '.agents', 'local', 'sources');

export type GitSourceRequest = {
  source: GitSource;
  ref: string | undefined;
  locked: LockedSource | undefined;
  /** Fetch and resolve the ref again even when the lock already pins it (`skills update`). */
  refresh: boolean;
  /** `--locked`: fail rather than change the pin. */
  frozen: boolean;
  dryRun: boolean;
  toolsHome: string;
  sourcesDir: string;
  waitMs?: number | undefined;
};

export type PreparedGitSource = {
  /** The export to link from, or undefined when a dry run cannot see it yet. */
  root: string | undefined;
  /** The pin to keep in the lock; undefined when a dry run would resolve it. */
  pin: LockedSource | undefined;
  messages: string[];
};

const describeRef = (ref: string | undefined): string =>
  ref === undefined ? 'the default branch' : `'${ref}'`;

const pinnedEntry = (ref: string | undefined): { ref?: string } =>
  ref === undefined ? {} : { ref };

const short = (commit: string): string => commit.slice(0, shortCommitLength);

/** Does the lock entry still answer the config? The config's ref is the request; the lock its answer. */
export const lockMatches = (
  locked: LockedSource | undefined,
  ref: string | undefined,
): locked is LockedSource => locked !== undefined && locked.ref === ref;

/**
 * Pin, fetch and export one git source. With a matching pin and a complete export it touches
 * neither the network nor the bare clone, so a synced project keeps working offline.
 */
export const prepareGitSource = (
  request: GitSourceRequest,
): PreparedGitSource => {
  const { source, ref } = request;
  const pinned = lockMatches(request.locked, ref) && !request.refresh;
  if (!pinned && request.frozen) {
    throw new ToolError(
      `The lock does not pin ${describeRef(ref)} for '${source.from}'. Run skills sync without ` +
        '--locked to update .agents/agentic-tools.lock, and commit it.',
    );
  }

  if (pinned) {
    const commit = (request.locked as LockedSource).commit;
    const folder = path.join(
      request.sourcesDir,
      exportFolderName(source, commit),
    );
    if (isCompleteExport(folder, commit)) {
      return {
        root: folder,
        pin: { ...pinnedEntry(ref), commit },
        messages: [],
      };
    }
    if (request.dryRun) {
      return {
        root: undefined,
        pin: { ...pinnedEntry(ref), commit },
        messages: [
          `Would export ${source.from} at ${short(commit)} to ${folder}`,
        ],
      };
    }
    const messages: string[] = [];
    const clone = ensureBareClone(source, request.toolsHome, request.waitMs);
    if (clone.cloned) {
      messages.push(`Cloned ${source.url} into ${clone.path}`);
    }
    if (ensureCommit(clone.path, source, commit)) {
      messages.push(`Fetched ${source.url}`);
    }
    exportCommit({
      gitDir: clone.path,
      source,
      commit,
      folder,
      waitMs: request.waitMs,
    });
    messages.push(`Exported ${source.from} at ${short(commit)} to ${folder}`);
    return { root: folder, pin: { ...pinnedEntry(ref), commit }, messages };
  }

  if (request.dryRun) {
    return {
      root: undefined,
      pin: undefined,
      messages: [
        `Would fetch ${source.url}, pin ${describeRef(ref)} in the lock, and export it`,
      ],
    };
  }

  const messages: string[] = [];
  const clone = ensureBareClone(source, request.toolsHome, request.waitMs);
  if (clone.cloned) {
    messages.push(`Cloned ${source.url} into ${clone.path}`);
  } else {
    fetchSource(clone.path);
    messages.push(`Fetched ${source.url}`);
  }
  const commit = resolveRef(clone.path, source, ref);
  messages.push(`Pinned ${source.from} ${describeRef(ref)} at ${commit}`);
  const folder = path.join(
    request.sourcesDir,
    exportFolderName(source, commit),
  );
  if (
    exportCommit({
      gitDir: clone.path,
      source,
      commit,
      folder,
      waitMs: request.waitMs,
    })
  ) {
    messages.push(`Exported ${source.from} at ${short(commit)} to ${folder}`);
  }
  return { root: folder, pin: { ...pinnedEntry(ref), commit }, messages };
};
