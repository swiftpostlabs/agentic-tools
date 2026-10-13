import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";
import { makeTempDir, readJson, writeFile, writeJson } from "../../core/testFixtures.ts";
import { applyPolicyToClaudeSettings } from "./claude.ts";
import { parseAiPolicy, policyToJson, withDefaults } from "./schema.ts";
import { discoverPolicyPath, runPolicyCommand, syncPolicyFile } from "./sync.ts";
import { applyPolicyToVscodeSettings } from "./vscode.ts";

const setupRepo = (policy: unknown, options: { unified?: boolean; siblings?: Record<string, unknown> } = {}) => {
  const root = makeTempDir();
  const unified = options.unified ?? true;
  const policyFile = path.join(root, ".agents", unified ? "config.json" : "policy.json");
  writeJson(policyFile, unified ? { ...options.siblings, policy } : policy);
  return { root, policyFile };
};

describe("policy schema", () => {
  test("defaults to every service without serializing the default", () => {
    const policy = parseAiPolicy({ protectedFiles: [".env"] }, "Policy file");
    expect(withDefaults(policy).services).toEqual(["gemini", "claude", "copilot"]);
    expect(policyToJson(policy)).toEqual({ protectedFiles: [".env"] });
  });

  test("normalizes service aliases and removes duplicates", () => {
    const policy = parseAiPolicy({ services: ["Claude-Code", "claude", "github-copilot"] }, "Policy file");
    expect(policy.services).toEqual(["claude", "copilot"]);
  });

  test("rejects an unknown service with the supported list", () => {
    expect(() => parseAiPolicy({ services: ["cursor"] }, "Policy file")).toThrow(
      "Policy file is invalid at services: Unsupported policy service 'cursor'. Supported values: claude, claude-code, copilot, gemini, github-copilot.",
    );
  });

  test("rejects non-string protected files and unknown keys", () => {
    expect(() => parseAiPolicy({ protectedFiles: [1] }, "Policy file")).toThrow(
      "Policy 'protectedFiles' must contain only strings.",
    );
    expect(() => parseAiPolicy({ protected: [] }, "Policy file")).toThrow(
      "Policy file is invalid at protected: Extra inputs are not permitted",
    );
  });
});

describe("client settings transforms", () => {
  test("Claude: replaces managed Read rules and keeps everything else", () => {
    const updated = applyPolicyToClaudeSettings(
      { managed: { permissions: { allow: ["Bash(ls)"], deny: ["Read(old)", "Bash(rm)"] } }, extras: { model: "x" } },
      [".env"],
    );
    expect(updated.managed["permissions"]).toEqual({ deny: ["Bash(rm)", "Read(.env)"], allow: ["Bash(ls)"] });
    expect(updated.extras).toEqual({ model: "x" });
  });

  test("Claude: drops an emptied permissions block", () => {
    const updated = applyPolicyToClaudeSettings({ managed: { permissions: { deny: ["Read(old)"] } }, extras: {} }, []);
    expect(updated.managed["permissions"]).toBeNull();
  });

  test("VS Code: replaces managed associations and approvals", () => {
    const updated = applyPolicyToVscodeSettings(
      {
        managed: {
          "files.associations": { "*.x": "xml", stale: "copilot-restricted-file" },
          "github.copilot.enable": { markdown: true },
        },
        extras: {},
      },
      { protectedFiles: [".env"], terminalAutoApprove: { ls: true }, editAutoApprove: {} },
    );
    expect(updated.managed).toEqual({
      "files.associations": { "*.x": "xml", ".env": "copilot-restricted-file" },
      "github.copilot.enable": { markdown: true, "copilot-restricted-file": false },
      "chat.tools.terminal.autoApprove": { ls: true },
      "chat.tools.edits.autoApprove": null,
    });
  });
});

describe("syncPolicyFile", () => {
  test("writes every client file from a unified config", () => {
    const { root, policyFile } = setupRepo({ protectedFiles: [".env"], excludedFiles: ["dist/"] });
    const messages = syncPolicyFile(policyFile, "sync");
    expect(messages).toEqual([
      "Loaded 3 services, 1 protected patterns and 1 excluded patterns",
      "Synced: Gemini (.aiexclude)",
      "Synced: Claude Code (.claude/settings.json)",
      "Synced: Copilot local policy (.vscode/settings.json)",
      "Done.",
    ]);
    expect(fs.readFileSync(path.join(root, ".aiexclude"), "utf8")).toContain("# Generated from .agents/config.json\n");
    expect(readJson(path.join(root, ".claude", "settings.json"))).toEqual({ permissions: { deny: ["Read(.env)"] } });
  });

  test("respects the selected services and cleans disabled ones", () => {
    const { root, policyFile } = setupRepo({ services: ["claude"], protectedFiles: [".env"] });
    writeJson(path.join(root, ".vscode", "settings.json"), {
      "files.associations": { ".env": "copilot-restricted-file" },
      "github.copilot.enable": { "copilot-restricted-file": false },
      "editor.tabSize": 2,
    });
    const messages = syncPolicyFile(policyFile, "sync");
    expect(messages).toContain("Cleaned: Copilot local policy (.vscode/settings.json)");
    expect(fs.existsSync(path.join(root, ".aiexclude"))).toBe(false);
    expect(readJson(path.join(root, ".vscode", "settings.json"))).toEqual({ "editor.tabSize": 2 });
  });

  test("writes managed keys before untouched ones and drops top-level nulls", () => {
    const { root, policyFile } = setupRepo({ services: ["copilot"], protectedFiles: [".env"] });
    writeFile(path.join(root, ".vscode", "settings.json"), '// JSON5\n{"editor.x": 1, "z": null, "files.associations": {"a": "b"},}\n');
    syncPolicyFile(policyFile, "sync");
    expect(Object.keys(readJson(path.join(root, ".vscode", "settings.json")) as object)).toEqual([
      "files.associations",
      "github.copilot.enable",
      "editor.x",
    ]);
  });

  test("check mode reports drift without writing", () => {
    const { root, policyFile } = setupRepo({ protectedFiles: [".env"] });
    expect(() => syncPolicyFile(policyFile, "check")).toThrow(
      "Managed policy files are out of sync: .aiexclude, .claude/settings.json, .vscode/settings.json.",
    );
    expect(fs.existsSync(path.join(root, ".aiexclude"))).toBe(false);
  });

  test("check mode passes once the outputs are current", () => {
    const { policyFile } = setupRepo({ protectedFiles: [".env"] });
    syncPolicyFile(policyFile, "sync");
    expect(syncPolicyFile(policyFile, "check").slice(-2)).toEqual(["Checked: generated policy files are up to date.", "Done."]);
  });

  test("import-vscode replaces the approval maps and keeps sibling sections in place", () => {
    const { root, policyFile } = setupRepo(
      { protectedFiles: [".env"], terminalAutoApprove: { old: true } },
      { siblings: { skills: { sources: [] } } },
    );
    writeJson(path.join(root, ".vscode", "settings.json"), {
      "chat.tools.terminal.autoApprove": { "git status": true },
    });
    syncPolicyFile(policyFile, "import-vscode");
    const config = readJson(policyFile) as Record<string, unknown>;
    expect(Object.keys(config)).toEqual(["skills", "policy"]);
    expect(config["policy"]).toEqual({
      protectedFiles: [".env"],
      terminalAutoApprove: { "git status": true },
      editAutoApprove: {},
    });
  });

  test("import-vscode clears approval maps that VS Code no longer has", () => {
    const { policyFile } = setupRepo({ editAutoApprove: { "**/*.md": true } }, { unified: false });
    syncPolicyFile(policyFile, "import-vscode");
    expect(readJson(policyFile)).toEqual({ editAutoApprove: {}, terminalAutoApprove: {} });
  });
});

describe("policy discovery", () => {
  test("prefers the unified config over a policy file", () => {
    const { root } = setupRepo({ protectedFiles: [] });
    writeJson(path.join(root, ".agents", "policy.json"), {});
    const nested = path.join(root, "a", "b");
    fs.mkdirSync(nested, { recursive: true });
    expect(discoverPolicyPath(nested)).toBe(path.join(root, ".agents", "config.json"));
  });

  test("skips a config without a policy section", () => {
    const root = makeTempDir();
    writeJson(path.join(root, ".agents", "config.json"), { skills: {} });
    writeJson(path.join(root, ".ai-policy.json"), {});
    expect(discoverPolicyPath(root)).toBe(path.join(root, ".ai-policy.json"));
  });

  test("reports when there is nothing to sync", () => {
    const root = makeTempDir();
    expect(runPolicyCommand({ mode: "sync", config: undefined, cwd: root, home: root })).toEqual([
      "No .agents/config.json policy, .agents/policy.json, or legacy .ai-policy.json found. Nothing to sync.",
    ]);
  });
});
