import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, test } from '@jest/globals';
import { createCapturedOutput } from '../../core/output.ts';
import {
  makeTempDir,
  readJson,
  writeJson,
  writeSkill,
} from '../../core/testFixtures.ts';
import {
  bareClonePath,
  exportMarker,
  checkRef,
  isLockStale,
  lockStaleAfterMs,
  parseGitSource,
  toolsHomeDirectory,
  withLock,
} from './git.ts';
import {
  runSkillsList,
  runSkillsSync,
  runSkillsUpdate,
  type SkillsContext,
} from './skills.ts';

/** Fixture repos ignore the machine's git config, so a signing or editor setting cannot hang a test. */
const fixtureGitEnvironment = (): NodeJS.ProcessEnv => {
  const emptyConfig = path.join(makeTempDir(), 'gitconfig');
  fs.writeFileSync(emptyConfig, '', 'utf8');
  return {
    ...process.env,
    GIT_CONFIG_GLOBAL: emptyConfig,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_EDITOR: 'true',
  };
};

const git = (cwd: string, ...args: string[]): string =>
  execFileSync(
    'git',
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args],
    {
      cwd,
      encoding: 'utf8',
      env: fixtureGitEnvironment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim();

/** A source repo with two public skills, one requiring the other, committed on `main`. */
const gitSourceRepo = () => {
  const root = makeTempDir();
  git(root, 'init', '--quiet', '--initial-branch', 'main');
  const skills = path.join(root, '.agents', 'skills');
  writeSkill(skills, 'ref-base', { domain: 'dev', visibility: 'public' });
  writeSkill(skills, 'ref-feature', {
    domain: 'dev',
    visibility: 'public',
    requires: 'ref-base',
  });
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'first');
  const commit = (message: string): string => {
    fs.appendFileSync(
      path.join(skills, 'ref-base', 'SKILL.md'),
      `\n${message}\n`,
    );
    git(root, 'commit', '--quiet', '-am', message);
    return git(root, 'rev-parse', 'HEAD');
  };
  return {
    root,
    from: `git:${pathToFileURL(root).href}`,
    head: () => git(root, 'rev-parse', 'HEAD'),
    commit,
  };
};

const consumer = (sources: unknown[]) => {
  const root = makeTempDir();
  writeJson(path.join(root, '.agents', 'config.json'), {
    skills: { sources },
  });
  return root;
};

const gitContext = (cwd: string, toolsHome = makeTempDir()) => {
  const output = createCapturedOutput();
  const context: SkillsContext = {
    cwd,
    home: makeTempDir(),
    output,
    ownRoot: makeTempDir(),
    toolsHome,
    lockWaitMs: 0,
  };
  return { context, output, toolsHome };
};

const syncOptions = {
  destination: undefined,
  useGlobal: false,
  config: undefined,
  dryRun: false,
  force: false,
};

const lockOf = (root: string) =>
  readJson(path.join(root, '.agents', 'agentic-tools.lock')) as {
    version: number;
    sources: Record<string, { ref?: string; commit: string }>;
  };

const exportsOf = (root: string): string[] => {
  const sources = path.join(root, '.agents', 'local', 'sources');
  return fs.existsSync(sources) ?
      fs
        .readdirSync(sources, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];
};

const linkTarget = (root: string, name: string): string =>
  fs.realpathSync(path.join(root, '.agents', 'skills', name));

describe('git source names', () => {
  test('reads github:, https, scp and file sources into store segments', () => {
    expect(parseGitSource('github:acme/tools')).toEqual({
      from: 'github:acme/tools',
      url: 'https://github.com/acme/tools.git',
      segments: ['github.com', 'acme', 'tools'],
    });
    expect(
      parseGitSource('git:https://GitHub.com:8443/acme/tools.git')?.segments,
    ).toEqual(['github.com_8443', 'acme', 'tools']);
    expect(
      parseGitSource('git:git@github.com:acme/tools.git')?.segments,
    ).toEqual(['github.com', 'acme', 'tools']);
    expect(parseGitSource('./relative/path')).toBeUndefined();
    expect(parseGitSource('package:agentic-tools')).toBeUndefined();
  });

  test('normalizes a Windows file URL: drive letter and backslashes', () => {
    expect(
      parseGitSource('git:file:///C:/Users/me/repo.git')?.segments,
    ).toEqual(['file', 'localhost', 'c-drive', 'Users', 'me', 'repo']);
    expect(
      parseGitSource(String.raw`git:file:///C:\Users\me\repo`)?.segments,
    ).toEqual(['file', 'localhost', 'c-drive', 'Users', 'me', 'repo']);
    // A POSIX path that looks like a drive, and a network share, stay apart from it.
    expect(parseGitSource('git:file:///c/Users/me/repo')?.segments).toEqual([
      'file',
      'localhost',
      'c',
      'Users',
      'me',
      'repo',
    ]);
    expect(parseGitSource('git:file://srv/a/b')?.segments).toEqual([
      'file',
      'srv',
      'a',
      'b',
    ]);
    expect(parseGitSource('git:file:///srv/a/b')?.segments).toEqual([
      'file',
      'localhost',
      'srv',
      'a',
      'b',
    ]);
  });

  test('refuses names that could escape the store, and unsupported URLs', () => {
    expect(() => parseGitSource('git:host:../../escape')).toThrow(
      /does not name a repository/,
    );
    expect(() => parseGitSource('git:https://host/a%2F..%2F..%2Fx')).toThrow(
      /does not name a repository/,
    );
    expect(() => parseGitSource('git:ftp://host/a/b')).toThrow(/not supported/);
    expect(() => parseGitSource('github:acme')).toThrow(
      /github:<owner>\/<repo>/,
    );
    expect(() => parseGitSource('git:')).toThrow(/must include a URL/);
  });

  test('stores bare clones under git/db, with AGENTIC_TOOLS_HOME as an override', () => {
    const home = makeTempDir();
    const toolsHome = toolsHomeDirectory(home, {});
    expect(toolsHome).toBe(path.join(home, '.agents', 'agentic-tools'));
    expect(toolsHomeDirectory(home, { AGENTIC_TOOLS_HOME: '/x/y' })).toBe(
      path.resolve('/x/y'),
    );
    const source = parseGitSource('github:acme/tools');
    expect(source).toBeDefined();
    expect(bareClonePath(toolsHome, source as never)).toBe(
      path.join(toolsHome, 'git', 'db', 'github.com', 'acme', 'tools.git'),
    );
  });
});

describe('git source safety', () => {
  test('refuses a URL that git would read as an option', () => {
    expect(() => parseGitSource('git:-uFOO:a/b')).toThrow(
      /must not start with '-'/,
    );
    expect(() => parseGitSource('git:ssh://-oFoo/a/b')).toThrow(
      /does not name a repository/,
    );
    // A path segment starting with '-' only names a folder, as in a scratch path.
    expect(parseGitSource('git:file:///tmp/-scratch/repo')?.segments).toEqual([
      'file',
      'localhost',
      'tmp',
      '-scratch',
      'repo',
    ]);
  });

  test('refuses credentials in the URL without printing them', () => {
    for (const from of [
      'git:https://alice:s3cretTOKEN@example.com/acme/tools.git',
      'git:https://s3cretTOKEN@example.com/acme/tools.git',
      'git:ssh://git:s3cretTOKEN@example.com/acme/tools.git',
      'git:https://example.com/acme/tools?access_token=s3cretTOKEN',
      'git:https://example.com/acme/tools#s3cretTOKEN',
      'git:user:s3cretTOKEN@example.com:acme/tools',
    ]) {
      expect(() => parseGitSource(from)).toThrow(/may carry credentials/);
      expect(() => parseGitSource(from)).not.toThrow(/s3cretTOKEN/);
    }
    expect(
      parseGitSource('git:ssh://git@example.com/acme/tools.git')?.segments,
    ).toEqual(['example.com', 'acme', 'tools']);
  });

  test('reads an scp URL the way git does: the host ends at the first colon', () => {
    expect(() =>
      parseGitSource('git:evil.example.com:@github.com:org/skills'),
    ).toThrow(/is not a URL git understands|may carry credentials/);
    expect(() =>
      parseGitSource('git:evil.example.com:github.com:org/skills'),
    ).toThrow(/is not a URL git understands/);
  });

  test('refuses dot segments, encoded or not, and malformed encodings', () => {
    for (const from of [
      'git:https://example.com/%2e%2e/acme/tools',
      'git:https://example.com/acme/./tools',
      'git:https://example.com/acme/../tools',
      'git:example.com:acme/../tools',
    ]) {
      expect(() => parseGitSource(from)).toThrow(/does not name a repository/);
    }
    expect(() => parseGitSource('git:https://example.com/o/%zz')).toThrow(
      /malformed percent-encoding/,
    );
  });

  test('refuses folder names Windows cannot create', () => {
    for (const from of [
      'github:acme/nul',
      'github:acme/con.txt',
      'github:acme/repo.',
    ]) {
      expect(() => parseGitSource(from)).toThrow(/does not name a repository/);
    }
  });

  test('refuses revision expressions, HEAD and pseudo-refs as a ref', () => {
    for (const ref of [
      'main~1',
      'HEAD',
      'FETCH_HEAD',
      'ORIG_HEAD',
      'a..b',
      '-x',
      'v1:path',
    ]) {
      expect(() => {
        checkRef('github:acme/tools', ref);
      }).toThrow(/is not a tag, branch or commit name/);
    }
    expect(() => {
      checkRef('github:acme/tools', 'release/v1.2');
    }).not.toThrow();
  });
});

describe('locks', () => {
  test('tells once which lock it waits on and how to clear it', () => {
    const lockPath = path.join(makeTempDir(), 'x.lock');
    const notices: string[] = [];
    withLock(lockPath, () => {
      expect(() =>
        withLock(lockPath, () => 1, {
          waitMs: 700,
          noticeAfterMs: 0,
          onWait: (message) => notices.push(message),
        }),
      ).toThrow(/is held by/);
    });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatch(
      new RegExp(
        `Waiting for lock file '.*x\\.lock', held by process ${String(process.pid)} on .*delete that file`,
      ),
    );
  });

  test('waits on a live lock and names the file when it gives up', () => {
    const lockPath = path.join(makeTempDir(), 'x.lock');
    withLock(lockPath, () => {
      expect(() => withLock(lockPath, () => 1, { waitMs: 0 })).toThrow(
        new RegExp(
          `Lock file '.*x\\.lock' is held by process ${String(process.pid)}`,
        ),
      );
    });
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test('breaks a lock whose process on this host is gone, at once, and no other', () => {
    const lockPath = path.join(makeTempDir(), 'x.lock');
    const old = new Date(Date.now() - lockStaleAfterMs - 60_000);
    // Above every platform's process id range, so it is never alive.
    const deadPid = 2 ** 31 - 2;

    writeJson(lockPath, {
      host: os.hostname(),
      pid: process.pid,
      created: 'x',
    });
    fs.utimesSync(lockPath, old, old);
    expect(isLockStale(lockPath)).toBe(false);
    writeJson(lockPath, { host: 'another-host', pid: deadPid, created: 'x' });
    fs.utimesSync(lockPath, old, old);
    expect(isLockStale(lockPath)).toBe(false);

    // Left by an interrupted sync a moment ago: no need to wait out the age limit.
    writeJson(lockPath, { host: os.hostname(), pid: deadPid, created: 'x' });
    expect(isLockStale(lockPath)).toBe(true);
    expect(withLock(lockPath, () => 'ran', { waitMs: 0 })).toBe('ran');
    expect(fs.existsSync(lockPath)).toBe(false);

    // An owner nobody can read is judged by age.
    fs.writeFileSync(lockPath, '', 'utf8');
    expect(isLockStale(lockPath)).toBe(false);
    fs.utimesSync(lockPath, old, old);
    expect(isLockStale(lockPath)).toBe(true);
  });

  test('leaves a lock it does not own when its action ends', () => {
    const lockPath = path.join(makeTempDir(), 'x.lock');
    withLock(lockPath, () => {
      writeJson(lockPath, { host: 'another-host', pid: 1, created: 'x' });
    });
    expect(fs.existsSync(lockPath)).toBe(true);
  });
});

describe('skills sync from git sources', () => {
  test('pins the default branch, exports it, and links its skills', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-feature'] }]);
    const { context, toolsHome } = gitContext(root);

    runSkillsSync(context, syncOptions);

    const lock = lockOf(root);
    expect(lock).toEqual({
      version: 1,
      sources: { [source.from]: { commit: source.head() } },
    });
    const parsed = parseGitSource(source.from);
    const folder = `${(parsed?.segments ?? []).join('-')}@${source.head().slice(0, 12)}`;
    expect(exportsOf(root)).toEqual([folder]);
    const exportRoot = path.join(root, '.agents', 'local', 'sources', folder);
    expect(fs.existsSync(path.join(exportRoot, exportMarker))).toBe(true);
    expect(fs.existsSync(path.join(exportRoot, '.git'))).toBe(false);
    for (const name of ['ref-base', 'ref-feature']) {
      expect(linkTarget(root, name)).toBe(
        fs.realpathSync(path.join(exportRoot, '.agents', 'skills', name)),
      );
    }
    const gitignore = fs.readFileSync(
      path.join(root, '.agents', 'skills', '.gitignore'),
      'utf8',
    );
    expect(gitignore).toContain('ref-base\nref-feature\n');
    expect(gitignore).toContain(`#   ${pathToFileURL(source.root).href}`);
    expect(fs.existsSync(bareClonePath(toolsHome, parsed as never))).toBe(true);
  });

  test('a pinned, exported source needs neither the network nor the bare clone', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    const { context, toolsHome } = gitContext(root);
    runSkillsSync(context, syncOptions);
    fs.rmSync(path.join(toolsHome, 'git'), { recursive: true, force: true });
    fs.rmSync(source.root, { recursive: true, force: true });

    const again = gitContext(root, toolsHome);
    runSkillsSync(again.context, { ...syncOptions, locked: true });
    expect(again.output.lines.join('\n')).toContain('Already linked');
  });

  test('pins a tag rather than the branch tip', () => {
    const source = gitSourceRepo();
    git(source.root, 'tag', 'v1');
    const tagged = source.head();
    source.commit('after the tag');
    const root = consumer([
      { from: source.from, ref: 'v1', skills: ['ref-base'] },
    ]);
    runSkillsSync(gitContext(root).context, syncOptions);
    expect(lockOf(root).sources[source.from]).toEqual({
      ref: 'v1',
      commit: tagged,
    });
  });

  test('--locked fails without a pin and recreates a missing export from one', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    expect(() => {
      runSkillsSync(gitContext(root).context, { ...syncOptions, locked: true });
    }).toThrow(/The lock does not pin the default branch/);
    expect(
      fs.existsSync(path.join(root, '.agents', 'agentic-tools.lock')),
    ).toBe(false);

    runSkillsSync(gitContext(root).context, syncOptions);
    const pinned = lockOf(root);
    source.commit('moved on');
    fs.rmSync(path.join(root, '.agents', 'local'), {
      recursive: true,
      force: true,
    });

    const fresh = gitContext(root);
    runSkillsSync(fresh.context, { ...syncOptions, locked: true });
    expect(lockOf(root)).toEqual(pinned);
    expect(exportsOf(root)).toHaveLength(1);
    expect(fresh.output.lines.join('\n')).toContain('Exported');
  });

  test('--locked fails when the config asks for another ref than the lock pins', () => {
    const source = gitSourceRepo();
    git(source.root, 'tag', 'v1');
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    runSkillsSync(gitContext(root).context, syncOptions);
    writeJson(path.join(root, '.agents', 'config.json'), {
      skills: {
        sources: [{ from: source.from, ref: 'v1', skills: ['ref-base'] }],
      },
    });
    expect(() => {
      runSkillsSync(gitContext(root).context, { ...syncOptions, locked: true });
    }).toThrow(/does not pin 'v1'/);
  });

  test('update moves the pin, relinks without --force, and removes the old export', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    const { toolsHome } = gitContext(root);
    runSkillsSync(gitContext(root, toolsHome).context, syncOptions);
    const before = exportsOf(root);
    const newer = source.commit('second');

    runSkillsSync(gitContext(root, toolsHome).context, syncOptions);
    expect(exportsOf(root)).toEqual(before);

    const updated = gitContext(root, toolsHome);
    runSkillsUpdate(updated.context, { ...syncOptions, sources: [] });
    expect(lockOf(root).sources[source.from]?.commit).toBe(newer);
    const after = exportsOf(root);
    expect(after).toHaveLength(1);
    expect(after).not.toEqual(before);
    expect(linkTarget(root, 'ref-base')).toContain(newer.slice(0, 12));
    expect(updated.output.lines.join('\n')).toMatch(/Removed unused export/);

    expect(() => {
      runSkillsUpdate(gitContext(root, toolsHome).context, {
        ...syncOptions,
        sources: ['github:acme/other'],
      });
    }).toThrow(/Not a configured git source: github:acme\/other/);
  });

  test('a dry run writes nothing and makes no network call', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    const { context, output, toolsHome } = gitContext(root);
    runSkillsSync(context, { ...syncOptions, dryRun: true });
    expect(output.lines.join('\n')).toContain(
      `Would fetch ${pathToFileURL(source.root).href}, pin the default branch in the lock, and export it`,
    );
    expect(
      fs.existsSync(path.join(root, '.agents', 'agentic-tools.lock')),
    ).toBe(false);
    expect(fs.existsSync(path.join(root, '.agents', 'local'))).toBe(false);
    expect(fs.existsSync(path.join(toolsHome, 'git'))).toBe(false);
  });

  test('refuses a ref on a path source, and a git source listed twice', () => {
    const source = gitSourceRepo();
    const withRef = consumer([
      { from: source.root, ref: 'v1', skills: ['ref-base'] },
    ]);
    expect(() => {
      runSkillsSync(gitContext(withRef).context, syncOptions);
    }).toThrow(/only git: and github: sources take one/);
    const twice = consumer([
      { from: source.from, skills: ['ref-base'] },
      { from: source.from, skills: ['ref-feature'] },
    ]);
    expect(() => {
      runSkillsSync(gitContext(twice).context, syncOptions);
    }).toThrow(/is configured more than once/);
  });

  test('a missing ref names the source and the ref', () => {
    const source = gitSourceRepo();
    const root = consumer([
      { from: source.from, ref: 'nope', skills: ['ref-base'] },
    ]);
    expect(() => {
      runSkillsSync(gitContext(root).context, syncOptions);
    }).toThrow(/Ref 'nope' was not found in file:/);
  });

  test('linked skills from an export pass validate-sharing and show in skills list', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-feature'] }]);
    const skills = path.join(root, '.agents', 'skills');
    writeSkill(skills, 'ref-own', {
      domain: 'dev',
      visibility: 'organization',
      requires: 'ref-feature',
    });
    runSkillsSync(gitContext(root).context, syncOptions);

    const validator = path.resolve(
      import.meta.dirname,
      '../../../.agents/skills/ref-sp-agents-shareable-skills/scripts/validate-sharing.mts',
    );
    const result = spawnSync(process.execPath, [validator, skills, '--all'], {
      encoding: 'utf8',
    });
    expect(`${result.stdout}${result.stderr}`).not.toMatch(/^ERROR/m);
    expect(result.stdout).toMatch(/checked=1 errors=0/);
    expect(result.status).toBe(0);

    const listed = gitContext(root);
    runSkillsList(listed.context, skills);
    expect(listed.output.lines.join('\n')).toMatch(
      /ref-base: domain dev; visibility public/,
    );
    expect(listed.output.lines.join('\n')).toMatch(
      /ref-feature: .*requires ref-base/,
    );
  });

  test('pins a full commit that no branch or tag reaches', () => {
    const source = gitSourceRepo();
    git(source.root, 'checkout', '--quiet', '-b', 'side');
    const side = source.commit('only on a pull ref');
    git(source.root, 'update-ref', 'refs/pull/1/head', side);
    git(source.root, 'checkout', '--quiet', 'main');
    git(source.root, 'branch', '--quiet', '-D', 'side');
    const root = consumer([
      { from: source.from, ref: side, skills: ['ref-base'] },
    ]);
    runSkillsSync(gitContext(root).context, syncOptions);
    expect(lockOf(root).sources[source.from]).toEqual({
      ref: side,
      commit: side,
    });
  });

  test('two configs pinning one source differently keep the exports of both', () => {
    const source = gitSourceRepo();
    git(source.root, 'tag', 'v1');
    const tagged = source.head();
    const tip = source.commit('after the tag');
    const root = consumer([
      { from: source.from, ref: 'v1', skills: ['ref-base'] },
    ]);
    const { toolsHome } = gitContext(root);
    const personal = path.join(root, '.agents', 'personal.json');
    writeJson(personal, {
      skills: { sources: [{ from: source.from, skills: ['ref-base'] }] },
    });
    const elsewhere = makeTempDir();
    const syncDefault = () => {
      runSkillsSync(gitContext(root, toolsHome).context, syncOptions);
    };
    const syncPersonal = () => {
      runSkillsSync(gitContext(root, toolsHome).context, {
        ...syncOptions,
        config: personal,
        destination: elsewhere,
      });
    };

    syncDefault();
    syncPersonal();
    syncDefault();
    syncPersonal();

    expect(lockOf(root).sources[source.from]).toEqual({
      ref: 'v1',
      commit: tagged,
    });
    expect(readJson(`${personal}.lock`)).toEqual({
      version: 1,
      sources: { [source.from]: { commit: tip } },
    });
    expect(linkTarget(root, 'ref-base')).toContain(tagged.slice(0, 12));
    expect(linkTarget(elsewhere, 'ref-base')).toContain(tip.slice(0, 12));
    expect(linkTarget(elsewhere, 'ref-base')).toContain(
      path.join('sources', 'personal.json'),
    );
  });

  test('refuses a hand-edited pin that the ref does not reach', () => {
    const source = gitSourceRepo();
    git(source.root, 'tag', 'v1');
    git(source.root, 'checkout', '--quiet', '-b', 'side');
    const offBranch = source.commit('not on v1');
    git(source.root, 'update-ref', 'refs/pull/9/head', offBranch);
    git(source.root, 'checkout', '--quiet', 'main');
    git(source.root, 'branch', '--quiet', '-D', 'side');
    const root = consumer([
      { from: source.from, ref: 'v1', skills: ['ref-base'] },
    ]);
    writeJson(path.join(root, '.agents', 'agentic-tools.lock'), {
      version: 1,
      sources: { [source.from]: { ref: 'v1', commit: offBranch } },
    });
    expect(() => {
      runSkillsSync(gitContext(root).context, { ...syncOptions, locked: true });
    }).toThrow(/is on no branch or tag|does not reach it/);
    expect(exportsOf(root)).toEqual([]);
  });

  test('a link into a deleted export moves without --force', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    runSkillsSync(gitContext(root).context, syncOptions);
    source.commit('moved on');
    fs.rmSync(path.join(root, '.agents', 'local'), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(root, '.agents', 'agentic-tools.lock'));
    runSkillsSync(gitContext(root).context, syncOptions);
    expect(linkTarget(root, 'ref-base')).toContain(source.head().slice(0, 12));
  });

  test('refuses two sources whose export folders would share a name', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    runSkillsSync(gitContext(root).context, syncOptions);
    const [folder] = exportsOf(root);
    const markerPath = path.join(
      root,
      '.agents',
      'local',
      'sources',
      folder as string,
      exportMarker,
    );
    const marker = readJson(markerPath) as Record<string, string>;
    writeJson(markerPath, { ...marker, from: 'github:other/name' });
    fs.rmSync(path.join(root, '.agents', 'skills', 'ref-base'));
    expect(() => {
      runSkillsSync(gitContext(root).context, syncOptions);
    }).toThrow(/already holds 'github:other\/name'/);
  });

  test('a sync that fails takes back the export it wrote', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    fs.mkdirSync(path.join(root, '.agents', 'skills', 'ref-base'), {
      recursive: true,
    });
    expect(() => {
      runSkillsSync(gitContext(root).context, syncOptions);
    }).toThrow(/already exists and is not a symlink/);
    expect(exportsOf(root)).toEqual([]);
    expect(
      fs.existsSync(path.join(root, '.agents', 'agentic-tools.lock')),
    ).toBe(false);
  });

  test('keeps exports out of git with their own ignore file', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    runSkillsSync(gitContext(root).context, syncOptions);
    expect(
      fs.readFileSync(
        path.join(root, '.agents', 'local', 'sources', '.gitignore'),
        'utf8',
      ),
    ).toMatch(/^\*$/m);
  });

  test('a dry run after a ref change says the lock would change', () => {
    const source = gitSourceRepo();
    git(source.root, 'tag', 'v1');
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    runSkillsSync(gitContext(root).context, syncOptions);
    writeJson(path.join(root, '.agents', 'config.json'), {
      skills: {
        sources: [{ from: source.from, ref: 'v1', skills: ['ref-base'] }],
      },
    });
    const { context, output } = gitContext(root);
    runSkillsSync(context, { ...syncOptions, dryRun: true });
    expect(output.lines.join('\n')).toMatch(
      /Would update .*agentic-tools\.lock/,
    );
  });

  test('a link into an unmarked folder under the sources folder still needs --force', () => {
    const source = gitSourceRepo();
    const root = consumer([{ from: source.from, skills: ['ref-base'] }]);
    const handmade = path.join(
      root,
      '.agents',
      'local',
      'sources',
      'handmade',
      'ref-base',
    );
    fs.mkdirSync(handmade, { recursive: true });
    fs.mkdirSync(path.join(root, '.agents', 'skills'), { recursive: true });
    fs.symlinkSync(
      handmade,
      path.join(root, '.agents', 'skills', 'ref-base'),
      'junction',
    );
    expect(() => {
      runSkillsSync(gitContext(root).context, syncOptions);
    }).toThrow(/Use --force to replace it/);
  });
});
