import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    discoverSkillManifests,
    resolvePackageSourceRoot,
    runSkillsManagement,
} from "../lib/skills-management.js";

function createTempDir(t) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "agentic-tools-node-skills-"),
  );
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  return tempDir;
}

function writeSkillInRoot(skillsRoot, name, metadata = {}) {
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

function writeRepoSkill(repoRoot, name, metadata = {}) {
  writeSkillInRoot(path.join(repoRoot, ".agents", "skills"), name, metadata);
}

test("discoverSkillManifests accepts a packaged skills root path", (t) => {
  const tempDir = createTempDir(t);
  const packagedSkillsRoot = path.join(tempDir, "node_modules", "agentic-tools", ".agents", "skills");
  writeSkillInRoot(packagedSkillsRoot, "ref-alpha", {
    "shareable-skills.visibility": "shareable",
  });

  const manifests = discoverSkillManifests(packagedSkillsRoot);

  assert.deepEqual(Object.keys(manifests), ["ref-alpha"]);
});

test("resolvePackageSourceRoot resolves an installed package from node_modules", (t) => {
  const tempDir = createTempDir(t);
  const packageRoot = path.join(tempDir, "node_modules", "agentic-tools");
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, "package.json"),
    '{"name":"agentic-tools","version":"0.1.0"}\n',
    "utf8",
  );

  assert.equal(resolvePackageSourceRoot("agentic-tools", tempDir), packageRoot);
});

test("runSkillsManagement sync links configured skills from an installed package", async (t) => {
  const tempDir = createTempDir(t);
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

  const messages = [];
  const exitCode = await runSkillsManagement(["sync", "--to", tempDir], {
    cwd: tempDir,
    output: (message) => {
      messages.push(message);
    },
  });

  const linkedSkillDir = path.join(tempDir, ".agents", "skills", "ref-alpha");
  assert.equal(exitCode, 0);
  assert.equal(fs.lstatSync(linkedSkillDir).isSymbolicLink(), true);
  assert.equal(
    fs.realpathSync(linkedSkillDir),
    path.join(packageRoot, ".agents", "skills", "ref-alpha"),
  );
  assert.match(messages.join("\n"), /Linked .*ref-alpha/u);
});

test("runSkillsManagement sync reports missing configured skills by source", async (t) => {
  const tempDir = createTempDir(t);
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

  const messages = [];
  const exitCode = await runSkillsManagement(["sync", "--to", tempDir], {
    cwd: tempDir,
    output: (message) => {
      messages.push(message);
    },
  });

  assert.equal(exitCode, 1);
  assert.match(messages.join("\n"), /Skills config references missing skills:/u);
  assert.match(messages.join("\n"), /source 'package:agentic-tools': ref-missing/u);
});
