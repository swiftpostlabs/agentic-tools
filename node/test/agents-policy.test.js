import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runAgentsPolicy, runAgentsPolicyImportVscode } from "../lib/agents-policy.js";

function createTempDir(t) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "agentic-tools-node-policy-"),
  );
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  return tempDir;
}

test("runAgentsPolicy syncs generated files from .agents/policy.json", async (t) => {
  const tempDir = createTempDir(t);
  fs.mkdirSync(path.join(tempDir, ".agents"), { recursive: true });
  fs.writeFileSync(
    path.join(tempDir, ".agents", "policy.json"),
    JSON.stringify(
      {
        services: ["gemini", "claude", "copilot"],
        protectedFiles: ["*.env"],
        excludedFiles: ["dist/"],
        terminalAutoApprove: { "git status": true },
        editAutoApprove: { "**/*.md": true },
      },
      null,
      2,
    ),
    "utf8",
  );

  const messages = [];
  const exitCode = await runAgentsPolicy([], {
    cwd: tempDir,
    output: (message) => {
      messages.push(message);
    },
  });

  const vscodeSettings = JSON.parse(
    fs.readFileSync(path.join(tempDir, ".vscode", "settings.json"), "utf8"),
  );

  assert.equal(exitCode, 0);
  assert.equal(
    vscodeSettings["github.copilot.enable"]["copilot-restricted-file"],
    false,
  );
  assert.deepEqual(vscodeSettings["chat.tools.terminal.autoApprove"], {
    "git status": true,
  });
  assert.ok(fs.existsSync(path.join(tempDir, ".aiexclude")));
  assert.ok(fs.existsSync(path.join(tempDir, ".claude", "settings.json")));
  assert.match(messages.join("\n"), /Synced: Copilot local policy/u);
});

test("runAgentsPolicyImportVscode imports approvals back into the policy file", async (t) => {
  const tempDir = createTempDir(t);
  fs.mkdirSync(path.join(tempDir, ".agents"), { recursive: true });
  fs.mkdirSync(path.join(tempDir, ".vscode"), { recursive: true });
  fs.writeFileSync(
    path.join(tempDir, ".agents", "policy.json"),
    JSON.stringify(buildDefaultPolicyFixture(), null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(tempDir, ".vscode", "settings.json"),
    JSON.stringify(
      {
        "chat.tools.terminal.autoApprove": { "uv run poe test": true },
        "chat.tools.edits.autoApprove": { "**/*.md": true },
      },
      null,
      2,
    ),
    "utf8",
  );

  const exitCode = await runAgentsPolicyImportVscode({ cwd: tempDir, output: () => {} });
  const policy = JSON.parse(
    fs.readFileSync(path.join(tempDir, ".agents", "policy.json"), "utf8"),
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(policy.terminalAutoApprove, { "uv run poe test": true });
  assert.deepEqual(policy.editAutoApprove, { "**/*.md": true });
});

test("runAgentsPolicy reports no work when no policy file exists", async (t) => {
  const tempDir = createTempDir(t);
  const messages = [];

  const exitCode = await runAgentsPolicy([], {
    cwd: tempDir,
    output: (message) => {
      messages.push(message);
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(messages, [
    "No .agents/policy.json or legacy .ai-policy.json found. Nothing to sync.",
  ]);
});

function buildDefaultPolicyFixture() {
  return {
    services: ["gemini", "claude", "copilot"],
    protectedFiles: [],
    excludedFiles: [],
    terminalAutoApprove: {},
    editAutoApprove: {},
  };
}
