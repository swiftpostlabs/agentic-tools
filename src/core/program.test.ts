import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";
import { findUnknownOptions, repeatedOption } from "./command.ts";
import { createCapturedOutput } from "./output.ts";
import { runCli } from "./program.ts";
import { makeTempDir, writeJson, writeSkill } from "./testFixtures.ts";

const run = async (argv: string[], cwd = makeTempDir()) => {
  const output = createCapturedOutput();
  const code = await runCli(argv, { cwd, home: makeTempDir(), output });
  return { code, output };
};

describe("runCli", () => {
  test("prints usage and exits 1 without a command, 0 when asked", async () => {
    expect((await run([])).code).toBe(1);
    const { code, output } = await run(["--help"]);
    expect(code).toBe(0);
    expect(output.lines[0]).toContain("agentic-tools");
    expect(output.lines[0]).toContain("--workspace");
  });

  test("prints a group's usage without a subcommand", async () => {
    const { code, output } = await run(["policy"]);
    expect(code).toBe(1);
    expect(output.errors[0]).toContain("import-vscode");
  });

  test("prints a command's usage under its full name", async () => {
    const { code, output } = await run(["skills", "link", "--help"]);
    expect(code).toBe(0);
    expect(output.lines[0]).toContain("agentic-tools skills link");
    expect(output.lines[0]).toContain("--dry-run");
  });

  test("rejects unknown groups, commands, and options as usage errors", async () => {
    expect((await run(["nope"])).code).toBe(2);
    expect((await run(["skills", "nope"])).code).toBe(2);
    const bogus = await run(["skills", "list", "--bogus"]);
    expect(bogus.code).toBe(2);
    expect(bogus.output.errors[0]).toContain("Unknown option: --bogus");
    expect((await run(["skills", "link"])).code).toBe(2);
  });

  test("runs a command from --workspace", async () => {
    const workspace = makeTempDir();
    writeSkill(path.join(workspace, ".agents", "skills"), "ref-x", { domain: "dev", visibility: "public" });
    const { code, output } = await run(["--workspace", workspace, "skills", "list"]);
    expect(code).toBe(0);
    expect(output.lines).toEqual(["ref-x: domain dev; visibility public; requires -"]);
  });

  test("dispatches policy sync and turns expected failures into exit 1", async () => {
    const workspace = makeTempDir();
    writeJson(path.join(workspace, ".agents", "config.json"), { policy: { services: ["claude"], protectedFiles: [".env"] } });
    expect((await run(["policy", "sync"], workspace)).code).toBe(0);
    expect(fs.existsSync(path.join(workspace, ".claude", "settings.json"))).toBe(true);
    writeJson(path.join(workspace, ".agents", "config.json"), { policy: { services: ["cursor"] } });
    const failed = await run(["policy", "check"], workspace);
    expect(failed.code).toBe(1);
    expect(failed.output.errors[0]).toContain("Unsupported policy service 'cursor'");
  });

  test("a missing workspace is an error", async () => {
    expect((await run(["-w", "/definitely/missing", "skills", "list"])).code).toBe(1);
  });

  test("collects repeated options", async () => {
    const workspace = makeTempDir();
    const skills = path.join(workspace, ".agents", "skills");
    writeSkill(skills, "ref-a", { domain: "dev", visibility: "public" });
    writeSkill(skills, "ref-b", { domain: "dev", visibility: "public" });
    writeSkill(skills, "ref-c", { domain: "dev", visibility: "public" });
    const { output } = await run(["export", "build", "--dry-run", "--exclude", "ref-a", "--exclude=ref-b"], workspace);
    expect(output.lines[0]).toContain("Selected 1 skills");
  });

  test("passes every positional to a variadic command", async () => {
    const source = makeTempDir();
    const skills = path.join(source, ".agents", "skills");
    writeSkill(skills, "ref-a", { domain: "dev", visibility: "public" });
    writeSkill(skills, "ref-b", { domain: "dev", visibility: "public" });
    const destination = makeTempDir();
    const { code } = await run(["skills", "link", "ref-a", "ref-b", "--from", source, "--to", destination]);
    expect(code).toBe(0);
    expect(fs.readdirSync(path.join(destination, ".agents", "skills")).sort()).toEqual(["ref-a", "ref-b"]);
  });
});

describe("findUnknownOptions", () => {
  const args = {
    config: { type: "string", alias: "c" },
    "dry-run": { type: "boolean" },
    skill: { type: "positional" },
  } as const;

  test("accepts declared names, aliases, negations, and option values that look like flags", () => {
    expect(findUnknownOptions(["-c", "--x", "--dry-run", "--no-dry-run", "--config=a", "-h"], args)).toEqual([]);
  });

  test("reports undeclared options and ignores anything after --", () => {
    expect(findUnknownOptions(["--conf", "-x", "--", "--later"], args)).toEqual(["--conf", "-x"]);
  });
});

describe("repeatedOption", () => {
  test("collects spaced and inline values", () => {
    expect(repeatedOption(["--exclude", "a", "--exclude=b", "--", "--exclude", "c"], "exclude")).toEqual(["a", "b"]);
  });
});
