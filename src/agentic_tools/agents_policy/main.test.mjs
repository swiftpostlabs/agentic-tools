// @ts-check

import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runAgentsPolicy, runAgentsPolicyImportVscode } from "./main.mjs";

const createTempDir = () => {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agentic-tools-node-policy-"));
};

/** @param {string} tempDir */
const cleanupTempDir = (tempDir) => {
  fs.rmSync(tempDir, { recursive: true, force: true });
};

const buildDefaultPolicyFixture = () => {
  return {
    services: ["gemini", "claude", "copilot"],
    protectedFiles: [],
    excludedFiles: [],
    terminalAutoApprove: {},
    editAutoApprove: {},
  };
};

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

      /** @type {string[]} */
      const messages = [];
      const exitCode = await runAgentsPolicy([], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      const vscodeSettings = /** @type {Record<string, unknown>} */ (JSON.parse(
        fs.readFileSync(path.join(tempDir, ".vscode", "settings.json"), "utf8"),
      ));

      const copilotEnable = /** @type {Record<string, boolean>} */ (
        vscodeSettings["github.copilot.enable"]
      );
      expect(exitCode).toBe(0);
      expect(copilotEnable["copilot-restricted-file"]).toBe(false);
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

  test("runAgentsPolicy syncs generated files from .agents/config.json policy", async () => {
    const tempDir = createTempDir();
    try {
      fs.mkdirSync(path.join(tempDir, ".agents"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".agents", "config.json"),
        JSON.stringify(
          {
            policy: {
              services: ["copilot"],
              protectedFiles: ["*.env"],
              terminalAutoApprove: { "uv run poe test": true },
            },
            skills: { sources: [] },
          },
          null,
          2,
        ),
        "utf8",
      );

      /** @type {string[]} */
      const messages = [];
      const exitCode = await runAgentsPolicy([], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      const vscodeSettings = /** @type {Record<string, unknown>} */ (JSON.parse(
        fs.readFileSync(path.join(tempDir, ".vscode", "settings.json"), "utf8"),
      ));

      expect(exitCode).toBe(0);
      expect(vscodeSettings["chat.tools.terminal.autoApprove"]).toEqual({
        "uv run poe test": true,
      });
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
      const policy = /** @type {Record<string, unknown>} */ (JSON.parse(
        fs.readFileSync(path.join(tempDir, ".agents", "policy.json"), "utf8"),
      ));

      expect(exitCode).toBe(0);
      expect(policy.terminalAutoApprove).toEqual({ "uv run poe test": true });
      expect(policy.editAutoApprove).toEqual({ "**/*.md": true });
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runAgentsPolicyImportVscode preserves other unified config sections", async () => {
    const tempDir = createTempDir();
    try {
      fs.mkdirSync(path.join(tempDir, ".agents"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, ".vscode"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".agents", "config.json"),
        JSON.stringify(
          {
            policy: buildDefaultPolicyFixture(),
            skills: {
              sources: [
                { from: "package:agentic-tools", skills: ["ref-alpha"] },
              ],
            },
          },
          null,
          2,
        ),
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
      const config = /** @type {Record<string, unknown>} */ (JSON.parse(
        fs.readFileSync(path.join(tempDir, ".agents", "config.json"), "utf8"),
      ));
      const policy = /** @type {Record<string, unknown>} */ (config.policy);

      expect(exitCode).toBe(0);
      expect(policy.terminalAutoApprove).toEqual({ "uv run poe test": true });
      expect(policy.editAutoApprove).toEqual({ "**/*.md": true });
      expect(config.skills).toEqual({
        sources: [{ from: "package:agentic-tools", skills: ["ref-alpha"] }],
      });
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runAgentsPolicy reports no work when no policy file exists", async () => {
    const tempDir = createTempDir();
    try {
      /** @type {string[]} */
      const messages = [];

      const exitCode = await runAgentsPolicy([], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      expect(exitCode).toBe(0);
      expect(messages).toEqual([
        "No .agents/config.json policy, .agents/policy.json, or legacy .ai-policy.json found. Nothing to sync.",
      ]);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runAgentsPolicy check mode reports drift and suggests sync or import", async () => {
    const tempDir = createTempDir();
    try {
      fs.mkdirSync(path.join(tempDir, ".agents"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".agents", "policy.json"),
        JSON.stringify(
          {
            services: ["gemini", "claude", "copilot"],
            protectedFiles: ["*.env"],
            terminalAutoApprove: { "git status": true },
          },
          null,
          2,
        ),
        "utf8",
      );

      /** @type {string[]} */
      const messages = [];
      const exitCode = await runAgentsPolicy(["--check"], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      expect(exitCode).toBe(1);
      expect(messages.join("\n")).toMatch(/Managed policy files are out of sync/u);
      expect(messages.join("\n")).toMatch(/uv run agentic-tools policy sync/u);
      expect(messages.join("\n")).toMatch(/uv run agentic-tools policy import-vscode/u);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runAgentsPolicy check mode passes when outputs are current", async () => {
    const tempDir = createTempDir();
    try {
      fs.mkdirSync(path.join(tempDir, ".agents"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".agents", "policy.json"),
        JSON.stringify(
          {
            services: ["gemini", "claude", "copilot"],
            protectedFiles: ["*.env"],
            terminalAutoApprove: { "git status": true },
          },
          null,
          2,
        ),
        "utf8",
      );

      expect(await runAgentsPolicy([], { cwd: tempDir, output: () => {} })).toBe(0);

      /** @type {string[]} */
      const messages = [];
      const exitCode = await runAgentsPolicy(["--check"], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      expect(exitCode).toBe(0);
      expect(messages).toContain("Checked: generated policy files are up to date.");
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});
