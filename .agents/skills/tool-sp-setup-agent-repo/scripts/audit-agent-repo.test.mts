import { afterEach, describe, expect, test } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  auditRepo,
  fallbackIgnored,
  lineEndingRule,
} from './audit-agent-repo.mts';

const created: string[] = [];

afterEach(() => {
  for (const directory of created.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

const makeRepo = (
  files: Record<string, string>,
  { withGit }: { withGit: boolean },
): string => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-agent-repo-'));
  created.push(repo);
  if (withGit) {
    expect(spawnSync('git', ['init', '-q'], { cwd: repo }).status).toBe(0);
  }
  for (const [file, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    fs.writeFileSync(path.join(repo, file), body);
  }
  return repo;
};

const gitIn = (repo: string, args: string[]): void => {
  expect(spawnSync('git', args, { cwd: repo }).status).toBe(0);
};

const workspaces = {
  '.agents/local/tasks/TODO.md': '',
  '.agents/local/retro/notes.md': '',
  '.agents/local/playground/scratch.md': '',
};

const check = (repo: string, id: string) =>
  auditRepo(repo).find((item) => item.check === id);

describe('workspace checks', () => {
  test('a repo with /.agents/local/ in its .gitignore passes W1-W3, with no W4', () => {
    const repo = makeRepo(
      { ...workspaces, '.gitignore': '/.agents/local/\n' },
      { withGit: true },
    );
    expect(check(repo, 'W1')?.status).toBe('pass');
    expect(check(repo, 'W2')?.status).toBe('pass');
    expect(check(repo, 'W3')?.status).toBe('pass');
    expect(check(repo, 'W4')).toBeUndefined();
  });

  test('an ignore rule only in .git/info/exclude fails W2: it holds on this machine only', () => {
    const repo = makeRepo(workspaces, { withGit: true });
    fs.appendFileSync(
      path.join(repo, '.git', 'info', 'exclude'),
      '/.agents/local/\n',
    );
    const w2 = check(repo, 'W2');
    expect(w2?.status).toBe('fail');
    expect(w2?.message).toContain('only on this machine');
  });

  test('ignoring all of /.agents/ warns that it hides the skills too', () => {
    const repo = makeRepo(
      { ...workspaces, '.gitignore': '/.agents/\n' },
      { withGit: true },
    );
    const w2 = check(repo, 'W2');
    expect(w2?.status).toBe('warn');
    expect(w2?.message).toContain('.agents/skills');
  });

  test('a tracked .gitignore with content under a workspace fails W3', () => {
    const repo = makeRepo(
      {
        ...workspaces,
        '.gitignore': '/.agents/local/\n',
        '.agents/local/tasks/sub/.gitignore': 'real notes\n',
      },
      { withGit: true },
    );
    gitIn(repo, ['add', '-f', '.agents/local/tasks/sub/.gitignore']);
    expect(check(repo, 'W3')?.status).toBe('fail');
  });

  test('a repo on the old layout fails W4 and points to the migration', () => {
    const repo = makeRepo(
      { '.agents/tasks/plan.md': 'plan\n', '.agents/tasks/notes.md': 'mine\n' },
      { withGit: true },
    );
    gitIn(repo, ['add', '.agents/tasks/plan.md']);
    const w4 = check(repo, 'W4');
    expect(w4?.status).toBe('fail');
    expect(w4?.message).toContain('tool-sp-migrate-agent-repo');
    expect(w4?.detail).toEqual([
      '.agents/tasks: a folder with untracked content and 1 tracked file(s)',
    ]);
    expect(auditRepo(repo)[0]?.check).toBe('W4');
  });

  test('an old folder holding only tracked files is migrated, as 0001 says, and only warns', () => {
    const repo = makeRepo(
      {
        ...workspaces,
        '.gitignore': '/.agents/local/\n',
        '.agents/playground/.gitignore': '*\n!.gitignore\n',
      },
      { withGit: true },
    );
    gitIn(repo, ['add', '.agents/playground/.gitignore']);
    const w4 = check(repo, 'W4');
    expect(w4?.status).toBe('warn');
    expect(w4?.detail).toEqual(['.agents/playground: 1 tracked file(s)']);
  });

  test('a link left at an old path by migration 0001 is not reported', () => {
    const repo = makeRepo(
      { ...workspaces, '.gitignore': '/.agents/local/\n/.agents/tasks\n' },
      { withGit: true },
    );
    fs.symlinkSync(
      path.join(repo, '.agents', 'local', 'tasks'),
      path.join(repo, '.agents', 'tasks'),
      'junction',
    );
    expect(check(repo, 'W4')).toBeUndefined();
  });

  test('a link at an old path that still has tracked files under it warns', () => {
    const repo = makeRepo(
      { ...workspaces, '.agents/playground/.gitignore': '*\n!.gitignore\n' },
      { withGit: true },
    );
    gitIn(repo, ['add', '.agents/playground/.gitignore']);
    fs.rmSync(path.join(repo, '.agents', 'playground'), { recursive: true });
    fs.symlinkSync(
      path.join(repo, '.agents', 'local', 'playground'),
      path.join(repo, '.agents', 'playground'),
      'junction',
    );
    const w4 = check(repo, 'W4');
    expect(w4?.status).toBe('warn');
    expect(w4?.detail).toEqual([
      '.agents/playground: a link to the new folder, with 1 tracked file(s) under the old path',
    ]);
  });

  test('a link at an old path that leads elsewhere fails W4', () => {
    const repo = makeRepo(
      { ...workspaces, 'elsewhere/x.md': '' },
      { withGit: true },
    );
    fs.symlinkSync(
      path.join(repo, 'elsewhere'),
      path.join(repo, '.agents', 'tasks'),
      'junction',
    );
    const w4 = check(repo, 'W4');
    expect(w4?.status).toBe('fail');
    expect(w4?.detail).toEqual([
      '.agents/tasks: a link, but not to .agents/local/tasks',
    ]);
  });

  test('an untracked .gitignore that ignores itself fails W2 like a machine-only rule', () => {
    const repo = makeRepo(
      { ...workspaces, '.agents/local/.gitignore': '*\n' },
      { withGit: true },
    );
    expect(check(repo, 'W2')?.status).toBe('fail');
  });

  test('without git, a later negation un-ignores the workspaces and fails W2', () => {
    const repo = makeRepo(
      { ...workspaces, '.gitignore': '/.agents/local/\n!/.agents/local/\n' },
      { withGit: false },
    );
    expect(check(repo, 'W2')?.status).toBe('fail');
  });

  test('without git, ignoring all of /.agents/ warns that it hides the skills too', () => {
    const repo = makeRepo(
      { ...workspaces, '.gitignore': '/.agents/\n' },
      { withGit: false },
    );
    const w2 = check(repo, 'W2');
    expect(w2?.status).toBe('warn');
    expect(w2?.message).toContain('.agents/skills');
  });
});

describe('fallbackIgnored', () => {
  test('the last matching line wins at one level', () => {
    expect(fallbackIgnored('/.agents/local/\n', '.agents/local/tasks/')).toBe(
      true,
    );
    expect(
      fallbackIgnored('/.agents/local/\n!/.agents/local/\n', '.agents/local/'),
    ).toBe(false);
    expect(
      fallbackIgnored('!/.agents/local/\n/.agents/local/\n', '.agents/local/'),
    ).toBe(true);
  });

  test('a negation below an excluded folder cannot re-include, as in git', () => {
    expect(
      fallbackIgnored(
        '/.agents/local/\n!/.agents/local/tasks/\n',
        '.agents/local/tasks/',
      ),
    ).toBe(true);
  });

  test('a pattern without an inner slash matches a name at any depth, as in git', () => {
    expect(
      fallbackIgnored('!/.agents/local/\nlocal/\n', '.agents/local/tasks/'),
    ).toBe(true);
    expect(fallbackIgnored('tasks\n', '.agents/local/tasks/')).toBe(true);
    expect(fallbackIgnored('local/tasks\n', '.agents/local/tasks/')).toBe(null);
  });

  test('glob patterns and unrelated lines leave it undecided', () => {
    expect(fallbackIgnored('/.agents/local/*\n', '.agents/local/tasks/')).toBe(
      null,
    );
    expect(
      fallbackIgnored('# /.agents/local/\nnode_modules/\n', '.agents/local/'),
    ).toBe(null);
  });
});

describe('line-ending check', () => {
  test('a repo without .gitattributes warns G1 and never fails', () => {
    const repo = makeRepo({}, { withGit: true });
    const g1 = check(repo, 'G1');
    expect(g1?.status).toBe('warn');
    expect(g1?.detail.join(' ')).toContain(lineEndingRule);
  });

  test('the shipped rule passes G1, CRLF exceptions included', () => {
    const repo = makeRepo(
      { '.gitattributes': `${lineEndingRule}\r\n*.bat text eol=crlf\r\n` },
      { withGit: true },
    );
    expect(check(repo, 'G1')?.status).toBe('pass');
  });

  test('a .gitattributes without a line-ending rule for * warns G1', () => {
    const repo = makeRepo(
      { '.gitattributes': '# assets\n*.png binary\n*.sh text eol=lf\n' },
      { withGit: true },
    );
    expect(check(repo, 'G1')?.status).toBe('warn');
  });

  test('a deliberate * -text opt-out is accepted as info', () => {
    const repo = makeRepo({ '.gitattributes': '* -text\n' }, { withGit: true });
    expect(check(repo, 'G1')?.status).toBe('info');
  });
  test.each([
    ['* text=auto\n', 'warn'],
    ['* text=auto eol=crlf\n', 'warn'],
    ['* eol=lf\n', 'warn'],
    ['* text eol=lf\n', 'warn'],
    ['"*" text=auto eol=lf\n', 'pass'],
    ['* -crlf\n', 'info'],
    ['**  text=auto   eol=lf\n', 'pass'],
    ['# * -text\n* text=auto eol=lf\n', 'pass'],
    ['* -text\n* text=auto eol=lf\n', 'pass'],
    ['* text=auto eol=lf\n* binary\n', 'info'],
    ['* text=auto eol=lf\n* !text\n', 'warn'],
  ])('G1 resolves %j the way git does: %s', (attributes, status) => {
    const repo = makeRepo({ '.gitattributes': attributes }, { withGit: true });
    expect(check(repo, 'G1')?.status).toBe(status);
  });
});

/** Windows creates a real directory symlink only with Developer Mode or admin rights. */
const canSymlinkDirectories = ((): boolean => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'audit-agent-repo-probe-'),
  );
  try {
    fs.symlinkSync(directory, path.join(directory, 'probe'), 'dir');
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
})();

// Agents often run skill scripts through .claude/skills, a link to .agents/skills. An entry guard
// that compares the link path with the resolved module path skips main and exits 0 silently.
describe('run through a linked skills folder', () => {
  const linkTypes: ('dir' | 'junction')[] = [
    ...(canSymlinkDirectories ? (['dir'] as const) : []),
    ...(process.platform === 'win32' ? (['junction'] as const) : []),
  ];

  test.each(linkTypes)(
    'a failing audit still prints and exits 1 through a %s link',
    (type) => {
      const repo = makeRepo({}, { withGit: true });
      // Link to a copy, so cleanup can never reach the real scripts folder through the link.
      const skills = fs.mkdtempSync(
        path.join(os.tmpdir(), 'audit-agent-repo-link-'),
      );
      created.push(skills);
      const realScripts = path.join(skills, 'real');
      fs.mkdirSync(realScripts);
      fs.copyFileSync(
        path.join(import.meta.dirname, 'audit-agent-repo.mts'),
        path.join(realScripts, 'audit-agent-repo.mts'),
      );
      const linkedScripts = path.join(skills, 'linked');
      fs.symlinkSync(realScripts, linkedScripts, type);

      const result = spawnSync(
        process.execPath,
        [path.join(linkedScripts, 'audit-agent-repo.mts'), '--repo', repo],
        { encoding: 'utf8' },
      );

      expect(result.stdout).toContain('[FAIL]');
      expect(result.status).toBe(1);
    },
  );
});
