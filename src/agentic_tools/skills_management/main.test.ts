import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";

import {
  discoverSkillManifests,
  resolvePackageSourceRoot,
  runSkillsManagement,
} from "./main.ts";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agentic-tools-node-skills-"));
}

function cleanupTempDir(tempDir: string): void {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function writeSkillInRoot(
  skillsRoot: string,
  name: string,
  metadata: Record<string, string> = {},
): void {
  const skillDir = path.join(skillsRoot, name);
  fs.mkdirSync(skillDir, { recursive: true });

  const lines = ["---", `name: ${name}`, 'description: "Test skill."'];
  if (Object.keys(metadata).length > 0) {
    lines.push("metadata:");
    for (const [key, value] of Object.entries(metadata)) {
      lines.push(`  ${key}: "${value}"`);
    }
  }

  lines.push("---", "", "# Test Skill", "");
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), lines.join("\n"), "utf8");
}

function writeRepoSkill(
  repoRoot: string,
  name: string,
  metadata: Record<string, string> = {},
): void {
  writeSkillInRoot(path.join(repoRoot, ".agents", "skills"), name, metadata);
}

describe("skills-management Node CLI", () => {
  test("discoverSkillManifests accepts a packaged skills root path", () => {
    const tempDir = createTempDir();
    try {
      const packagedSkillsRoot = path.join(
        tempDir,
        "node_modules",
        "agentic-tools",
        ".agents",
        "skills",
      );
      writeSkillInRoot(packagedSkillsRoot, "ref-alpha", {
        "shareable-skills.visibility": "shareable",
      });

      const manifests = discoverSkillManifests(packagedSkillsRoot);

      expect(Object.keys(manifests)).toEqual(["ref-alpha"]);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("resolvePackageSourceRoot resolves an installed package from node_modules", () => {
    const tempDir = createTempDir();
    try {
      const packageRoot = path.join(tempDir, "node_modules", "agentic-tools");
      fs.mkdirSync(packageRoot, { recursive: true });
      fs.writeFileSync(
        path.join(packageRoot, "package.json"),
        '{"name":"agentic-tools","version":"0.1.0"}\n',
        "utf8",
      );

      expect(resolvePackageSourceRoot("agentic-tools", tempDir)).toBe(packageRoot);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runSkillsManagement sync links configured skills from an installed package", async () => {
    const tempDir = createTempDir();
    try {
      const packageRoot = path.join(tempDir, "node_modules", "agentic-tools");
      fs.mkdirSync(packageRoot, { recursive: true });
      fs.writeFileSync(
        path.join(packageRoot, "package.json"),
        '{"name":"agentic-tools","version":"0.1.0"}\n',
        "utf8",
      );
      writeRepoSkill(packageRoot, "ref-alpha", {
        "shareable-skills.visibility": "shareable",
      });

      const destinationAgentsDir = path.join(tempDir, ".agents");
      fs.mkdirSync(destinationAgentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(destinationAgentsDir, "skills.json"),
        JSON.stringify(
          {
            sources: [
              {
                from: "package:agentic-tools",
                skills: ["ref-alpha"],
              },
            ],
          },
          null,
          2,
        ),
        "utf8",
      );

      const messages: string[] = [];
      const exitCode = await runSkillsManagement(["sync", "--to", tempDir], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      const linkedSkillDir = path.join(tempDir, ".agents", "skills", "ref-alpha");
      expect(exitCode).toBe(0);
      expect(fs.lstatSync(linkedSkillDir).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(linkedSkillDir)).toBe(
        path.join(packageRoot, ".agents", "skills", "ref-alpha"),
      );
      expect(messages.join("\n")).toMatch(/Linked .*ref-alpha/u);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runSkillsManagement sync reports missing configured skills by source", async () => {
    const tempDir = createTempDir();
    try {
      const packageRoot = path.join(tempDir, "node_modules", "agentic-tools");
      fs.mkdirSync(packageRoot, { recursive: true });
      fs.writeFileSync(
        path.join(packageRoot, "package.json"),
        '{"name":"agentic-tools","version":"0.1.0"}\n',
        "utf8",
      );
      writeRepoSkill(packageRoot, "ref-alpha", {
        "shareable-skills.visibility": "shareable",
      });

      const destinationAgentsDir = path.join(tempDir, ".agents");
      fs.mkdirSync(destinationAgentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(destinationAgentsDir, "skills.json"),
        JSON.stringify(
          {
            sources: [
              {
                from: "package:agentic-tools",
                skills: ["ref-alpha", "ref-missing"],
              },
            ],
          },
          null,
          2,
        ),
        "utf8",
      );

      const messages: string[] = [];
      const exitCode = await runSkillsManagement(["sync", "--to", tempDir], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      expect(exitCode).toBe(1);
      expect(messages.join("\n")).toMatch(/Skills config references missing skills:/u);
      expect(messages.join("\n")).toMatch(/source 'package:agentic-tools': ref-missing/u);
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});