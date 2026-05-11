import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";

import { runAgentsPolicy, runAgentsPolicyImportVscode } from "./main.ts";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agentic-tools-node-policy-"));
}

function cleanupTempDir(tempDir: string): void {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function buildDefaultPolicyFixture() {
  return {
    services: ["gemini", "claude", "copilot"],
    protectedFiles: [],
    excludedFiles: [],
    terminalAutoApprove: {},
    editAutoApprove: {},
  };
}

describe("agents-policy Node CLI", () => {
  test("runAgentsPolicy syncs generated files from .agents/policy.json", async () => {
    const tempDir = createTempDir();
    try {
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

      const messages: string[] = [];
      const exitCode = await runAgentsPolicy([], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      const vscodeSettings = JSON.parse(
        fs.readFileSync(path.join(tempDir, ".vscode", "settings.json"), "utf8"),
      ) as Record<string, unknown>;

      expect(exitCode).toBe(0);
      expect(
        (vscodeSettings["github.copilot.enable"] as Record<string, boolean>)[
          "copilot-restricted-file"
        ],
      ).toBe(false);
      expect(vscodeSettings["chat.tools.terminal.autoApprove"]).toEqual({
        "git status": true,
      });
      expect(fs.existsSync(path.join(tempDir, ".aiexclude"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, ".claude", "settings.json"))).toBe(true);
      expect(messages.join("\n")).toMatch(/Synced: Copilot local policy/u);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runAgentsPolicyImportVscode imports approvals back into the policy file", async () => {
    const tempDir = createTempDir();
    try {
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

      const exitCode = await runAgentsPolicyImportVscode({
        cwd: tempDir,
        output: () => {},
      });
      const policy = JSON.parse(
        fs.readFileSync(path.join(tempDir, ".agents", "policy.json"), "utf8"),
      ) as Record<string, unknown>;

      expect(exitCode).toBe(0);
      expect(policy.terminalAutoApprove).toEqual({ "uv run poe test": true });
      expect(policy.editAutoApprove).toEqual({ "**/*.md": true });
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runAgentsPolicy reports no work when no policy file exists", async () => {
    const tempDir = createTempDir();
    try {
      const messages: string[] = [];

      const exitCode = await runAgentsPolicy([], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      expect(exitCode).toBe(0);
      expect(messages).toEqual([
        "No .agents/policy.json or legacy .ai-policy.json found. Nothing to sync.",
      ]);
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});