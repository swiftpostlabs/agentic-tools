#!/usr/bin/env node
// Sharing-spec validator for Agent Skills (see ../SKILL.md and ../references/spec.md).
//
// Checks the SHARING spec only: name grammar, domain registry, visibility tiers, dependency
// semantics, tags, and vendoring. All portability fields live under the metadata.shareable-skills.*
// namespace; `license` stays top-level. General skill quality is a separate concern validated by
// ref-sp-agents-skills-authoring/scripts/validate-skill.mts. Run both when a skill should be good AND
// shareable.
//
// Requires Node >= 22 (runs .mts directly via type stripping). On Node 22.6-22.17 invoke with
//   node --experimental-strip-types validate-sharing.mts <target> [--all]
// On Node >= 23 (or >= 22.18) plain `node validate-sharing.mts ...` works.
//
// Usage:
//   node validate-sharing.mts <skill-dir>
//   node validate-sharing.mts <skills-root> --all
//   node validate-sharing.mts <target> [--format text|json] [--warnings-as-errors]

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

type Severity = "error" | "warning";

interface Finding {
  skill: string;
  severity: Severity;
  message: string;
}

interface DomainEntry {
  description: string;
  belongsWhen: string;
}

interface Registry {
  phase: number;
  domains: Record<string, DomainEntry>;
  reservedTokens: string[];
  tags: string[];
  domainAliases: Record<string, string>;
  aliases: Record<string, string>;
}

type Metadata = Record<string, string>;
type FrontmatterValue = string | Metadata;
type Frontmatter = Record<string, FrontmatterValue>;

type Visibility = "repo-local" | "organization" | "public";

interface SkillInfo {
  visibility: Visibility | null;
}

// Visibility ordered from least to most portable. A skill may only hard-require
// dependencies at least as visible as itself, so anything it needs travels with it.
const VISIBILITY_RANK: Record<Visibility, number> = {
  "repo-local": 0,
  organization: 1,
  public: 2,
};

function visibilityRank(visibility: Visibility | null): number | null {
  return visibility !== null && Object.hasOwn(VISIBILITY_RANK, visibility) ? VISIBILITY_RANK[visibility] : null;
}

// --- frontmatter parsing (self-contained; no YAML dependency) ---

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

function leadingSpaces(line: string): number {
  return line.length - line.replace(/^ +/, "").length;
}

function parseFrontmatter(text: string): { frontmatter: Frontmatter; body: string } {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== "---") {
    throw new Error("SKILL.md is missing opening YAML frontmatter delimiter");
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    throw new Error("SKILL.md is missing closing YAML frontmatter delimiter");
  }

  const fmLines = lines.slice(1, endIndex);
  const frontmatter: Frontmatter = {};
  let currentMapping: Metadata | null = null;
  let index = 0;

  while (index < fmLines.length) {
    const line = fmLines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (leadingSpaces(line) === 0) {
      const sep = line.indexOf(":");
      if (sep === -1) {
        throw new Error(`Invalid frontmatter line: ${line}`);
      }
      const key = line.slice(0, sep).trim();
      const rawValue = line.slice(sep + 1).trim();

      if (rawValue === "") {
        currentMapping = {};
        frontmatter[key] = currentMapping;
        index += 1;
        continue;
      }

      if (rawValue === ">" || rawValue === "|" || rawValue === ">-" || rawValue === "|-") {
        const blockLines: string[] = [];
        index += 1;
        while (index < fmLines.length) {
          const cont = fmLines[index];
          if (cont.trim() !== "" && leadingSpaces(cont) === 0) {
            break;
          }
          blockLines.push(cont.trim());
          index += 1;
        }
        frontmatter[key] = rawValue.startsWith("|")
          ? blockLines.join("\n")
          : blockLines.filter((entry) => entry !== "").join(" ");
        currentMapping = null;
        continue;
      }

      frontmatter[key] = stripYamlString(rawValue);
      currentMapping = null;
      index += 1;
      continue;
    }

    if (currentMapping === null) {
      index += 1;
      continue;
    }

    const trimmed = line.trim();
    const sep = trimmed.indexOf(":");
    if (sep === -1) {
      throw new Error(`Invalid nested frontmatter line: ${line}`);
    }
    currentMapping[trimmed.slice(0, sep).trim()] = stripYamlString(trimmed.slice(sep + 1).trim());
    index += 1;
  }

  const body = lines.slice(endIndex + 1).join("\n");
  return { frontmatter, body };
}

// --- helpers ---

function asMetadata(frontmatter: Frontmatter): Metadata {
  const value = frontmatter["metadata"];
  if (value && typeof value === "object") {
    return value;
  }
  return {};
}

// Portability fields live under the `metadata.shareable-skills.*` namespace so they cannot collide
// with spec-defined or third-party metadata keys. `ss(metadata, "domain")` reads
// `metadata["shareable-skills.domain"]`.
const SS_PREFIX = "shareable-skills.";

function ss(metadata: Metadata, key: string): string | undefined {
  return metadata[SS_PREFIX + key];
}

function splitList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function computeVisibility(metadata: Metadata): string | null {
  const visibility = ss(metadata, "visibility");
  return visibility !== undefined ? visibility : null;
}

function loadRegistry(): { registry: Registry | null; error: string | null } {
  // The registry lives inside this skill (references/registry.json) so it travels with the skill
  // when the skill is vendored or symlinked, independent of the skills root being validated.
  const path = resolve(import.meta.dirname, "..", "references", "registry.json");
  if (!existsSync(path)) {
    return { registry: null, error: `registry.json not found at ${path}` };
  }
  try {
    return { registry: JSON.parse(readFileSync(path, "utf8")) as Registry, error: null };
  } catch (error) {
    return { registry: null, error: `registry.json is not valid JSON: ${(error as Error).message}` };
  }
}

function loadSkillIndex(skillsRoot: string): Map<string, SkillInfo> {
  const index = new Map<string, SkillInfo>();
  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillMd = join(skillsRoot, entry.name, "SKILL.md");
    if (!existsSync(skillMd)) {
      continue;
    }
    try {
      const { frontmatter } = parseFrontmatter(readFileSync(skillMd, "utf8"));
      const visibility = computeVisibility(asMetadata(frontmatter));
      index.set(entry.name, { visibility: visibility as Visibility | null });
    } catch {
      index.set(entry.name, { visibility: null });
    }
  }
  return index;
}

// --- per-skill validation ---

function validateSharingSkill(
  skillDir: string,
  registry: Registry | null,
  index: Map<string, SkillInfo>,
): Finding[] {
  const findings: Finding[] = [];
  const label = basename(skillDir);
  const phase = registry?.phase ?? 0;
  const add = (severity: Severity, message: string): void => {
    findings.push({ skill: label, severity, message });
  };
  // Downgrade a phase-dependent error to a warning until the migration reaches minPhase.
  const gate = (target: Severity, minPhase: number): Severity => (phase >= minPhase ? target : "warning");

  const skillMd = join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    add("error", "SKILL.md not found");
    return findings;
  }

  let frontmatter: Frontmatter;
  let body: string;
  try {
    const parsed = parseFrontmatter(readFileSync(skillMd, "utf8"));
    frontmatter = parsed.frontmatter;
    body = parsed.body;
  } catch (error) {
    add("error", (error as Error).message);
    return findings;
  }

  const metadata = asMetadata(frontmatter);

  // --- domain ---
  const domain = ss(metadata, "domain");
  if (!domain) {
    add(gate("error", 1), "missing domain (metadata.shareable-skills.domain)");
  } else if (registry) {
    if (Object.hasOwn(registry.domains, domain)) {
      // registered target domain
    } else if (Object.hasOwn(registry.domainAliases, domain)) {
      add(
        "warning",
        `domain '${domain}' is a legacy domain; migrate to '${registry.domainAliases[domain]}' and move specifics to tags`,
      );
    } else {
      add(
        "error",
        `domain '${domain}' is not a registered domain. The vocabulary is intentionally growing — open an issue explaining what and why it matters, then add it to registry.json`,
      );
    }
  }

  // --- visibility (and license for public) ---
  const visibility = computeVisibility(metadata);
  let shareable = false;
  if (!visibility) {
    add(gate("error", 2), "missing visibility (metadata.shareable-skills.visibility: repo-local | organization | public)");
  } else {
    if (visibility !== "repo-local" && visibility !== "organization" && visibility !== "public") {
      add("error", "visibility must be one of repo-local, organization, public");
    }
    shareable = visibility === "organization" || visibility === "public";
    if (visibility === "public") {
      const license = frontmatter["license"];
      if (typeof license !== "string" || license.trim() === "") {
        add("error", "visibility 'public' requires a top-level 'license'");
      }
    }
  }

  if (shareable && !ss(metadata, "owner")) {
    add(gate("warning", 2), "shareable skill should declare metadata.shareable-skills.owner (the canonical repo)");
  }

  // --- name grammar (only enforced once owner-prefix is present) ---
  const ownerPrefix = ss(metadata, "owner-prefix");
  const rawName = frontmatter["name"];
  const name = typeof rawName === "string" ? rawName : label;
  if (ownerPrefix) {
    const segments = name.split("-");
    const type = segments[0];
    if (type !== "ref" && type !== "tool") {
      add("error", "name must start with 'ref-' or 'tool-'");
    } else if (segments[1] !== ownerPrefix) {
      add(
        "error",
        `name owner segment '${segments[1] ?? ""}' does not match metadata.shareable-skills.owner-prefix '${ownerPrefix}'`,
      );
    } else if (type === "ref" && domain && registry && Object.hasOwn(registry.domains, domain) && segments[2] !== domain) {
      add("error", `name domain segment '${segments[2] ?? ""}' does not match metadata.shareable-skills.domain '${domain}'`);
    }
  } else {
    add(
      gate("warning", 2),
      "skill not yet migrated to the owner-prefixed name grammar (ref-<owner>-<domain>-... / tool-<owner>-<verb>-...)",
    );
  }

  // --- dependencies ---
  const aliases = registry?.aliases ?? {};
  const requires = splitList(ss(metadata, "requires"));
  const selfRank = visibilityRank(visibility as Visibility | null);
  for (const dep of requires) {
    const resolved = Object.hasOwn(aliases, dep) ? aliases[dep] : dep;
    const info = index.get(resolved);
    if (!info) {
      add("error", `requires '${dep}' does not resolve to an existing skill`);
      continue;
    }
    // A skill must not hard-depend on a lower-visibility (less portable) skill,
    // or the dependency would not travel everywhere the dependent skill can.
    const depRank = visibilityRank(info.visibility);
    if (selfRank !== null && depRank !== null && depRank < selfRank) {
      add(
        "error",
        `${visibility} skill must not hard-depend on lower-visibility ${info.visibility} skill '${dep}'`,
      );
    }
  }

  // --- tags (advisory) ---
  if (registry) {
    const knownTags = new Set(registry.tags);
    for (const tag of splitList(ss(metadata, "tags"))) {
      if (!knownTags.has(tag)) {
        add("warning", `unknown tag '${tag}' (advisory; consider adding it to registry.json tags)`);
      }
    }
  }

  // --- vendoring ---
  if (ss(metadata, "vendored-sha")) {
    if (!ss(metadata, "vendored-time")) {
      add("warning", "vendored copy should record metadata.shareable-skills.vendored-time");
    }
    if (!ss(metadata, "owner")) {
      add("warning", "vendored copy should keep metadata.shareable-skills.owner pointing upstream");
    }
    const lowered = body.toLowerCase();
    if (!(lowered.includes("vendored") && lowered.includes("do not edit"))) {
      add(
        "warning",
        "vendored copy should carry a read-only body banner (e.g. '⚠️ Vendored copy — do not edit')",
      );
    }
  }

  return findings;
}

// --- CLI ---

function findSkillDirs(target: string, validateAll: boolean): string[] {
  if (validateAll) {
    return readdirSync(target, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(target, entry.name, "SKILL.md")))
      .map((entry) => join(target, entry.name))
      .sort();
  }
  return [target];
}

function printText(findings: Finding[], checked: number): void {
  const errors = findings.filter((finding) => finding.severity === "error").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  if (findings.length > 0) {
    for (const finding of findings) {
      console.log(`${finding.severity.toUpperCase()} ${finding.skill}: ${finding.message}`);
    }
  } else {
    console.log("No findings.");
  }
  console.log(`Summary: checked=${checked} errors=${errors} warnings=${warnings}`);
}

function main(): number {
  const argv = process.argv.slice(2);
  let target: string | undefined;
  let validateAll = false;
  let format: "text" | "json" = "text";
  let warningsAsErrors = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") {
      validateAll = true;
    } else if (arg === "--warnings-as-errors") {
      warningsAsErrors = true;
    } else if (arg === "--format") {
      const value = argv[i + 1];
      i += 1;
      if (value !== "text" && value !== "json") {
        console.error("--format must be 'text' or 'json'");
        return 2;
      }
      format = value;
    } else if (arg.startsWith("--format=")) {
      const value = arg.slice("--format=".length);
      if (value !== "text" && value !== "json") {
        console.error("--format must be 'text' or 'json'");
        return 2;
      }
      format = value;
    } else if (!arg.startsWith("-") && target === undefined) {
      target = arg;
    } else {
      console.error(`Unrecognized argument: ${arg}`);
      return 2;
    }
  }

  if (target === undefined) {
    console.error("usage: validate-sharing.mts <target> [--all] [--format text|json] [--warnings-as-errors]");
    return 2;
  }

  const resolvedTarget = resolve(target);
  if (!existsSync(resolvedTarget)) {
    console.error(`Target not found: ${resolvedTarget}`);
    return 2;
  }

  const skillsRoot = validateAll ? resolvedTarget : dirname(resolvedTarget);
  const { registry, error: registryError } = loadRegistry();
  const index = loadSkillIndex(skillsRoot);

  const findings: Finding[] = [];
  if (registryError) {
    findings.push({ skill: "registry", severity: "error", message: registryError });
  }

  const skillDirs = findSkillDirs(resolvedTarget, validateAll);
  for (const skillDir of skillDirs) {
    findings.push(...validateSharingSkill(skillDir, registry, index));
  }

  if (format === "json") {
    console.log(JSON.stringify({ checked: skillDirs.length, findings }, null, 2));
  } else {
    printText(findings, skillDirs.length);
  }

  const hasErrors = findings.some((finding) => finding.severity === "error");
  const hasWarnings = findings.some((finding) => finding.severity === "warning");
  return hasErrors || (warningsAsErrors && hasWarnings) ? 1 : 0;
}

process.exitCode = main();
