// @ts-check

import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
    discoverSkillManifests,
    resolvePackageSourceRoot,
    runSkillsManagement,
} from "./main.mjs";

const createTempDir = () => {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agentic-tools-node-skills-"));
};

/** @param {string} tempDir */
const cleanupTempDir = (tempDir) => {
  fs.rmSync(tempDir, { recursive: true, force: true });
};

/**
 * @param {string} skillsRoot
 * @param {string} name
 * @param {Record<string, string>} [metadata]
 */
const writeSkillInRoot = (
  skillsRoot,
  name,
  metadata = {},
) => {
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
};

/**
 * @param {string} repoRoot
 * @param {string} name
 * @param {Record<string, string>} [metadata]
 */
const writeRepoSkill = (
  repoRoot,
  name,
  metadata = {},
) => {
  writeSkillInRoot(path.join(repoRoot, ".agents", "skills"), name, metadata);
};

/**
 * @param {string} skillsRoot
 * @param {Record<string, string>} aliases
 */
const writeAliasRegistry = (skillsRoot, aliases) => {
  const registryDir = path.join(
    skillsRoot,
    "ref-sp-agents-shareable-skills",
    "references",
  );
  fs.mkdirSync(registryDir, { recursive: true });
  fs.writeFileSync(
    path.join(registryDir, "registry.json"),
    JSON.stringify({ aliases }),
    "utf8",
  );
};

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
        scope: "ref-sp-agents",
        visibility: "public",
      });

      const manifests = discoverSkillManifests(packagedSkillsRoot);

      expect(Object.keys(manifests)).toEqual(["ref-alpha"]);
      expect(manifests["ref-alpha"].scope).toBe("ref-sp-agents");
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
        visibility: "public",
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

      /** @type {string[]} */
      const messages = [];
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

  test("runSkillsManagement sync reads unified agents config skills", async () => {
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
        visibility: "public",
      });

      const destinationAgentsDir = path.join(tempDir, ".agents");
      fs.mkdirSync(destinationAgentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(destinationAgentsDir, "config.json"),
        JSON.stringify(
          {
            skills: {
              sources: [
                {
                  from: "package:agentic-tools",
                  skills: ["ref-alpha"],
                },
              ],
            },
          },
          null,
          2,
        ),
        "utf8",
      );

      /** @type {string[]} */
      const messages = [];
      const exitCode = await runSkillsManagement(["sync", "--to", tempDir], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toMatch(/Linked .*ref-alpha/u);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runSkillsManagement sync falls back to legacy skills config", async () => {
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
        visibility: "public",
      });

      const destinationAgentsDir = path.join(tempDir, ".agents");
      fs.mkdirSync(destinationAgentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(destinationAgentsDir, "config.json"),
        JSON.stringify({ policy: { services: ["copilot"] } }, null, 2),
        "utf8",
      );
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

      /** @type {string[]} */
      const messages = [];
      const exitCode = await runSkillsManagement(["sync", "--to", tempDir], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toMatch(/Linked .*ref-alpha/u);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runSkillsManagement sync resolves a renamed skill through the registry", async () => {
    const tempDir = createTempDir();
    try {
      const packageRoot = path.join(tempDir, "node_modules", "agentic-tools");
      fs.mkdirSync(packageRoot, { recursive: true });
      fs.writeFileSync(
        path.join(packageRoot, "package.json"),
        '{"name":"agentic-tools","version":"0.1.0"}\n',
        "utf8",
      );
      writeRepoSkill(packageRoot, "ref-new-name", {
        visibility: "public",
      });
      writeAliasRegistry(path.join(packageRoot, ".agents", "skills"), {
        "ref-old-name": "ref-new-name",
      });

      const destinationAgentsDir = path.join(tempDir, ".agents");
      fs.mkdirSync(destinationAgentsDir, { recursive: true });
      const configPath = path.join(destinationAgentsDir, "skills.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify(
          {
            sources: [
              {
                from: "package:agentic-tools",
                url: "https://github.com/acme/skills",
                skills: ["ref-old-name"],
              },
            ],
          },
          null,
          2,
        ),
        "utf8",
      );

      /** @type {string[]} */
      const messages = [];
      const exitCode = await runSkillsManagement(["sync", "--to", tempDir], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      const linkedSkillDir = path.join(
        tempDir,
        ".agents",
        "skills",
        "ref-new-name",
      );
      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toMatch(
        /Updated config: 'ref-old-name' -> 'ref-new-name'/u,
      );
      expect(fs.lstatSync(linkedSkillDir).isSymbolicLink()).toBe(true);
      expect(messages.join("\n")).toMatch(/Linked .*ref-new-name/u);
      // The config self-heals to the canonical name; the url metadata survives.
      const rewritten = JSON.parse(fs.readFileSync(configPath, "utf8"));
      expect(rewritten.sources[0].skills).toEqual(["ref-new-name"]);
      expect(rewritten.sources[0].url).toBe("https://github.com/acme/skills");
      // The generated .gitignore ignores the symlink and credits the tool + source.
      const gitignore = fs.readFileSync(
        path.join(tempDir, ".agents", "skills", ".gitignore"),
        "utf8",
      );
      expect(gitignore).toContain("# Generated by agentic-tools");
      expect(gitignore).toContain(
        "https://github.com/swiftpostlabs/agentic-tools",
      );
      expect(gitignore).toContain("# Skills synced from:");
      expect(gitignore).toContain("#   https://github.com/acme/skills");
      expect(gitignore).toContain("ref-new-name");
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
        visibility: "public",
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

      /** @type {string[]} */
      const messages = [];
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
