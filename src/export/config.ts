/**
 * Load an export request from presets, a config file, and flags. Precedence, weakest first: preset,
 * then config file, then flags. Presets stay generic (visibility, prefix, domain): a preset naming
 * concrete skills would mean nothing in a consuming repo running the same CLI.
 */
import fs from "node:fs";
import { z } from "zod";
import { ToolError } from "../core/errors.ts";
import { isFile } from "../core/fs.ts";
import { errorMessage, isJsonObject, parseWith, type JsonObject } from "../core/json.ts";
import { emptySelection, type Selection } from "./models.ts";

export const presets = {
  // Subject-matter guidance; excludes the meta-domain about authoring skills.
  knowledge: { ...emptySelection, visibilities: ["public"], prefixes: ["ref-"], excludedDomains: ["agents"] },
  // Everything portable, meta included.
  everything: { ...emptySelection, visibilities: ["public"], prefixes: ["ref-"] },
} satisfies Record<string, Selection>;

export type PresetName = keyof typeof presets;

const isPresetName = (value: string): value is PresetName => Object.hasOwn(presets, value);

export type ExportConfig = JsonObject;

export const loadConfigFile = (target: string): ExportConfig => {
  if (!isFile(target)) {
    throw new ToolError(`config file not found: ${target}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(target, "utf8"));
  } catch (error) {
    throw new ToolError(`config file is not valid JSON: ${target} (${errorMessage(error)})`);
  }
  if (!isJsonObject(parsed)) {
    throw new ToolError(`config file must contain a JSON object: ${target}`);
  }
  return parsed;
};

const stringList = (field: string) =>
  z
    .array(z.string({ error: `'${field}' must contain only strings` }), { error: `'${field}' must be a list of strings` })
    .optional();

const reasonMap = (field: string) =>
  z
    .unknown()
    .transform((value, context): Record<string, string> => {
      if (value === undefined || value === null) {
        return {};
      }
      if (Array.isArray(value)) {
        context.addIssue({
          code: "custom",
          message:
            `'${field}' must be an object mapping skill name to a reason, not a list — an exclusion ` +
            "without a recorded reason becomes folklore",
        });
        return z.NEVER;
      }
      if (!isJsonObject(value)) {
        context.addIssue({ code: "custom", message: `'${field}' must be an object mapping skill name to a reason` });
        return z.NEVER;
      }
      if (!Object.values(value).every((reason) => typeof reason === "string")) {
        context.addIssue({ code: "custom", message: `'${field}' keys and values must both be strings` });
        return z.NEVER;
      }
      return value as Record<string, string>;
    });

const selectSchema = z.object(
  {
    visibility: stringList("select.visibility"),
    prefixes: stringList("select.prefixes"),
    domains: stringList("select.domains"),
    excludeDomains: stringList("select.excludeDomains"),
    skills: stringList("select.skills"),
    excludeSkills: reasonMap("select.excludeSkills"),
  },
  { error: "'select' must be an object" },
);

/** Non-empty values win over the base; empty or missing ones keep it. */
const orBase = (value: string[] | undefined, base: string[]): string[] =>
  value === undefined || value.length === 0 ? base : value;

/** Overlay a config file's `select` block onto a base selection. */
export const selectionFromConfig = (config: ExportConfig, base: Selection): Selection => {
  if (config["select"] === undefined || config["select"] === null) {
    return base;
  }
  const select = parseWith(selectSchema, config["select"]);
  return {
    visibilities: orBase(select.visibility, base.visibilities),
    prefixes: orBase(select.prefixes, base.prefixes),
    domains: orBase(select.domains, base.domains),
    excludedDomains: orBase(select.excludeDomains, base.excludedDomains),
    includedSkills: orBase(select.skills, base.includedSkills),
    excludedSkills: { ...base.excludedSkills, ...select.excludeSkills },
  };
};

/**
 * The `inject` block: placeholder name to the skill that publishes its text. Skill names live in the
 * request, never in the tool, for the same reason presets stay generic.
 */
export const injectionsFromConfig = (config: ExportConfig | undefined): Record<string, string> => {
  const raw = config?.["inject"];
  if (raw === undefined || raw === null) {
    return {};
  }
  if (!isJsonObject(raw)) {
    throw new ToolError("'inject' must be an object mapping a placeholder name to a skill name");
  }
  const mapping: Record<string, string> = {};
  for (const [placeholder, skillName] of Object.entries(raw)) {
    if (typeof skillName !== "string") {
      throw new ToolError(`'inject.${placeholder}' must be a skill name, as a string`);
    }
    mapping[placeholder] = skillName;
  }
  return mapping;
};

/** Combine preset, config file, and flags into one selection. */
export const resolveSelection = (options: {
  preset: string;
  config: ExportConfig | undefined;
  domains: string[];
  excludedSkills: string[];
}): Selection => {
  if (!isPresetName(options.preset)) {
    throw new ToolError(`unknown preset '${options.preset}'. Available: ${Object.keys(presets).sort().join(", ")}`);
  }
  const preset: Selection = { ...presets[options.preset] };
  let selection = options.config === undefined ? preset : selectionFromConfig(options.config, preset);
  if (options.domains.length > 0) {
    selection = { ...selection, domains: options.domains };
  }
  if (options.excludedSkills.length > 0) {
    selection = {
      ...selection,
      excludedSkills: {
        ...selection.excludedSkills,
        ...Object.fromEntries(options.excludedSkills.map((name) => [name, "excluded on the command line"])),
      },
    };
  }
  return selection;
};
