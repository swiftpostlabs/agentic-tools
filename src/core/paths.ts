import path from 'node:path';

/** Repo-relative locations owned by agentic-tools inside a workspace. */
export const agentsPaths = {
  root: '.agents',
  config: path.join('.agents', 'config.json'),
  policy: path.join('.agents', 'policy.json'),
  legacyPolicy: '.ai-policy.json',
  skills: path.join('.agents', 'skills'),
  skillsConfig: path.join('.agents', 'skills.json'),
} as const;

export const agentsFileNames = {
  root: '.agents',
  config: 'config.json',
  policy: 'policy.json',
  legacyPolicy: '.ai-policy.json',
  skills: 'skills',
  skillsConfig: 'skills.json',
} as const;

/** Client files that the policy feature generates. */
export const clientPaths = {
  geminiAiExclude: '.aiexclude',
  claudeSettings: path.join('.claude', 'settings.json'),
  vscodeSettings: path.join('.vscode', 'settings.json'),
} as const;

/** Render a path relative to `root` with forward slashes, or absolute when outside it. */
export const formatRelative = (target: string, root: string): string => {
  const relative = path.relative(root, target);
  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    return target;
  }
  return relative.split(path.sep).join('/');
};

/** Expand a leading `~` and resolve against `cwd`, like Python's `expanduser().resolve()`. */
export const resolveUserPath = (
  raw: string,
  cwd: string,
  home: string,
): string => {
  const expanded =
    raw === '~' ? home
    : raw.startsWith('~/') ? path.join(home, raw.slice(2))
    : raw;
  return path.resolve(cwd, expanded);
};
