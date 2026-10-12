/**
 * Data shapes for skill exports. An export is a request, not repository policy: "give me these
 * skills, in this shape, now". Nothing here is meant to be checked in, which is why the config is
 * loaded from any path or assembled from flags rather than living in `.agents/config.json`.
 */

/** One discovered skill, flattened from `SKILL.md` plus its `references/`. */
export type SkillDocument = {
  name: string;
  domain: string;
  visibility: string;
  description: string;
  body: string;
};

/**
 * Which skills a request wants. Empty lists mean no constraint on that axis. `excludedSkills` maps
 * a skill to the reason it was left out, so an exclusion stays reviewable instead of folklore.
 */
export type Selection = {
  visibilities: string[];
  prefixes: string[];
  domains: string[];
  excludedDomains: string[];
  includedSkills: string[];
  excludedSkills: Record<string, string>;
};

/**
 * Ceilings imposed by the destination. `maxFiles` and `maxFileBytes` are enforced;
 * `softWordsPerBundle` only warns, because splitting on it would trade retrieval coherence for a
 * number nobody set.
 */
export type TargetLimits = { maxFiles: number; maxFileBytes: number; softWordsPerBundle: number };

/** One output file: skills that belong together for retrieval. */
export type Bundle = { name: string; skills: SkillDocument[] };

/** What an export would produce, before anything is written. */
export type ExportPlan = { bundles: Bundle[]; excluded: Record<string, string>; notices: string[] };

export const emptySelection: Selection = {
  visibilities: [],
  prefixes: [],
  domains: [],
  excludedDomains: [],
  includedSkills: [],
  excludedSkills: {},
};

/** The role prefix (`ref-`, `tool-`) used for selection. */
export const skillPrefix = (skill: SkillDocument): string => `${skill.name.split("-")[0] ?? ""}-`;

export const countWords = (text: string): number => text.split(/\s+/).filter((word) => word !== "").length;

export const skillWordCount = (skill: SkillDocument): number => countWords(skill.body);

export const bundleWordCount = (bundle: Bundle): number =>
  bundle.skills.reduce((total, skill) => total + skillWordCount(skill), 0);

export const planSkillCount = (plan: ExportPlan): number =>
  plan.bundles.reduce((total, bundle) => total + bundle.skills.length, 0);

export const planWordCount = (plan: ExportPlan): number =>
  plan.bundles.reduce((total, bundle) => total + bundleWordCount(bundle), 0);

/** Format an integer with thousands separators, like Python's `{:,}`. */
export const formatCount = (value: number): string => Math.round(value).toLocaleString("en-US");
