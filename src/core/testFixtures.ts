import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach } from "@jest/globals";

const created: string[] = [];

afterEach(() => {
  for (const directory of created.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** A fresh temporary directory, removed after the current test. Resolved through symlinks. */
export const makeTempDir = (): string => {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agentic-tools-test-")));
  created.push(directory);
  return directory;
};

export const writeFile = (target: string, content: string): string => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  return target;
};

export const writeJson = (target: string, value: unknown): string => writeFile(target, `${JSON.stringify(value, null, 2)}\n`);

export const readJson = (target: string): unknown => JSON.parse(fs.readFileSync(target, "utf8"));

export type SkillFixture = {
  domain?: string;
  visibility?: string;
  requires?: string;
  reason?: string;
  description?: string;
  /** Write portability fields under the pre-namespace bare keys. */
  legacy?: boolean;
  body?: string;
};

/** Write `<skillsRoot>/<name>/SKILL.md` with the given metadata. */
export const writeSkill = (skillsRoot: string, name: string, fixture: SkillFixture = {}): string => {
  const prefix = fixture.legacy === true ? "" : "shareable-skills.";
  const legacyKey = { domain: "scope", visibility: "visibility", requires: "requires", reason: "reason" } as const;
  const metadata = (["domain", "visibility", "requires", "reason"] as const)
    .filter((field) => fixture[field] !== undefined)
    .map((field) => `  ${fixture.legacy === true ? legacyKey[field] : `${prefix}${field}`}: "${fixture[field]}"`);
  const lines = [
    "---",
    `name: ${name}`,
    `description: "${fixture.description ?? `Describe ${name}. Use when: testing.`}"`,
    ...(metadata.length > 0 ? ["metadata:", ...metadata] : []),
    "---",
    "",
    fixture.body ?? `# ${name}\n\nBody of ${name}.`,
    "",
  ];
  return writeFile(path.join(skillsRoot, name, "SKILL.md"), lines.join("\n"));
};
