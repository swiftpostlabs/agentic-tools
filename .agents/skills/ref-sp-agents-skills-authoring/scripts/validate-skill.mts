#!/usr/bin/env node
// General skill-quality validator for Agent Skills (see ../SKILL.md).
//
// Checks general well-formedness and authoring quality only: frontmatter shape, name rules,
// description rules, body structure, support-file references, and resource layout. It does NOT
// check the sharing spec (naming grammar, domain registry, visibility, deps, vendoring) — that is
// validated separately by ref-sp-agents-shareable-skills/scripts/validate-sharing.mts. Run both when a skill
// should be good AND shareable.
//
// Requires Node >= 22 (runs .mts directly via type stripping). On Node 22.6-22.17 invoke with
//   node --experimental-strip-types validate-skill.mts <target> [--all]
// On Node >= 23 (or >= 22.18) plain `node validate-skill.mts ...` works.
//
// Usage:
//   node validate-skill.mts <skill-dir>
//   node validate-skill.mts <skills-root> --all
//   node validate-skill.mts <target> [--format text|json] [--warnings-as-errors]

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

type Severity = "error" | "warning";

interface Finding {
  skill: string;
  severity: Severity;
  message: string;
}

type Metadata = Record<string, string>;
type FrontmatterValue = string | Metadata;
type Frontmatter = Record<string, FrontmatterValue>;

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "allowed-tools",
  "argument-hint",
  "compatibility",
  "description",
  "license",
  "metadata",
  "name",
]);
const NAME_PATTERN = /^[a-z0-9-]{1,64}$/;
const INTERNAL_REFERENCE_PATTERN = /[`(](\.\/(?:assets|evals|references|scripts)\/[^`)\s#]+)/g;
const VALID_RESOURCE_DIRS = new Set(["assets", "evals", "references", "scripts"]);

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

// --- validation ---

function validateName(skillDir: string, frontmatter: Frontmatter, findings: Finding[]): string {
  const folder = basename(skillDir);
  const rawName = frontmatter["name"];
  const add = (severity: Severity, message: string, skill: string): void => {
    findings.push({ skill, severity, message });
  };

  if (typeof rawName !== "string" || rawName.trim() === "") {
    add("error", "frontmatter must include non-empty string 'name'", folder);
    return folder;
  }

  const name = rawName.trim();
  if (!NAME_PATTERN.test(name)) {
    add("error", "name must be 1-64 chars of lowercase letters, digits, and hyphens", name);
  }
  if (name.startsWith("-") || name.endsWith("-") || name.includes("--")) {
    add("error", "name cannot start or end with a hyphen or contain consecutive hyphens", name);
  }
  if (name !== folder) {
    add("error", `name must match folder name '${folder}'`, name);
  }
  if (!name.startsWith("ref-") && !name.startsWith("tool-")) {
    add("warning", "repo convention expects skill names to start with ref- or tool-", name);
  }
  return name;
}

function validateFrontmatter(skillDir: string, frontmatter: Frontmatter, findings: Finding[]): string {
  const skillLabel = validateName(skillDir, frontmatter, findings);
  const add = (severity: Severity, message: string): void => {
    findings.push({ skill: skillLabel, severity, message });
  };

  const unexpected = Object.keys(frontmatter)
    .filter((key) => !ALLOWED_TOP_LEVEL_KEYS.has(key))
    .sort();
  if (unexpected.length > 0) {
    add("warning", `unexpected frontmatter keys: ${unexpected.join(", ")}`);
  }

  const description = frontmatter["description"];
  if (typeof description !== "string" || description.trim() === "") {
    add("error", "frontmatter must include non-empty string 'description'");
  } else if (description.length > 1024) {
    add("error", "description must be 1024 characters or less");
  } else if (description.includes("<") || description.includes(">")) {
    add("error", "description must not contain angle brackets");
  }

  // Metadata is optional per the Agent Skills spec. When present, it must be a string->string map.
  // Scope/visibility/dependency semantics are the sharing spec's job (validate-sharing.mts).
  const metadata = frontmatter["metadata"];
  if (metadata !== undefined) {
    if (typeof metadata !== "object") {
      add("error", "metadata must be a string-to-string mapping");
    } else {
      for (const value of Object.values(metadata)) {
        if (typeof value !== "string") {
          add("error", "metadata keys and values must be strings");
          break;
        }
      }
    }
  }

  for (const key of ["compatibility", "license", "argument-hint"]) {
    const value = frontmatter[key];
    if (value !== undefined && typeof value !== "string") {
      add("error", `${key} must be a string when present`);
    }
  }

  return skillLabel;
}

function validateBody(skillDir: string, skillLabel: string, body: string, findings: Finding[]): void {
  const add = (severity: Severity, message: string): void => {
    findings.push({ skill: skillLabel, severity, message });
  };
  const lowered = body.toLowerCase();

  if (!lowered.includes("## purpose")) {
    add("warning", "SKILL.md should include a Purpose section");
  }
  if (!lowered.includes("## when to use")) {
    add("warning", "SKILL.md should include a When to use section");
  }
  if (body.split(/\r?\n/).length > 500) {
    add("warning", "SKILL.md is over 500 lines; consider progressive disclosure");
  }

  for (const match of body.matchAll(INTERNAL_REFERENCE_PATTERN)) {
    const rawPath = match[1].replace(/[.,;:]+$/, "");
    const targetPath = join(skillDir, rawPath.slice(2));
    if (!existsSync(targetPath)) {
      add("error", `referenced support file does not exist: ${rawPath}`);
    }
  }

  if (body.includes("../")) {
    add("warning", "body contains '../'; prefer same-skill relative or repo-root-relative paths");
  }
}

function validateResources(skillDir: string, skillLabel: string, findings: Finding[]): void {
  const children = readdirSync(skillDir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const child of children) {
    if (child.name === "SKILL.md" || child.name.startsWith(".")) {
      continue;
    }
    if (child.isDirectory() && !VALID_RESOURCE_DIRS.has(child.name)) {
      findings.push({
        skill: skillLabel,
        severity: "warning",
        message: `unrecognized resource directory '${child.name}'`,
      });
    }
  }
}

function validateSkill(skillDir: string): Finding[] {
  const findings: Finding[] = [];
  const skillMd = join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    return [{ skill: basename(skillDir), severity: "error", message: "SKILL.md not found" }];
  }

  let frontmatter: Frontmatter;
  let body: string;
  try {
    const parsed = parseFrontmatter(readFileSync(skillMd, "utf8"));
    frontmatter = parsed.frontmatter;
    body = parsed.body;
  } catch (error) {
    return [{ skill: basename(skillDir), severity: "error", message: (error as Error).message }];
  }

  const skillLabel = validateFrontmatter(skillDir, frontmatter, findings);
  validateBody(skillDir, skillLabel, body, findings);
  validateResources(skillDir, skillLabel, findings);
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
    console.error("usage: validate-skill.mts <target> [--all] [--format text|json] [--warnings-as-errors]");
    return 2;
  }

  const resolvedTarget = resolve(target);
  if (!existsSync(resolvedTarget)) {
    console.error(`Target not found: ${resolvedTarget}`);
    return 2;
  }

  const skillDirs = findSkillDirs(resolvedTarget, validateAll);
  const findings: Finding[] = [];
  for (const skillDir of skillDirs) {
    findings.push(...validateSkill(skillDir));
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
