// @ts-check

import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runAgenticTools } from "./main.mjs";

const createTempDir = () => {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agentic-tools-node-root-"));
};

/** @param {string} tempDir */
const cleanupTempDir = (tempDir) => {
  fs.rmSync(tempDir, { recursive: true, force: true });
};

describe("agentic-tools Node CLI", () => {
  test("runAgenticTools dispatches policy sync", async () => {
    const tempDir = createTempDir();
    try {
      fs.mkdirSync(path.join(tempDir, ".agents"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".agents", "policy.json"),
        JSON.stringify(
          {
            services: ["copilot"],
            protectedFiles: ["*.env"],
          },
          null,
          2,
        ),
        "utf8",
      );

      const exitCode = await runAgenticTools(["policy", "sync"], {
        cwd: tempDir,
        output: () => {},
      });

      const vscodeSettings = /** @type {Record<string, Record<string, string>>} */ (JSON.parse(
        fs.readFileSync(path.join(tempDir, ".vscode", "settings.json"), "utf8"),
      ));

      expect(exitCode).toBe(0);
      expect(vscodeSettings["files.associations"]).toEqual({
        "*.env": "copilot-restricted-file",
      });
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runAgenticTools dispatches policy import-vscode", async () => {
    const tempDir = createTempDir();
    try {
      fs.mkdirSync(path.join(tempDir, ".agents"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, ".vscode"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".agents", "policy.json"),
        JSON.stringify(
          {
            services: ["copilot"],
            terminalAutoApprove: { stale: true },
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
          },
          null,
          2,
        ),
        "utf8",
      );

      const exitCode = await runAgenticTools(["policy", "import-vscode"], {
        cwd: tempDir,
        output: () => {},
      });

      const policy = /** @type {Record<string, unknown>} */ (JSON.parse(
        fs.readFileSync(path.join(tempDir, ".agents", "policy.json"), "utf8"),
      ));

      expect(exitCode).toBe(0);
      expect(policy.terminalAutoApprove).toEqual({ "uv run poe test": true });
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runAgenticTools dispatches skills list", async () => {
    const tempDir = createTempDir();
    try {
      const skillDir = path.join(tempDir, ".agents", "skills", "ref-alpha");
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, "SKILL.md"),
        [
          "---",
          "name: ref-alpha",
          'description: "Test skill."',
          "metadata:",
          '  shareable-skills.visibility: "shareable"',
          "---",
          "",
          "# Test Skill",
          "",
        ].join("\n"),
        "utf8",
      );

      /** @type {string[]} */
      const messages = [];
      const exitCode = await runAgenticTools(["skills", "list", "--from", tempDir], {
        cwd: tempDir,
        output: (message) => {
          messages.push(message);
        },
      });

      expect(exitCode).toBe(0);
      expect(messages.join("\n")).toMatch(/ref-alpha/u);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("runAgenticTools without arguments prints root usage", async () => {
    /** @type {string[]} */
    const messages = [];

    const exitCode = await runAgenticTools([], {
      output: (message) => {
        messages.push(message);
      },
    });

    expect(exitCode).toBe(1);
    expect(messages.join("\n")).toMatch(/agentic-tools policy\|skills/u);
    expect(messages.join("\n")).toContain("Sync, check, and import generated agent policy files.");
    expect(messages.join("\n")).toContain("List, link, sync, and unlink shareable skills.");
  });
});
