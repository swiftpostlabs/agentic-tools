import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";
import { createCapturedOutput } from "../core/output.ts";
import { makeTempDir, writeJson, writeSkill } from "../test-support/fixtures.ts";
import { runCli } from "./main.ts";

const run = (argv: string[], cwd = makeTempDir()) => {
  const output = createCapturedOutput();
  const code = runCli(argv, { cwd, home: makeTempDir(), output });
  return { code, output };
};

describe("runCli", () => {
  test("prints help and exits 1 without a command, 0 when asked", () => {
    expect(run([]).code).toBe(1);
    const { code, output } = run(["--help"]);
    expect(code).toBe(0);
    expect(output.lines[0]).toContain("Usage: agentic-tools [--workspace <path>] <group> <command>");
  });

  test("prints a group's help without a subcommand", () => {
    const { code, output } = run(["policy"]);
    expect(code).toBe(1);
    expect(output.errors[0]).toContain("import-vscode");
  });

  test("rejects unknown groups, commands, and options as usage errors", () => {
    expect(run(["nope"]).code).toBe(2);
    expect(run(["skills", "nope"]).code).toBe(2);
    expect(run(["skills", "list", "--bogus"]).code).toBe(2);
    expect(run(["skills", "link"]).code).toBe(2);
  });

  test("runs a command from --workspace", () => {
    const workspace = makeTempDir();
    writeSkill(path.join(workspace, ".agents", "skills"), "ref-x", { domain: "dev", visibility: "public" });
    const { code, output } = run(["--workspace", workspace, "skills", "list"]);
    expect(code).toBe(0);
    expect(output.lines).toEqual(["ref-x: domain dev; visibility public; requires -"]);
  });

  test("dispatches policy sync and turns expected failures into exit 1", () => {
    const workspace = makeTempDir();
    writeJson(path.join(workspace, ".agents", "config.json"), { policy: { services: ["claude"], protectedFiles: [".env"] } });
    expect(run(["policy", "sync"], workspace).code).toBe(0);
    expect(fs.existsSync(path.join(workspace, ".claude", "settings.json"))).toBe(true);
    writeJson(path.join(workspace, ".agents", "config.json"), { policy: { services: ["cursor"] } });
    const failed = run(["policy", "check"], workspace);
    expect(failed.code).toBe(1);
    expect(failed.output.errors[0]).toContain("Unsupported policy service 'cursor'");
  });

  test("a missing workspace is an error", () => {
    expect(run(["-w", "/definitely/missing", "skills", "list"]).code).toBe(1);
  });

  test("collects repeated options", () => {
    const workspace = makeTempDir();
    const skills = path.join(workspace, ".agents", "skills");
    writeSkill(skills, "ref-a", { domain: "dev", visibility: "public" });
    writeSkill(skills, "ref-b", { domain: "dev", visibility: "public" });
    writeSkill(skills, "ref-c", { domain: "dev", visibility: "public" });
    const { output } = run(["export", "build", "--dry-run", "--exclude", "ref-a", "--exclude", "ref-b"], workspace);
    expect(output.lines[0]).toContain("Selected 1 skills");
  });
});
