#!/usr/bin/env node
/**
 * Audit a repository against the shared agent baseline in one pass.
 *
 * Detects the local agent workspaces, the skills root and how it is materialized, the instruction
 * files (root and nested AGENTS.md, leftover bridge files), which agent clients the repo shows
 * traces of, and which stack markers imply extra skills. Reports findings as check IDs so the
 * calling skill can map each one to a fix.
 *
 * Detection only: this script never writes to the audited repo.
 *
 *     node audit-agent-repo.mts [--repo PATH] [--json] [--only ID[,ID...]]
 *
 * Exit status: 0 when no check failed, 1 when at least one check failed, 2 on a usage or
 * environment error. Warnings alone do not change the exit status.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

type Status = "pass" | "warn" | "fail" | "info";
type Finding = { check: string; status: Status; message: string; detail: string[] };

const finding = (check: string, status: Status, message: string, detail: string[] = []): Finding => ({
  check,
  status,
  message,
  detail,
});

const coreSkills = [
  "ref-sp-agents-skills-authoring",
  "ref-sp-agents-instructions-authoring",
  "tool-sp-maintain-skills",
  "ref-sp-agents-retro",
  "ref-sp-agents-local-tasks",
] as const;

const workspaceDirs = [".agents/tasks", ".agents/retro", ".agents/playground"] as const;

const skillRoots = [".agents/skills", ".claude/skills", ".github/skills", ".gemini/skills", "skills"] as const;

/** Repo-local evidence that a client is in use: "wire this client up", not "it is installed". */
const clientTraces = {
  claude: [".claude", "CLAUDE.md", ".claude/CLAUDE.md", ".claude-plugin"],
  copilot: [".github/copilot-instructions.md", ".github/instructions", ".github/prompts", ".vscode/settings.json"],
  gemini: ["GEMINI.md", ".gemini", ".aiexclude"],
  cursor: [".cursor", ".cursorrules"],
  codex: [".codex", "codex.md"],
  hermes: [".hermes.md", ".hermes"],
  openclaw: [".openclaw", "openclaw.json"],
} as const;

/**
 * Client-specific instruction files that should not sit next to AGENTS.md. Claude Code reads
 * AGENTS.md only when no CLAUDE.md, .claude/CLAUDE.md, or CLAUDE.local.md is on the path, so these
 * suppress AGENTS.md rather than bridge to it. Matched by file name at any depth.
 */
const bridgeNames = ["CLAUDE.md", "CLAUDE.local.md", "GEMINI.md", "AGENT.md", ".cursorrules", "copilot-instructions.md"];

/** A leftover this small that only points at AGENTS.md is a bridge to delete; larger ones carry guidance. */
const bridgeMaxLines = 25;
/** Codex stops reading AGENTS.md files once their combined size reaches 32 KiB by default. */
const codexMaxBytes = 32 * 1024;
/** Claude Code recommends under 200 lines per instruction file. */
const agentsMdMaxLines = 200;

const scanSkipDirs = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", ".next", "__pycache__"]);

/** Path marker to stack label. The calling skill maps labels to skills. */
const stackMarkers: ReadonlyArray<readonly [string, string]> = [
  ["package.json", "node"],
  ["tsconfig.json", "typescript"],
  ["deno.json", "deno"],
  ["deno.jsonc", "deno"],
  ["next.config.js", "next"],
  ["next.config.mjs", "next"],
  ["next.config.ts", "next"],
  ["pyproject.toml", "python"],
  ["requirements.txt", "python"],
  ["supabase", "supabase"],
  ["wp-content", "wordpress"],
  ["style.css", "maybe-wordpress-theme"],
  [".github/workflows", "github-actions"],
  [".github/dependabot.yml", "dependabot"],
  ["playwright.config.ts", "playwright"],
  ["playwright.config.js", "playwright"],
  ["CHANGELOG.md", "release-notes"],
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
    return fs.readFileSync(target, "utf8");
  } catch {
    return "";
  }
};

const nonEmptyLines = (text: string): number => text.split(/\r?\n/).filter((line) => line.trim() !== "").length;

const byteLength = (text: string): number => Buffer.byteLength(text, "utf8");

export const findRepoRoot = (start: string): string => {
  let current = fs.realpathSync(start);
  for (;;) {
    if (exists(path.join(current, ".git"))) {
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
    return fs.lstatSync(target).isSymbolicLink() ? fs.readlinkSync(target) : null;
  } catch {
    return null;
  }
};

const git = (repo: string, args: string[], timeout: number): { status: number | null; stdout: string } | null => {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8", timeout });
  return result.error === undefined ? { status: result.status, stdout: result.stdout } : null;
};

/**
 * `true`/`false` when the ignore patterns decide it, `null` when they cannot. `--no-index` keeps the
 * answer about patterns alone: otherwise one tracked placeholder `.gitignore` makes git report the
 * whole directory as not ignored. Tracked content is checked separately by `trackedPaths`.
 */
const isIgnored = (repo: string, relative: string, hasGit: boolean): boolean | null => {
  if (hasGit) {
    const result = git(repo, ["check-ignore", "-q", "--no-index", "--", relative], 10_000);
    if (result === null || (result.status !== 0 && result.status !== 1)) {
      return null;
    }
    return result.status === 0;
  }
  const gitignore = readText(path.join(repo, ".gitignore"));
  if (gitignore === "") {
    return null;
  }
  const stem = relative.replace(/\/+$/, "");
  const trimSlashes = (line: string) => line.replace(/^\/+|\/+$/g, "");
  return gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line !== "" && !line.startsWith("#") && trimSlashes(line) === stem)
    ? true
    : null;
};

/** Files git tracks under a path, ignore rules notwithstanding. */
const trackedPaths = (repo: string, relative: string, hasGit: boolean): string[] => {
  if (!hasGit) {
    return [];
  }
  const result = git(repo, ["ls-files", "--", relative], 10_000);
  return result === null || result.status !== 0 ? [] : result.stdout.split(/\r?\n/).filter((line) => line.trim() !== "");
};

const walkFiles = (repo: string, directory: string, found: string[], wanted: ReadonlySet<string>): void => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    // Like os.walk: symlinked directories are listed but not descended; anything else that is not a
    // directory, dangling links included, counts as a file.
    const descend = entry.isDirectory() && !scanSkipDirs.has(entry.name);
    const isDirLink = entry.isSymbolicLink() && isDirectory(full);
    if (descend) {
      walkFiles(repo, full, found, wanted);
    } else if (!entry.isDirectory() && !isDirLink && wanted.has(entry.name)) {
      found.push(path.relative(repo, full).split(path.sep).join("/"));
    }
  }
};

/**
 * Repo-relative paths whose file name is one of `names`, at any depth. Uses git's tracked and
 * untracked-but-not-ignored files when available, so an ignored personal CLAUDE.local.md is only
 * reported when git is absent.
 */
const repoFilesNamed = (repo: string, names: readonly string[], hasGit: boolean): string[] => {
  const wanted = new Set(names);
  if (hasGit) {
    const result = git(repo, ["ls-files", "--cached", "--others", "--exclude-standard"], 20_000);
    if (result !== null && result.status === 0) {
      return [...new Set(result.stdout.split(/\r?\n/).filter((line) => wanted.has(line.split("/").at(-1) ?? "")))].sort();
    }
  }
  const found: string[] = [];
  walkFiles(repo, repo, found, wanted);
  return found.sort();
};

const listSkills = (root: string): string[] =>
  isDirectory(root)
    ? fs
        .readdirSync(root)
        .sort()
        .filter((name) => isDirectory(path.join(root, name)) && isFile(path.join(root, name, "SKILL.md")))
    : [];

const checkWorkspaces = (repo: string, hasGit: boolean): Finding[] => {
  const findings: Finding[] = [];
  const missing = workspaceDirs.filter((directory) => !isDirectory(path.join(repo, directory)));
  findings.push(
    missing.length > 0
      ? finding("W1", "fail", "local agent workspaces missing", [...missing].sort())
      : finding("W1", "pass", "local agent workspaces present"),
  );

  const notIgnored: string[] = [];
  const undecided: string[] = [];
  for (const directory of workspaceDirs) {
    const verdict = isIgnored(repo, `${directory}/`, hasGit);
    if (verdict === false) {
      notIgnored.push(directory);
    } else if (verdict === null) {
      undecided.push(directory);
    }
  }
  if (notIgnored.length > 0) {
    findings.push(finding("W2", "fail", "agent workspaces are not gitignored", notIgnored));
  } else if (undecided.length > 0) {
    findings.push(finding("W2", "warn", "could not confirm agent workspaces are gitignored", undecided));
  } else {
    findings.push(finding("W2", "pass", "agent workspaces are gitignored"));
  }

  const leaked = workspaceDirs.flatMap((directory) => {
    const tracked = trackedPaths(repo, directory, hasGit).filter((file) => path.posix.basename(file) !== ".gitignore");
    return tracked.length > 0 ? [`${directory}: ${tracked.length} tracked file(s), e.g. ${tracked[0]}`] : [];
  });
  findings.push(
    leaked.length > 0
      ? finding("W3", "fail", "local workspace content is committed", leaked)
      : finding("W3", "pass", "no committed workspace content"),
  );
  return findings;
};

const checkSkills = (repo: string): { findings: Finding[]; skills: string[] } => {
  const findings: Finding[] = [];
  const canonical = path.join(repo, ".agents/skills");
  const skills = listSkills(canonical);
  if (!exists(canonical)) {
    findings.push(finding("S1", "fail", "no .agents/skills directory"));
  } else if (skills.length === 0) {
    findings.push(finding("S1", "warn", ".agents/skills exists but holds no skills"));
  } else {
    findings.push(finding("S1", "pass", `.agents/skills holds ${skills.length} skill(s)`));
  }

  // A link at another skill root is the wanted shape and is reported by C2.
  const strays = skillRoots.slice(1).flatMap((candidate) => {
    const root = path.join(repo, candidate);
    const found = linkTarget(root) === null ? listSkills(root) : [];
    return found.length > 0 ? [`${candidate} (${found.length} skill(s), real directory)`] : [];
  });
  findings.push(
    strays.length > 0
      ? finding("S3", "fail", "skills live outside .agents/skills", strays)
      : finding("S3", "pass", "no stray skill roots"),
  );

  const missingCore = coreSkills.filter((name) => !skills.includes(name));
  if (skills.length === 0) {
    findings.push(finding("S2", "fail", "core skills absent from the repo", [...coreSkills]));
  } else if (missingCore.length > 0) {
    findings.push(finding("S2", "fail", "core skills missing", missingCore));
  } else {
    findings.push(finding("S2", "pass", "core skills present"));
  }
  return { findings, skills };
};

const checkDistribution = (repo: string, skills: string[]): Finding[] => {
  const modes: string[] = [];
  const configPath = path.join(repo, ".agents/config.json");
  if (isFile(configPath)) {
    let config: unknown;
    try {
      config = JSON.parse(readText(configPath));
    } catch {
      return [finding("S4", "fail", ".agents/config.json is not valid JSON")];
    }
    if (typeof config === "object" && config !== null && !Array.isArray(config)) {
      if ("skills" in config) {
        modes.push("sync (.agents/config.json skills.sources)");
      }
      if ("plugin" in config) {
        modes.push("publishes a plugin (.agents/config.json plugin)");
      }
    }
  }

  const settings = [".claude/settings.json", ".claude/settings.local.json"]
    .map((name) => readText(path.join(repo, name)))
    .join("");
  if (/"[^"]*plugin[^"]*"\s*:/i.test(settings)) {
    modes.push("marketplace plugin (plugin key in .claude/settings*.json)");
  }

  const linked = skills.filter((name) => linkTarget(path.join(repo, ".agents/skills", name)) !== null).length;
  const vendored = skills.length - linked;
  if (linked > 0) {
    modes.push(`${linked} linked skill(s)`);
  }
  if (vendored > 0) {
    modes.push(`${vendored} in-repo skill directory(ies)`);
  }
  return modes.length === 0
    ? [finding("S4", "warn", "no shared-skill distribution detected", ["pick vendoring, sync, or a marketplace plugin"])]
    : [finding("S4", "info", "skill distribution", modes)];
};

const checkInstructions = (repo: string, hasGit: boolean): Finding[] => {
  const findings: Finding[] = [];
  const agentsMd = path.join(repo, "AGENTS.md");
  let rootBody = "";
  if (!isFile(agentsMd)) {
    findings.push(finding("I1", "fail", "no root AGENTS.md"));
  } else {
    rootBody = readText(agentsMd);
    const lines = nonEmptyLines(rootBody);
    const size = byteLength(rootBody);
    const gaps: string[] = [];
    if (lines < 20) {
      gaps.push(`only ${lines} non-empty lines`);
    }
    const sections: ReadonlyArray<readonly [RegExp, string]> = [
      [/^#+ .*person/im, "no personality/voice section"],
      [/^#+ .*(rule|polic)/im, "no always-on rules section"],
      [/^#+ .*(workflow|command)/im, "no workflow or commands section"],
      [/^#+ .*skill/im, "no skill routing section"],
    ];
    for (const [heading, label] of sections) {
      if (!heading.test(rootBody)) {
        gaps.push(label);
      }
    }
    if (size > codexMaxBytes) {
      findings.push(
        finding("I1", "fail", "AGENTS.md exceeds the Codex size cap", [`${size} bytes > ${codexMaxBytes}; Codex drops the rest`]),
      );
    } else if (lines > agentsMdMaxLines) {
      gaps.push(`${lines} lines; Claude Code recommends under ${agentsMdMaxLines}`);
    }
    if (gaps.length > 0) {
      findings.push(finding("I1", "warn", "AGENTS.md needs work", gaps));
    } else if (size <= codexMaxBytes) {
      findings.push(finding("I1", "pass", "AGENTS.md covers the baseline sections"));
    }
  }

  const bridges: string[] = [];
  const bodies: string[] = [];
  for (const name of repoFilesNamed(repo, bridgeNames, hasGit)) {
    if (name.endsWith("copilot-instructions.md") && name !== ".github/copilot-instructions.md") {
      continue;
    }
    const target = linkTarget(path.join(repo, name));
    if (target !== null) {
      bridges.push(`${name} -> ${target}`);
      continue;
    }
    const body = readText(path.join(repo, name));
    const lines = nonEmptyLines(body);
    if (body.includes("AGENTS.md") && lines <= bridgeMaxLines) {
      bridges.push(`${name} (${lines} lines, points at AGENTS.md): delete`);
    } else {
      bodies.push(`${name} (${lines} lines): merge into the AGENTS.md in its folder, then delete`);
    }
  }
  if (bodies.length > 0) {
    findings.push(finding("I2", "fail", "instruction files outside AGENTS.md", [...bodies, ...bridges]));
  } else if (bridges.length > 0) {
    findings.push(
      finding("I2", "warn", "leftover bridge files; a CLAUDE.md stops Claude Code reading AGENTS.md", bridges),
    );
  } else {
    findings.push(finding("I2", "pass", "no bridge or client-specific instruction files"));
  }

  const nested = repoFilesNamed(repo, ["AGENTS.md", "AGENTS.override.md"], hasGit).filter((file) => file !== "AGENTS.md");
  if (nested.length === 0) {
    findings.push(finding("I3", "info", "no nested AGENTS.md files"));
    return findings;
  }
  const problems: string[] = [];
  const listed: string[] = [];
  for (const file of nested) {
    if (file.endsWith("AGENTS.override.md")) {
      problems.push(`${file}: override files are Codex-only; fold into AGENTS.md`);
      continue;
    }
    const folder = file.slice(0, file.lastIndexOf("/"));
    listed.push(file);
    if (!rootBody.includes(folder)) {
      problems.push(
        `${file}: root AGENTS.md does not mention ${folder}/; agents launched at the root in Codex or Copilot CLI never load it`,
      );
    }
    const parts = folder.split("/");
    const chain = [path.join(repo, "AGENTS.md"), ...parts.map((_part, depth) => path.join(repo, ...parts.slice(0, depth + 1), "AGENTS.md"))];
    const total = chain.filter(isFile).reduce((sum, item) => sum + byteLength(readText(item)), 0);
    if (total > codexMaxBytes) {
      problems.push(`${file}: ${total} bytes with its parents > ${codexMaxBytes}; Codex truncates`);
    }
  }
  findings.push(
    problems.length > 0
      ? finding("I3", "warn", "nested AGENTS.md issues", problems)
      : finding("I3", "pass", "nested AGENTS.md files are reachable", listed),
  );
  return findings;
};

const checkClients = (repo: string): Finding[] => {
  const findings: Finding[] = [];
  const detected = Object.entries(clientTraces).flatMap(([client, traces]) => {
    const hits = traces.filter((trace) => exists(path.join(repo, trace)));
    return hits.length > 0 ? [`${client}: ${hits.join(", ")}`] : [];
  });
  findings.push(
    finding(
      "C1",
      detected.length > 0 ? "info" : "warn",
      detected.length > 0 ? "client traces found" : "no client traces found",
      detected,
    ),
  );

  if (exists(path.join(repo, ".claude"))) {
    const link = path.join(repo, ".claude/skills");
    const target = linkTarget(link);
    if (target === null && exists(link)) {
      findings.push(finding("C2", "fail", ".claude/skills is a real directory, not a symlink"));
    } else if (target === null) {
      findings.push(finding("C2", "fail", "no .claude/skills symlink to ../.agents/skills"));
    } else if (!target.replaceAll("\\", "/").includes(".agents/skills")) {
      findings.push(finding("C2", "fail", ".claude/skills points elsewhere", [target]));
    } else {
      const ignored = readText(path.join(repo, ".claude/.gitignore"))
        .split(/\r?\n/)
        .some((line) => line.trim().replace(/^\/+|\/+$/g, "") === "skills");
      findings.push(
        ignored
          ? finding("C2", "pass", ".claude/skills symlink present and ignored")
          : finding("C2", "warn", ".claude/skills symlink present but not gitignored", [
              "add 'skills' to .claude/.gitignore",
            ]),
      );
    }
  }

  const vscodeSettings = path.join(repo, ".vscode/settings.json");
  const copilotInUse = clientTraces.copilot.some((trace) => exists(path.join(repo, trace)));
  const hasNested = repoFilesNamed(repo, ["AGENTS.md"], exists(path.join(repo, ".git"))).some((file) => file !== "AGENTS.md");
  if (isFile(vscodeSettings)) {
    const body = readText(vscodeSettings);
    const missing: string[] = [];
    if (!body.includes("chat.useAgentsMdFile")) {
      missing.push("chat.useAgentsMdFile is unset");
    }
    if (hasNested && !body.includes("chat.useNestedAgentsMdFiles")) {
      missing.push("chat.useNestedAgentsMdFiles is unset; VS Code ignores nested AGENTS.md by default");
    }
    findings.push(
      missing.length > 0
        ? finding("C3", "warn", "VS Code settings do not fully enable AGENTS.md", missing)
        : finding("C3", "pass", "VS Code AGENTS.md settings present"),
    );
  } else if (copilotInUse) {
    findings.push(
      finding("C3", "warn", "Copilot in use but no .vscode/settings.json", [
        "VS Code users need chat.useAgentsMdFile enabled",
      ]),
    );
  }
  return findings;
};

const checkStack = (repo: string): Finding[] => {
  const labels: string[] = [];
  for (const [marker, label] of stackMarkers) {
    if (exists(path.join(repo, marker)) && !labels.includes(label)) {
      labels.push(label);
    }
  }
  return [finding("R1", "info", labels.length > 0 ? "stack markers detected" : "no stack markers detected", labels)];
};

const symbols: Record<Status, string> = { pass: "ok  ", warn: "warn", fail: "FAIL", info: "info" };

const renderText = (repo: string, findings: Finding[]): string => {
  const lines = [`agent baseline audit: ${repo}`, ""];
  for (const item of findings) {
    lines.push(`[${symbols[item.status]}] ${item.check} ${item.message}`, ...item.detail.map((detail) => `         - ${detail}`));
  }
  const failed = findings.filter((item) => item.status === "fail").length;
  const warned = findings.filter((item) => item.status === "warn").length;
  lines.push("", `${failed} failed, ${warned} warning(s), ${findings.length} checks`);
  return lines.join("\n");
};

export const auditRepo = (repo: string): Finding[] => {
  const hasGit = exists(path.join(repo, ".git"));
  const skills = checkSkills(repo);
  return [
    ...checkWorkspaces(repo, hasGit),
    ...skills.findings,
    ...checkDistribution(repo, skills.skills),
    ...checkInstructions(repo, hasGit),
    ...checkClients(repo),
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
        repo: { type: "string", default: "." },
        json: { type: "boolean" },
        only: { type: "string", default: "" },
        help: { type: "boolean", short: "h" },
      },
    }));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`);
    return 2;
  }
  if (values.help === true) {
    process.stdout.write(usage);
    return 0;
  }

  const start = values.repo.startsWith("~") ? path.join(os.homedir(), values.repo.slice(1)) : values.repo;
  if (!isDirectory(start)) {
    process.stderr.write(`not a directory: ${start}\n`);
    return 2;
  }
  const repo = findRepoRoot(start);
  if (!exists(path.join(repo, ".git"))) {
    process.stderr.write(`warning: ${repo} is not a git repo; ignore checks are best-effort\n`);
  }

  const wanted = new Set(values.only.split(",").map((item) => item.trim().toUpperCase()).filter((item) => item !== ""));
  const findings = auditRepo(repo).filter((item) => wanted.size === 0 || wanted.has(item.check));

  process.stdout.write(
    values.json === true ? `${JSON.stringify({ repo, findings }, null, 2)}\n` : `${renderText(repo, findings)}\n`,
  );
  return findings.some((item) => item.status === "fail") ? 1 : 0;
};

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  process.exitCode = main(process.argv.slice(2));
}
