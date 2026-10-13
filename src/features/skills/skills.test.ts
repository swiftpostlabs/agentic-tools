import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "@jest/globals";
import { createCapturedOutput } from "../../core/output.ts";
import { makeTempDir, readJson, writeFile, writeJson, writeSkill } from "../../core/testFixtures.ts";
import {
  buildSyncedSkillsGitignore,
  describeSkills,
  resolveSelectedSkills,
  runSkillsLink,
  runSkillsList,
  runSkillsSync,
  runSkillsUnlink,
  type SkillsContext,
} from "./skills.ts";
import { discoverSkillManifests, loadSkillAliases } from "./manifest.ts";
import { resolvePackageSourceRoot } from "./sources.ts";

const sourceRepo = () => {
  const root = makeTempDir();
  const skills = path.join(root, ".agents", "skills");
  writeSkill(skills, "ref-base", { domain: "dev", visibility: "public" });
  writeSkill(skills, "ref-feature", { domain: "dev", visibility: "public", requires: "ref-base" });
  writeSkill(skills, "ref-local", { domain: "dev", visibility: "repo-local", reason: "Only for this repo." });
  writeSkill(skills, "ref-org", { domain: "dev", visibility: "organization" });
  writeJson(path.join(skills, "ref-sp-agents-shareable-skills", "references", "registry.json"), {
    aliases: { "ref-old-feature": "ref-feature" },
  });
  return { root, skills };
};

const context = (cwd: string, home = makeTempDir()) => {
  const output = createCapturedOutput();
  const value: SkillsContext = { cwd, home, output, ownRoot: makeTempDir() };
  return { context: value, output };
};

describe("skill manifests", () => {
  test("reads shareability metadata, including comma-delimited requires", () => {
    const { skills } = sourceRepo();
    writeSkill(skills, "ref-multi", { visibility: "public", requires: "ref-base, ref-org" });
    const manifest = discoverSkillManifests(skills).get("ref-multi");
    expect(manifest?.requires).toEqual(["ref-base", "ref-org"]);
    expect(manifest?.usesLegacyMetadata).toBe(false);
  });

  test("reads legacy bare keys, normalizes 'shareable', and lets namespaced keys win", () => {
    const { skills } = sourceRepo();
    writeSkill(skills, "ref-legacy", { legacy: true, domain: "dev", visibility: "shareable" });
    const legacy = discoverSkillManifests(skills).get("ref-legacy");
    expect(legacy).toMatchObject({ domain: "dev", visibility: "organization", usesLegacyMetadata: true });
  });

  test("accepts a repo root or an exact skills directory", () => {
    const { root, skills } = sourceRepo();
    expect([...discoverSkillManifests(root).keys()]).toEqual([...discoverSkillManifests(skills).keys()]);
  });

  test("rejects a skill whose name does not match its folder", () => {
    const { skills } = sourceRepo();
    writeFile(path.join(skills, "ref-wrong", "SKILL.md"), "---\nname: ref-other\n---\n");
    expect(() => discoverSkillManifests(skills)).toThrow("Skill name 'ref-other' does not match directory 'ref-wrong'.");
  });

  test("aliases come from the registry, and a missing registry means none", () => {
    expect(Object.fromEntries(loadSkillAliases(sourceRepo().skills))).toEqual({ "ref-old-feature": "ref-feature" });
    const bare = makeTempDir();
    writeSkill(path.join(bare, ".agents", "skills"), "ref-x", { visibility: "public" });
    expect(loadSkillAliases(bare).size).toBe(0);
  });
});

describe("resolveSelectedSkills", () => {
  test("puts dependencies first and resolves renamed skills once", () => {
    const { skills } = sourceRepo();
    const manifests = discoverSkillManifests(skills);
    const names = resolveSelectedSkills(manifests, ["ref-old-feature", "ref-feature"], loadSkillAliases(skills)).map(
      (manifest) => manifest.name,
    );
    expect(names).toEqual(["ref-base", "ref-feature"]);
  });

  test("rejects missing metadata with the wizard recommendation", () => {
    const { skills } = sourceRepo();
    writeSkill(skills, "ref-bare");
    expect(() => resolveSelectedSkills(discoverSkillManifests(skills), ["ref-bare"])).toThrow(
      "Skill 'ref-bare' is missing shareability metadata. Recommended next step: use /tool-sp-make-skill-shareable",
    );
  });

  test("rejects a dependency with lower visibility", () => {
    const { skills } = sourceRepo();
    writeSkill(skills, "ref-leaky", { visibility: "public", requires: "ref-local" });
    expect(() => resolveSelectedSkills(discoverSkillManifests(skills), ["ref-leaky"])).toThrow(
      "depends on 'ref-local', which is not shareable (visibility 'repo-local')",
    );
  });

  test("rejects a public skill on the legacy schema but tolerates an organization one", () => {
    const { skills } = sourceRepo();
    writeSkill(skills, "ref-legacy-public", { legacy: true, visibility: "public" });
    writeSkill(skills, "ref-legacy-org", { legacy: true, visibility: "shareable" });
    const manifests = discoverSkillManifests(skills);
    expect(() => resolveSelectedSkills(manifests, ["ref-legacy-public"])).toThrow("public but still uses the legacy");
    expect(resolveSelectedSkills(manifests, ["ref-legacy-org"])).toHaveLength(1);
  });

  test("detects dependency cycles and unknown names", () => {
    const { skills } = sourceRepo();
    writeSkill(skills, "ref-a", { visibility: "public", requires: "ref-b" });
    writeSkill(skills, "ref-b", { visibility: "public", requires: "ref-a" });
    const manifests = discoverSkillManifests(skills);
    expect(() => resolveSelectedSkills(manifests, ["ref-a"])).toThrow("Circular skill dependency detected at 'ref-a'.");
    expect(() => resolveSelectedSkills(manifests, ["ref-nope"])).toThrow("Unknown skill 'ref-nope'.");
  });
});

describe("skills list", () => {
  test("describes every skill, annotating an own legacy skill", () => {
    const { root, skills } = sourceRepo();
    writeSkill(skills, "ref-legacy", { legacy: true, visibility: "organization" });
    const { context: ctx, output } = context(root);
    runSkillsList(ctx, undefined);
    expect(output.lines[0]?.split("\n")).toEqual([
      "ref-base: domain dev; visibility public; requires -",
      "ref-feature: domain dev; visibility public; requires ref-base",
      "ref-legacy: domain missing; visibility organization; requires -; legacy metadata — migrate to shareable-skills.*",
      "ref-local: domain dev; visibility repo-local; requires -; reason Only for this repo.",
      "ref-org: domain dev; visibility organization; requires -",
    ]);
  });

  test("a linked legacy skill is the source owner's burden, not flagged", () => {
    const { skills } = sourceRepo();
    const consumer = makeTempDir();
    writeSkill(skills, "ref-legacy", { legacy: true, visibility: "organization" });
    fs.mkdirSync(path.join(consumer, ".agents", "skills"), { recursive: true });
    fs.symlinkSync(path.join(skills, "ref-legacy"), path.join(consumer, ".agents", "skills", "ref-legacy"), "dir");
    expect(describeSkills(discoverSkillManifests(consumer))).toBe("ref-legacy: domain missing; visibility organization; requires -");
  });
});

describe("skills link and unlink", () => {
  test("dry run plans links into the current repo without creating anything", () => {
    const { root } = sourceRepo();
    const consumer = makeTempDir();
    const { context: ctx, output } = context(consumer);
    runSkillsLink(ctx, { skills: ["ref-feature"], source: root, destination: undefined, useGlobal: false, dryRun: true, force: false });
    expect(output.lines).toEqual([
      `Would link ${consumer}/.agents/skills/ref-base -> ${root}/.agents/skills/ref-base`,
      `Would link ${consumer}/.agents/skills/ref-feature -> ${root}/.agents/skills/ref-feature`,
    ]);
    expect(fs.existsSync(path.join(consumer, ".agents"))).toBe(false);
  });

  test("--global targets ~/.agents/skills and refuses --to", () => {
    const { root } = sourceRepo();
    const home = makeTempDir();
    const { context: ctx, output } = context(root, home);
    runSkillsLink(ctx, { skills: ["ref-base"], source: undefined, destination: undefined, useGlobal: true, dryRun: true, force: false });
    expect(output.lines[0]).toBe(`Would link ${home}/.agents/skills/ref-base -> ${root}/.agents/skills/ref-base`);
    expect(() =>
      runSkillsLink(ctx, { skills: ["ref-base"], source: undefined, destination: "x", useGlobal: true, dryRun: true, force: false }),
    ).toThrow("cannot combine --global with --to");
  });

  test("links, refuses to clobber, replaces with --force, and unlinks", () => {
    const { root, skills } = sourceRepo();
    const consumer = makeTempDir();
    const { context: ctx, output } = context(consumer);
    const link = { source: root, destination: undefined, useGlobal: false, dryRun: false };
    runSkillsLink(ctx, { ...link, skills: ["ref-old-feature"], force: false });
    expect(output.lines[0]).toBe("Note: skill 'ref-old-feature' was renamed to 'ref-feature'; update your configuration to use the new name.");
    expect(fs.readlinkSync(path.join(consumer, ".agents", "skills", "ref-feature"))).toBe(path.join(skills, "ref-feature"));

    runSkillsLink(ctx, { ...link, skills: ["ref-base"], force: false });
    expect(output.lines.at(-1)).toBe(`Already linked ${consumer}/.agents/skills/ref-base -> ${skills}/ref-base`);

    const other = sourceRepo();
    expect(() => runSkillsLink(ctx, { ...link, source: other.root, skills: ["ref-base"], force: false })).toThrow("Use --force to replace it.");
    runSkillsLink(ctx, { ...link, source: other.root, skills: ["ref-base"], force: true });
    expect(output.lines.at(-1)).toBe(`Linked ${consumer}/.agents/skills/ref-base -> ${other.skills}/ref-base`);

    runSkillsUnlink(ctx, { source: other.root, destination: undefined, useGlobal: false, dryRun: false, skills: ["ref-base"] });
    expect(fs.existsSync(path.join(consumer, ".agents", "skills", "ref-base"))).toBe(false);
  });

  test("unlink refuses a link that points at another source", () => {
    const { root } = sourceRepo();
    const other = sourceRepo();
    const consumer = makeTempDir();
    const { context: ctx } = context(consumer);
    runSkillsLink(ctx, { skills: ["ref-base"], source: root, destination: undefined, useGlobal: false, dryRun: false, force: false });
    expect(() =>
      runSkillsUnlink(ctx, { skills: ["ref-base"], source: other.root, destination: undefined, useGlobal: false, dryRun: false }),
    ).toThrow("points to");
  });
});

describe("skills sync", () => {
  const consumerWith = (sources: unknown[], configName = "config.json") => {
    const consumer = makeTempDir();
    const content = configName === "config.json" ? { skills: { sources } } : { sources };
    writeJson(path.join(consumer, ".agents", configName), content);
    return consumer;
  };

  test("resolves relative sources from the config's repo, not the shell's directory", () => {
    const parent = makeTempDir();
    const { root } = sourceRepo();
    fs.renameSync(root, path.join(parent, "source"));
    const consumer = path.join(parent, "consumer");
    writeJson(path.join(consumer, ".agents", "config.json"), { skills: { sources: [{ from: "../source", skills: ["ref-base"] }] } });
    const { context: ctx, output } = context(makeTempDir());
    runSkillsSync(ctx, { destination: consumer, useGlobal: false, config: undefined, dryRun: true, force: false });
    expect(output.lines[0]).toBe(`Would link ${consumer}/.agents/skills/ref-base -> ${parent}/source/.agents/skills/ref-base`);
  });

  test("falls back to the legacy skills.json", () => {
    const { root } = sourceRepo();
    const consumer = consumerWith([{ from: root, skills: ["ref-base"] }], "skills.json");
    const { context: ctx, output } = context(consumer);
    runSkillsSync(ctx, { destination: undefined, useGlobal: false, config: undefined, dryRun: true, force: false });
    expect(output.lines[0]).toContain("Would link");
  });

  test("--global requires --config", () => {
    const { context: ctx } = context(makeTempDir());
    expect(() => runSkillsSync(ctx, { destination: undefined, useGlobal: true, config: undefined, dryRun: true, force: false })).toThrow(
      "sync with --global requires --config",
    );
  });

  test("reports missing skills grouped by source", () => {
    const { root } = sourceRepo();
    const consumer = consumerWith([{ from: root, skills: ["ref-base", "ref-nope", "ref-gone"] }]);
    const { context: ctx } = context(consumer);
    expect(() => runSkillsSync(ctx, { destination: undefined, useGlobal: false, config: undefined, dryRun: true, force: false })).toThrow(
      `Skills config references missing skills:\n- source '${root}': ref-nope, ref-gone`,
    );
  });

  test("skips a requested repo-local skill, links the rest, and heals renamed names", () => {
    const { root } = sourceRepo();
    const consumer = consumerWith([{ from: root, url: "https://example.test/source", skills: ["ref-old-feature", "ref-local"] }]);
    writeFile(path.join(consumer, ".agents", "skills", ".gitignore"), "stale\n");
    fs.symlinkSync(path.join(consumer, "missing"), path.join(consumer, ".agents", "skills", "ref-dead"), "dir");
    const { context: ctx, output } = context(consumer);

    runSkillsSync(ctx, { destination: undefined, useGlobal: false, config: undefined, dryRun: false, force: false });

    const skillsDir = path.join(consumer, ".agents", "skills");
    expect(output.lines).toEqual([
      `Skipped skills that are not shippable to another repo (repo-local or otherwise non-exportable):\n- source '${root}': ref-local`,
      "Updated config: 'ref-old-feature' -> 'ref-feature'",
      `Removed dead link ${skillsDir}/ref-dead -> ${consumer}/missing`,
      `Linked ${skillsDir}/ref-base -> ${root}/.agents/skills/ref-base`,
      `Linked ${skillsDir}/ref-feature -> ${root}/.agents/skills/ref-feature`,
      `Updated ${skillsDir}/.gitignore`,
    ]);
    expect(readJson(path.join(consumer, ".agents", "config.json"))).toEqual({
      skills: { sources: [{ from: root, url: "https://example.test/source", skills: ["ref-feature", "ref-local"] }] },
    });
    expect(fs.readFileSync(path.join(skillsDir, ".gitignore"), "utf8")).toBe(
      buildSyncedSkillsGitignore(["ref-base", "ref-feature"], ["https://example.test/source"]),
    );
  });

  test("dry run leaves the config untouched and removes nothing", () => {
    const { root } = sourceRepo();
    const consumer = consumerWith([{ from: root, skills: ["ref-old-feature"] }]);
    const before = fs.readFileSync(path.join(consumer, ".agents", "config.json"), "utf8");
    const { context: ctx, output } = context(consumer);
    runSkillsSync(ctx, { destination: undefined, useGlobal: false, config: undefined, dryRun: true, force: false });
    expect(output.lines[0]).toBe("Would update config: 'ref-old-feature' -> 'ref-feature'");
    expect(fs.readFileSync(path.join(consumer, ".agents", "config.json"), "utf8")).toBe(before);
  });

  test("removes links that are no longer configured", () => {
    const { root, skills } = sourceRepo();
    const consumer = consumerWith([{ from: root, skills: ["ref-base"] }]);
    fs.mkdirSync(path.join(consumer, ".agents", "skills"), { recursive: true });
    fs.symlinkSync(path.join(skills, "ref-org"), path.join(consumer, ".agents", "skills", "ref-org"), "dir");
    const { context: ctx, output } = context(consumer);
    runSkillsSync(ctx, { destination: undefined, useGlobal: false, config: undefined, dryRun: false, force: false });
    expect(output.lines).toContain(`Removed unconfigured link ${consumer}/.agents/skills/ref-org -> ${skills}/ref-org`);
    expect(fs.existsSync(path.join(consumer, ".agents", "skills", "ref-org"))).toBe(false);
  });

  test("rejects a skill configured by two sources", () => {
    const { root } = sourceRepo();
    const other = sourceRepo();
    const consumer = consumerWith([
      { from: root, skills: ["ref-base"] },
      { from: other.root, skills: ["ref-base"] },
    ]);
    const { context: ctx } = context(consumer);
    expect(() => runSkillsSync(ctx, { destination: undefined, useGlobal: false, config: undefined, dryRun: true, force: false })).toThrow(
      "Skill 'ref-base' is configured more than once across sync sources.",
    );
  });

  test("rejects malformed source entries with the source named", () => {
    const consumer = consumerWith([{ from: "x", skills: [] }]);
    const { context: ctx } = context(consumer);
    expect(() => runSkillsSync(ctx, { destination: undefined, useGlobal: false, config: undefined, dryRun: true, force: false })).toThrow(
      "Skills config source 'x' skills must not be empty.",
    );
  });
});

describe("package sources", () => {
  test("resolve from node_modules above the config's repo", () => {
    const workspace = makeTempDir();
    writeSkill(path.join(workspace, "node_modules", "shared-skills", ".agents", "skills"), "ref-pkg", { visibility: "public" });
    const consumer = path.join(workspace, "apps", "web");
    writeJson(path.join(consumer, ".agents", "config.json"), {
      skills: { sources: [{ from: "package:shared-skills", skills: ["ref-pkg"] }] },
    });
    const { context: ctx, output } = context(consumer);
    runSkillsSync(ctx, { destination: undefined, useGlobal: false, config: undefined, dryRun: true, force: false });
    expect(output.lines[0]).toBe(
      `Would link ${consumer}/.agents/skills/ref-pkg -> ${workspace}/node_modules/shared-skills/.agents/skills/ref-pkg`,
    );
  });

  test("resolve to the running package itself, which is how the Python shim finds its skills", () => {
    const ownRoot = makeTempDir();
    writeJson(path.join(ownRoot, "package.json"), { name: "agentic-tools" });
    writeSkill(path.join(ownRoot, ".agents", "skills"), "ref-own", { visibility: "public" });
    expect(resolvePackageSourceRoot("agentic-tools", makeTempDir(), ownRoot)).toBe(ownRoot);
    expect(resolvePackageSourceRoot("agentic_tools", makeTempDir(), ownRoot)).toBe(ownRoot);
    expect(() => resolvePackageSourceRoot("other-package", makeTempDir(), ownRoot)).toThrow(
      "Could not resolve package source 'other-package'.",
    );
  });
});
