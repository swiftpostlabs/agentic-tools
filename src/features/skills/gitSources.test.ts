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
  return fs.existsSync(sources) ? fs.readdirSync(sources).sort() : [];
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
    ).toEqual(['file', 'c', 'Users', 'me', 'repo']);
    expect(
      parseGitSource(String.raw`git:file:///C:\Users\me\repo`)?.segments,
    ).toEqual(['file', 'c', 'Users', 'me', 'repo']);
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

describe('locks', () => {
  test('waits on a live lock and names the file when it gives up', () => {
    const lockPath = path.join(makeTempDir(), 'x.lock');
    withLock(lockPath, () => {
      expect(() => withLock(lockPath, () => 1, 0)).toThrow(
        new RegExp(
          `Lock file '.*x\\.lock' is held by process ${String(process.pid)}`,
        ),
      );
    });
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test('breaks a lock only when it is old and its process on this host is gone', () => {
    const lockPath = path.join(makeTempDir(), 'x.lock');
    const old = new Date(Date.now() - lockStaleAfterMs - 60_000);
    const write = (host: string, pid: number) => {
      writeJson(lockPath, { host, pid, created: old.toISOString() });
      fs.utimesSync(lockPath, old, old);
    };
    const deadPid = 2 ** 22 - 3;

    write(os.hostname(), process.pid);
    expect(isLockStale(lockPath)).toBe(false);
    write('another-host', deadPid);
    expect(isLockStale(lockPath)).toBe(false);
    write(os.hostname(), deadPid);
    expect(isLockStale(lockPath)).toBe(true);
    expect(withLock(lockPath, () => 'ran', 0)).toBe('ran');

    writeJson(lockPath, { host: os.hostname(), pid: deadPid, created: 'now' });
    expect(isLockStale(lockPath)).toBe(false);
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
});
