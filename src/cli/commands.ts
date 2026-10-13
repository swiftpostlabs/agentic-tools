import path from "node:path";
import { runExportBuild } from "../features/export/build.ts";
import { buildManifests, findDriftedManifests, writeManifests } from "../features/plugin/manifests.ts";
import { runPolicyCommand, type PolicyMode } from "../features/policy/sync.ts";
import { runSkillsLink, runSkillsList, runSkillsSync, runSkillsUnlink } from "../features/skills/skills.ts";
import { booleanValue, listValue, stringValue, type CommandGroup, type CommandSpec, type OptionSpecs } from "./spec.ts";

const configOption: OptionSpecs = {
  config: { type: "string", short: "c", description: "Path to an agents config or policy file.", valueName: "path" },
};

const policyCommand = (mode: PolicyMode, description: string): CommandSpec => ({
  description,
  options: configOption,
  run: (context, values) => {
    runPolicyCommand({ mode, config: stringValue(values, "config"), cwd: context.cwd, home: context.home }).forEach(
      context.output.info,
    );
  },
});

const sourceOption: OptionSpecs = {
  from: {
    type: "string",
    short: "f",
    description: "Source repository root or exact .agents/skills directory. Defaults to the current directory.",
    valueName: "source",
  },
};

const destinationOptions: OptionSpecs = {
  to: {
    type: "string",
    short: "t",
    description: "Destination repository root or exact .agents/skills directory. Defaults to the current directory.",
    valueName: "repo",
  },
  global: { type: "boolean", short: "g", description: "Use ~/.agents/skills as the destination." },
  "dry-run": { type: "boolean", description: "Print the plan without changing any links." },
};

const forceOption: OptionSpecs = {
  force: { type: "boolean", description: "Replace an existing symlink that points somewhere else." },
};

const skillNames = { name: "skill", description: "Skill names." };

const destination = (values: Parameters<CommandSpec["run"]>[1]) => ({
  destination: stringValue(values, "to"),
  useGlobal: booleanValue(values, "global"),
  dryRun: booleanValue(values, "dry-run"),
});

const pluginRootOption: OptionSpecs = {
  root: {
    type: "string",
    description: "Repository root to read the catalog from and write manifests to.",
    default: ".",
    valueName: "path",
  },
};

export const commandGroups: Record<string, CommandGroup> = {
  policy: {
    description: "Sync or check generated agent policy files.",
    commands: {
      sync: policyCommand("sync", "Sync generated policy files from .agents/config.json."),
      check: policyCommand("check", "Report drift without rewriting generated policy files."),
      "import-vscode": policyCommand("import-vscode", "Import VS Code approvals into the policy file before syncing."),
    },
  },
  skills: {
    description: "List, link, sync, and unlink shared skills.",
    commands: {
      list: {
        description: "List skills from a source repo.",
        options: sourceOption,
        run: (context, values) => runSkillsList(context, stringValue(values, "from")),
      },
      link: {
        description: "Link skills from a source repo.",
        options: { ...sourceOption, ...destinationOptions, ...forceOption },
        positional: skillNames,
        run: (context, values, positionals) =>
          runSkillsLink(context, {
            ...destination(values),
            skills: positionals,
            source: stringValue(values, "from"),
            force: booleanValue(values, "force"),
          }),
      },
      sync: {
        description: "Link skills declared in a skills config.",
        options: {
          ...destinationOptions,
          config: {
            type: "string",
            short: "c",
            description: "Agents config or skills config. Defaults to <destination>/.agents/config.json.",
            valueName: "path",
          },
          ...forceOption,
        },
        run: (context, values) =>
          runSkillsSync(context, {
            ...destination(values),
            config: stringValue(values, "config"),
            force: booleanValue(values, "force"),
          }),
      },
      unlink: {
        description: "Remove linked skills from a destination repo.",
        options: { ...sourceOption, ...destinationOptions },
        positional: skillNames,
        run: (context, values, positionals) =>
          runSkillsUnlink(context, { ...destination(values), skills: positionals, source: stringValue(values, "from") }),
      },
    },
  },
  plugin: {
    description: "Generate and verify the Claude Code plugin and marketplace manifests.",
    commands: {
      sync: {
        description: "Regenerate the plugin manifests from the skills catalog.",
        options: pluginRootOption,
        run: (context, values) => {
          const root = path.resolve(context.cwd, stringValue(values, "root") ?? ".");
          for (const written of writeManifests(root, buildManifests(root))) {
            context.output.info(`wrote ${written}`);
          }
        },
      },
      check: {
        description: "Fail if the committed plugin manifests drift from the skills catalog.",
        options: pluginRootOption,
        run: (context, values) => {
          const root = path.resolve(context.cwd, stringValue(values, "root") ?? ".");
          const drifted = findDriftedManifests(root, buildManifests(root));
          if (drifted.length === 0) {
            context.output.info("Plugin manifests are up to date.");
            return 0;
          }
          for (const relative of drifted) {
            context.output.error(`Drift detected: ${relative} does not match the skills catalog`);
          }
          context.output.error("Run `agentic-tools plugin sync` and commit the regenerated manifests.");
          return 1;
        },
      },
    },
  },
  export: {
    description: "Build a skill export for a chat assistant that cannot load skills itself.",
    commands: {
      build: {
        description: "Select skills, bundle them for retrieval, and write the export.",
        options: {
          target: { type: "string", description: "Destination shape. Only 'gemini-gem'.", default: "gemini-gem" },
          preset: {
            type: "string",
            description: "Named selection to start from: 'knowledge' or 'everything'.",
            default: "knowledge",
          },
          config: { type: "string", description: "Path to an export config file. Need not be checked in.", valueName: "path" },
          domains: { type: "string", description: "Comma-separated domains to restrict the export to.", valueName: "list" },
          exclude: { type: "string", multiple: true, description: "Skill name to exclude. Repeatable.", valueName: "skill" },
          "skills-root": {
            type: "string",
            description: "Directory containing skill folders.",
            default: ".agents/skills",
            valueName: "path",
          },
          out: { type: "string", description: "Where to write the export.", valueName: "path" },
          instructions: {
            type: "string",
            description: "Instruction template. Use {{BUNDLE_MAP}} where routing should go.",
            valueName: "path",
          },
          "dry-run": { type: "boolean", description: "Print the plan without writing anything." },
          strict: { type: "boolean", description: "Fail instead of merging bundles when a limit would be exceeded." },
        },
        run: (context, values) =>
          runExportBuild({
            cwd: context.cwd,
            output: context.output,
            target: stringValue(values, "target") ?? "gemini-gem",
            preset: stringValue(values, "preset") ?? "knowledge",
            config: stringValue(values, "config"),
            domains: stringValue(values, "domains"),
            exclude: listValue(values, "exclude"),
            skillsRoot: stringValue(values, "skills-root") ?? ".agents/skills",
            out: stringValue(values, "out"),
            instructions: stringValue(values, "instructions"),
            dryRun: booleanValue(values, "dry-run"),
            strict: booleanValue(values, "strict"),
          }),
      },
    },
  },
};
