import { defineCommand } from "citty";
import { defineStrictCommand, type CommandContext } from "../../core/command.ts";
import { runSkillsLink, runSkillsList, runSkillsSync, runSkillsUnlink } from "./skills.ts";

const sourceArgs = {
  from: {
    type: "string",
    alias: "f",
    description: "Source repository root or exact .agents/skills directory. Defaults to the current directory.",
    valueHint: "source",
  },
} as const;

const destinationArgs = {
  to: {
    type: "string",
    alias: "t",
    description: "Destination repository root or exact .agents/skills directory. Defaults to the current directory.",
    valueHint: "repo",
  },
  global: { type: "boolean", alias: "g", description: "Use ~/.agents/skills as the destination." },
  "dry-run": { type: "boolean", description: "Print the plan without changing any links." },
} as const;

const forceArgs = {
  force: { type: "boolean", description: "Replace an existing symlink that points somewhere else." },
} as const;

/** citty binds only the first positional to `skill`; the rest stay in `_`. */
const skillNamesArgs = { skill: { type: "positional", description: "Skill names.", required: true } } as const;

const destination = (args: { to?: string | undefined; global?: boolean | undefined; "dry-run"?: boolean | undefined }) => ({
  destination: args.to,
  useGlobal: args.global === true,
  dryRun: args["dry-run"] === true,
});

/** `agentic-tools skills <list|link|sync|unlink>`. */
export const createSkillsCommand = (context: CommandContext) =>
  defineCommand({
    meta: { name: "skills", description: "List, link, sync, and unlink shared skills." },
    subCommands: {
      list: defineStrictCommand({
        meta: { name: "list", description: "List skills from a source repo." },
        args: sourceArgs,
        run: ({ args }) => {
          runSkillsList(context, args.from);
        },
      }),
      link: defineStrictCommand({
        meta: { name: "link", description: "Link skills from a source repo." },
        args: { ...skillNamesArgs, ...sourceArgs, ...destinationArgs, ...forceArgs },
        run: ({ args }) => {
          runSkillsLink(context, {
            ...destination(args),
            skills: args._,
            source: args.from,
            force: args.force === true,
          });
        },
      }),
      sync: defineStrictCommand({
        meta: { name: "sync", description: "Link skills declared in a skills config." },
        args: {
          ...destinationArgs,
          config: {
            type: "string",
            alias: "c",
            description: "Agents config or skills config. Defaults to <destination>/.agents/config.json.",
            valueHint: "path",
          },
          ...forceArgs,
        },
        run: ({ args }) => {
          runSkillsSync(context, { ...destination(args), config: args.config, force: args.force === true });
        },
      }),
      unlink: defineStrictCommand({
        meta: { name: "unlink", description: "Remove linked skills from a destination repo." },
        args: { ...skillNamesArgs, ...sourceArgs, ...destinationArgs },
        run: ({ args }) => {
          runSkillsUnlink(context, { ...destination(args), skills: args._, source: args.from });
        },
      }),
    },
  });
