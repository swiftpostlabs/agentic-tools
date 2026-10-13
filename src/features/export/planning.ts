/**
 * Choose which skills go out and group them into files. Bundling optimises for retrieval coherence,
 * not byte packing: a bundle mixing unrelated domains retrieves worse than a narrow one, and domains
 * are already a coherence judgement recorded in skill metadata. Destination limits are guardrails,
 * enforced loudly when they bind and ignored otherwise.
 */
import { ToolError } from "../../core/errors.ts";
import {
  bundleWordCount,
  skillPrefix,
  type Bundle,
  type ExportPlan,
  type Selection,
  type SkillDocument,
  type TargetLimits,
} from "./models.ts";

const rejectionReason = (skill: SkillDocument, selection: Selection): string | undefined => {
  const excludedReason = selection.excludedSkills[skill.name];
  if (excludedReason !== undefined) {
    return excludedReason;
  }
  // An explicit include list overrides every other filter: naming a skill is a stronger signal than
  // any category rule it falls outside of.
  if (selection.includedSkills.length > 0) {
    return selection.includedSkills.includes(skill.name) ? undefined : "not in the requested skill list";
  }
  if (selection.visibilities.length > 0 && !selection.visibilities.includes(skill.visibility)) {
    return `visibility is ${skill.visibility}`;
  }
  const prefix = skillPrefix(skill);
  if (selection.prefixes.length > 0 && !selection.prefixes.includes(prefix)) {
    return `prefix ${prefix} is not exported`;
  }
  if (selection.domains.length > 0 && !selection.domains.includes(skill.domain)) {
    return `domain ${skill.domain} is not in the requested domains`;
  }
  if (selection.excludedDomains.includes(skill.domain)) {
    return `domain ${skill.domain} is excluded`;
  }
  return undefined;
};

/** Apply a request's filters, recording why each dropped skill was dropped. */
export const selectSkills = (
  skills: SkillDocument[],
  selection: Selection,
): { kept: SkillDocument[]; dropped: Record<string, string> } => {
  const kept: SkillDocument[] = [];
  const dropped: Record<string, string> = {};
  for (const skill of skills) {
    const reason = rejectionReason(skill, selection);
    if (reason === undefined) {
      kept.push(skill);
    } else {
      dropped[skill.name] = reason;
    }
  }
  return { kept, dropped };
};

const byWordsDescending = (left: Bundle, right: Bundle): number => bundleWordCount(right) - bundleWordCount(left);

/** One bundle per domain, largest first. */
export const bundleByDomain = (skills: SkillDocument[]): Bundle[] => {
  const grouped = new Map<string, SkillDocument[]>();
  for (const skill of skills) {
    grouped.set(skill.domain, [...(grouped.get(skill.domain) ?? []), skill]);
  }
  return [...grouped.keys()]
    .sort()
    .map((domain) => ({ name: domain, skills: grouped.get(domain) ?? [] }))
    .sort(byWordsDescending);
};

const skillsByteSize = (skills: SkillDocument[]): number =>
  skills.reduce((total, skill) => total + Buffer.byteLength(skill.body, "utf8"), 0);

/** Split by whole skills until every part fits; splitting mid-skill would separate guidance from its reasons. */
const splitOversized = (bundle: Bundle, maxBytes: number): Bundle[] => {
  if (skillsByteSize(bundle.skills) <= maxBytes || bundle.skills.length <= 1) {
    return [bundle];
  }
  const parts: Bundle[] = [];
  let current: SkillDocument[] = [];
  for (const skill of bundle.skills) {
    const candidate = [...current, skill];
    if (current.length > 0 && skillsByteSize(candidate) > maxBytes) {
      parts.push({ name: `${bundle.name}-${parts.length + 1}`, skills: current });
      current = [skill];
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) {
    parts.push({ name: `${bundle.name}-${parts.length + 1}`, skills: current });
  }
  return parts;
};

/**
 * Bring a bundle set inside the destination's hard limits. Over the file ceiling, the smallest
 * bundles merge first: they carry the least content, so mixing them costs the least retrieval
 * quality.
 */
export const enforceLimits = (
  bundles: Bundle[],
  limits: TargetLimits,
  strict = false,
): { bundles: Bundle[]; notices: string[] } => {
  const notices: string[] = [];
  const working = [...bundles];

  while (working.length > limits.maxFiles) {
    if (strict) {
      throw new ToolError(
        `${working.length} bundles exceed the ${limits.maxFiles}-file limit for this target: ` +
          working.map((bundle) => bundle.name).join(", "),
      );
    }
    working.sort((left, right) => bundleWordCount(left) - bundleWordCount(right));
    const [first, second] = working.splice(0, 2) as [Bundle, Bundle];
    const merged = { name: `${first.name}-${second.name}`, skills: [...first.skills, ...second.skills] };
    notices.push(
      `merged '${first.name}' (${bundleWordCount(first)} words) and '${second.name}' (${bundleWordCount(second)} words) ` +
        `into '${merged.name}' to stay within the ${limits.maxFiles}-file limit`,
    );
    working.push(merged);
  }

  const expanded = working.flatMap((bundle) => {
    const parts = splitOversized(bundle, limits.maxFileBytes);
    if (parts.length > 1) {
      notices.push(
        `split '${bundle.name}' into ${parts.length} files to stay under ${limits.maxFileBytes} bytes per file`,
      );
    }
    return parts;
  });

  for (const bundle of expanded) {
    const words = bundleWordCount(bundle);
    if (words > limits.softWordsPerBundle) {
      notices.push(
        `'${bundle.name}' is ${words} words, above the ${limits.softWordsPerBundle}-word guideline; retrieval may be ` +
          "noisier. Consider selecting fewer skills for this bundle.",
      );
    }
  }

  return { bundles: expanded.sort(byWordsDescending), notices };
};

/** Select, bundle, and fit an export without writing anything. */
export const buildPlan = (
  skills: SkillDocument[],
  selection: Selection,
  limits: TargetLimits,
  strict = false,
): ExportPlan => {
  const { kept, dropped } = selectSkills(skills, selection);
  const { bundles, notices } = enforceLimits(bundleByDomain(kept), limits, strict);
  return { bundles, excluded: dropped, notices };
};
