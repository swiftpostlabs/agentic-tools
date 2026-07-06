#!/usr/bin/env node
// Vendored-skill drift checker for Agent Skills (see ../SKILL.md §7 and ../references/spec.md §7).
//
// `shareable-skills.vendored-sha` / `.vendored-time` record where a vendored copy came from, but
// recording provenance does not ENFORCE it. This tool turns the pin into a guarantee: for each
// skill carrying `shareable-skills.vendored-sha`, it compares the local copy against the upstream
// commit for that skill's folder and reports two independent states:
//
//   • edited — the local copy was hand-edited since it was vendored (its change is lost on the next
//     re-vendor and never reaches other consumers). Route the change upstream instead (§8).
//   • stale  — upstream has advanced past the pinned SHA (the copy is behind; consider re-vendoring).
//
// The vendoring markers themselves (the `shareable-skills.vendored-*` / `.forked-from` frontmatter
// lines and the read-only body banner) are IGNORED when diffing, since they are expected to differ.
//
// This is deliberately SEPARATE from validate-sharing.mts: sharing-metadata validation and drift
// detection are distinct responsibilities. Requires Node >= 22 (runs .mts via type stripping) and
// `git` on PATH.
//
// Usage:
//   node check-vendored-drift.mts <skills-root>
//   node check-vendored-drift.mts <skills-root> --upstream <local-checkout-or-git-url>
//   node check-vendored-drift.mts <skills-root> [--upstream-subdir .agents/skills] [--format text|json]
//
// Upstream resolution: `--upstream` may be a local git checkout (fastest, offline, deterministic) or
// a git URL. With neither, the upstream URL is derived from each skill's `shareable-skills.owner`
// as https://github.com/<owner>.git and shallow-cloned into a per-owner cache under the OS temp dir.
// `--upstream-subdir` is where skills live inside upstream (default `.agents/skills`; the spec keeps
// the vendored name identical to upstream, so the folder name matches).

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

type Metadata = Record<string, string>;
type FrontmatterValue = string | Metadata;
type Frontmatter = Record<string, FrontmatterValue>;

type DriftState = "ok" | "edited" | "stale" | "edited+stale" | "error";

interface Report {
  skill: string;
  owner: string;
  vendoredSha: string;
  state: DriftState;
  detail: string;
}

// --- frontmatter parsing (shared shape with validate-sharing.mts; self-contained, no YAML dep) ---

function leadingSpaces(line: string): number {
  return line.length - line.replace(/^ +/, "").length;
}

function stripYamlString(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    trimmed[0] === trimmed[trimmed.length - 1] &&
    (trimmed[0] === "'" || trimmed[0] === '"')
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(text: string): Frontmatter {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return {};
  }
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) {
    return {};
  }
  const frontmatter: Frontmatter = {};
  let mapping: Metadata | null = null;
  for (let i = 1; i < end; i += 1) {
    const line = lines[i];
    if (line.trim() === "") {
      continue;
    }
    if (leadingSpaces(line) === 0) {
      const sep = line.indexOf(":");
      if (sep === -1) {
        continue;
      }
      const key = line.slice(0, sep).trim();
      const raw = line.slice(sep + 1).trim();
      if (raw === "") {
        mapping = {};
        frontmatter[key] = mapping;
      } else {
        frontmatter[key] = stripYamlString(raw);
        mapping = null;
      }
      continue;
    }
    if (mapping !== null) {
      const trimmed = line.trim();
      const sep = trimmed.indexOf(":");
      if (sep !== -1) {
        mapping[trimmed.slice(0, sep).trim()] = stripYamlString(trimmed.slice(sep + 1).trim());
      }
    }
  }
  return frontmatter;
}

function asMetadata(frontmatter: Frontmatter): Metadata {
  const value = frontmatter["metadata"];
  return value && typeof value === "object" ? value : {};
}

function ss(metadata: Metadata, key: string): string | undefined {
  return metadata["shareable-skills." + key];
}

// --- diff normalization: drop the lines that are EXPECTED to differ on a vendored copy ---

function isVendoringFrontmatterKey(key: string): boolean {
  return key.startsWith("shareable-skills.vendored-") || key === "shareable-skills.forked-from";
}

function isBannerLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith(">")) {
    return false;
  }
  const lowered = trimmed.toLowerCase();
  return lowered.includes("vendored") || lowered.includes("do not edit");
}

// Normalize a SKILL.md so the vendoring markers do not register as drift. Non-SKILL files are
// compared verbatim.
function normalizeForDiff(relPath: string, content: string): string {
  if (basename(relPath) !== "SKILL.md") {
    return content;
  }
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let inFrontmatter = false;
  let seenFirstDelim = false;
  for (const line of lines) {
    if (line.trim() === "---") {
      if (!seenFirstDelim) {
        seenFirstDelim = true;
        inFrontmatter = true;
      } else if (inFrontmatter) {
        inFrontmatter = false;
      }
      out.push(line);
      continue;
    }
    if (inFrontmatter && leadingSpaces(line) > 0) {
      const trimmed = line.trim();
      const sep = trimmed.indexOf(":");
      if (sep !== -1 && isVendoringFrontmatterKey(trimmed.slice(0, sep).trim())) {
        continue;
      }
    }
    if (!inFrontmatter && isBannerLine(line)) {
      continue;
    }
    out.push(line);
  }
  // Removing a banner that was padded by blank lines would otherwise leave a double blank and read
  // as drift; collapse runs of blank lines so only real content differences register.
  const collapsed: string[] = [];
  for (const line of out) {
    if (line.trim() === "" && collapsed.length > 0 && collapsed[collapsed.length - 1].trim() === "") {
      continue;
    }
    collapsed.push(line);
  }
  return collapsed.join("\n");
}

// --- git helpers ---

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function tryGit(cwd: string, args: string[]): string | null {
  try {
    return git(cwd, args);
  } catch {
    return null;
  }
}

// Resolve an upstream working repo for the given owner. A local checkout is used directly; a URL (or
// a derived github URL) is shallow-cloned once per owner into a temp cache.
const upstreamCache = new Map<string, string | null>();

function resolveUpstream(owner: string, explicit: string | undefined): string | null {
  const key = explicit ?? owner;
  if (upstreamCache.has(key)) {
    return upstreamCache.get(key) ?? null;
  }
  let repo: string | null = null;
  if (explicit && existsSync(join(explicit, ".git"))) {
    repo = resolve(explicit);
  } else {
    const url = explicit ?? `https://github.com/${owner}.git`;
    const dir = mkdtempSync(join(tmpdir(), "skill-drift-"));
    // Partial clone: fetch commit graph now, blobs on demand when we `git show` them.
    if (tryGit(process.cwd(), ["clone", "--filter=blob:none", "--no-checkout", url, dir]) !== null) {
      repo = dir;
    }
  }
  upstreamCache.set(key, repo);
  return repo;
}

// --- per-skill drift check ---

function checkSkill(
  skillDir: string,
  explicitUpstream: string | undefined,
  upstreamSubdir: string,
): Report | null {
  const label = basename(skillDir);
  const skillMd = join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    return null;
  }
  const metadata = asMetadata(parseFrontmatter(readFileSync(skillMd, "utf8")));
  const vendoredSha = ss(metadata, "vendored-sha");
  if (!vendoredSha) {
    return null; // not a vendored copy
  }
  const owner = ss(metadata, "owner") ?? "";
  const mk = (state: DriftState, detail: string): Report => ({
    skill: label,
    owner,
    vendoredSha,
    state,
    detail,
  });

  if (!owner) {
    return mk("error", "vendored copy is missing shareable-skills.owner (cannot locate upstream)");
  }
  const upstream = resolveUpstream(owner, explicitUpstream);
  if (!upstream) {
    return mk("error", `could not resolve upstream for owner '${owner}' (pass --upstream)`);
  }

  const upstreamPath = `${upstreamSubdir}/${label}`;
  const filesAtSha = tryGit(upstream, ["ls-tree", "-r", "--name-only", vendoredSha, "--", upstreamPath]);
  if (filesAtSha === null) {
    return mk("error", `commit ${vendoredSha} or path ${upstreamPath} not found upstream`);
  }
  const upstreamFiles = filesAtSha.split("\n").map((l) => l.trim()).filter(Boolean);
  if (upstreamFiles.length === 0) {
    return mk("error", `no files at ${upstreamPath}@${vendoredSha} upstream`);
  }

  // edited: any local file differs from upstream@sha after normalizing away vendoring markers.
  const edits: string[] = [];
  for (const upstreamFile of upstreamFiles) {
    const rel = upstreamFile.slice(`${upstreamSubdir}/${label}/`.length);
    const localFile = join(skillDir, rel);
    const upstreamContent = tryGit(upstream, ["show", `${vendoredSha}:${upstreamFile}`]);
    const localContent = existsSync(localFile) ? readFileSync(localFile, "utf8") : null;
    if (localContent === null) {
      edits.push(`${rel} (missing locally)`);
      continue;
    }
    if (upstreamContent === null) {
      edits.push(`${rel} (unreadable upstream)`);
      continue;
    }
    if (normalizeForDiff(rel, localContent).trimEnd() !== normalizeForDiff(rel, upstreamContent).trimEnd()) {
      edits.push(rel);
    }
  }

  // stale: upstream default branch has commits touching the folder after the pinned sha.
  const advanced = tryGit(upstream, ["log", "--oneline", `${vendoredSha}..HEAD`, "--", upstreamPath]);
  const isStale = advanced !== null && advanced.trim() !== "";

  const isEdited = edits.length > 0;
  if (isEdited && isStale) {
    return mk("edited+stale", `edited: ${edits.join(", ")}; upstream advanced past ${vendoredSha}`);
  }
  if (isEdited) {
    return mk("edited", `local edits not upstream: ${edits.join(", ")}`);
  }
  if (isStale) {
    return mk("stale", `upstream advanced past ${vendoredSha}; consider re-vendoring`);
  }
  return mk("ok", `in sync with ${owner}@${vendoredSha}`);
}

// --- CLI ---

function findSkillDirs(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(root, e.name, "SKILL.md")))
    .map((e) => join(root, e.name))
    .sort();
}

function main(): number {
  const argv = process.argv.slice(2);
  let root: string | undefined;
  let upstream: string | undefined;
  let upstreamSubdir = ".agents/skills";
  let format: "text" | "json" = "text";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--upstream") {
      upstream = argv[(i += 1)];
    } else if (arg === "--upstream-subdir") {
      upstreamSubdir = argv[(i += 1)];
    } else if (arg === "--format") {
      const value = argv[(i += 1)];
      if (value !== "text" && value !== "json") {
        console.error("--format must be 'text' or 'json'");
        return 2;
      }
      format = value;
    } else if (!arg.startsWith("-") && root === undefined) {
      root = arg;
    } else {
      console.error(`Unrecognized argument: ${arg}`);
      return 2;
    }
  }

  if (root === undefined) {
    console.error("usage: check-vendored-drift.mts <skills-root> [--upstream <path|url>] [--upstream-subdir <dir>] [--format text|json]");
    return 2;
  }
  const resolvedRoot = resolve(root);
  if (!existsSync(resolvedRoot)) {
    console.error(`Skills root not found: ${resolvedRoot}`);
    return 2;
  }

  const reports: Report[] = [];
  for (const skillDir of findSkillDirs(resolvedRoot)) {
    const report = checkSkill(skillDir, upstream, upstreamSubdir);
    if (report) {
      reports.push(report);
    }
  }

  if (format === "json") {
    console.log(JSON.stringify({ checked: reports.length, reports }, null, 2));
  } else if (reports.length === 0) {
    console.log("No vendored skills found (nothing to check).");
  } else {
    for (const report of reports) {
      console.log(`${report.state.toUpperCase()} ${report.skill}: ${report.detail}`);
    }
    const drift = reports.filter((r) => r.state !== "ok").length;
    console.log(`Summary: vendored=${reports.length} drift/errors=${drift}`);
  }

  return reports.some((r) => r.state !== "ok") ? 1 : 0;
}

process.exitCode = main();
