/**
 * Emit an export shaped for a Gemini Gem. A Gem gives back two of the three mechanisms a skill relies
 * on: the instruction field acts as an always-loaded routing document, and Knowledge files are
 * retrieved when relevant. It cannot run anything, so the export is prose only. Routing lives in the
 * instructions, because retrieval picks within the corpus but cannot say when to reach for it.
 */
import fs from "node:fs";
import path from "node:path";
import {
  bundleWordCount,
  formatCount,
  planSkillCount,
  planWordCount,
  type Bundle,
  type ExportPlan,
  type TargetLimits,
} from "./models.ts";

/** Google documents 10 knowledge files per Gem and 100 MB per file. The word guideline is ours. */
export const geminiGemLimits: TargetLimits = {
  maxFiles: 10,
  maxFileBytes: 100 * 1024 * 1024,
  softWordsPerBundle: 40_000,
};

const bundleMapPlaceholder = "{{BUNDLE_MAP}}";

export const bundleFilename = (bundle: Bundle): string => `${bundle.name}.md`;

/** One knowledge file. Each skill keeps its heading and description so a retrieved chunk carries its context. */
export const renderBundle = (bundle: Bundle): string => {
  const header = [
    `# ${bundle.name} knowledge`,
    "",
    `Covers ${bundle.skills.length} topics: ${bundle.skills.map((skill) => skill.name).join(", ")}.`,
    "",
  ];
  const sections = bundle.skills.map((skill) =>
    skill.description === ""
      ? `---\n\n# ${skill.name}\n\n${skill.body}`
      : `---\n\n# ${skill.name}\n\n_When this applies: ${skill.description}_\n\n${skill.body}`,
  );
  return `${header.join("\n")}${sections.join("\n\n")}\n`;
};

export const bundleSizeKb = (bundle: Bundle): number => Buffer.byteLength(renderBundle(bundle), "utf8") / 1024;

/**
 * Pull the activation clause out of a description written as "<what>. Use when: <triggers>", falling
 * back to the whole description when the convention was not followed.
 */
const triggerFrom = (description: string): string => {
  const marker = description.toLowerCase().indexOf("use when:");
  const trigger = marker === -1 ? description : description.slice(marker + "use when:".length);
  const collapsed = trigger.split(/\s+/).filter((word) => word !== "").join(" ");
  if (collapsed.length <= 300) {
    return collapsed;
  }
  const head = collapsed.slice(0, 297);
  const lastSpace = head.lastIndexOf(" ");
  return `${lastSpace === -1 ? head : head.slice(0, lastSpace)}…`;
};

/** "ref-sp-js-react-native" -> "react native": the topic after the owner and domain segments. */
const topicFrom = (name: string): string => {
  const parts = name.split("-");
  const topic = parts.length > 3 ? parts.slice(3).join("-") : (parts.at(-1) ?? name);
  return topic.replaceAll("-", " ");
};

/**
 * The routing block injected into the instruction template. Bundle-level rather than skill-level,
 * which keeps the always-loaded layer small; retrieval does the fine-grained selection.
 */
export const renderBundleMap = (plan: ExportPlan): string => {
  const lines: string[] = [];
  for (const bundle of plan.bundles) {
    lines.push(`**\`${bundleFilename(bundle)}\`**`, "");
    for (const skill of bundle.skills) {
      lines.push(`- *${topicFrom(skill.name)}* — ${triggerFrom(skill.description)}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
};

/**
 * Fill an instruction template. `injections` carries canonical blocks copied verbatim out of skills;
 * the projection is a copy, never an edit, because a projection that edits its source is a fork.
 */
export const renderInstructions = (plan: ExportPlan, template: string, injections: Record<string, string> = {}): string => {
  let rendered = template;
  for (const [name, value] of Object.entries(injections)) {
    rendered = rendered.replaceAll(`{{${name}}}`, value);
  }
  if (!rendered.includes(bundleMapPlaceholder)) {
    return `${rendered.trimEnd()}\n\n## Knowledge files\n\n${renderBundleMap(plan)}\n`;
  }
  return rendered.replaceAll(bundleMapPlaceholder, renderBundleMap(plan));
};

export const renderReadme = (plan: ExportPlan, outDir: string): string => {
  const lines = [
    "# Gemini Gem export",
    "",
    "Generated. Re-run the exporter rather than editing these files by hand.",
    "",
    "## How to use",
    "",
    "1. Create a Gem at <https://gemini.google.com>.",
    "2. Paste `instructions.md` into the Gem's instructions field. Its length limit is undocumented; if it is " +
      "rejected, shorten the prose rather than the routing block — routing is the part retrieval cannot replace.",
    `3. Upload the ${plan.bundles.length} \`.md\` files below under **Knowledge**.`,
    "",
    "## Contents",
    "",
    "| File | Skills | Words | KB |",
    "| --- | --- | --- | --- |",
    ...plan.bundles.map(
      (bundle) =>
        `| \`${bundleFilename(bundle)}\` | ${bundle.skills.length} | ${formatCount(bundleWordCount(bundle))} | ` +
        `${formatCount(bundleSizeKb(bundle))} |`,
    ),
    "",
    `**${planSkillCount(plan)} skills, ${formatCount(planWordCount(plan))} words** across ${plan.bundles.length} of ` +
      `${geminiGemLimits.maxFiles} allowed knowledge files.`,
    "",
  ];

  if (plan.notices.length > 0) {
    lines.push("## Notices", "", ...plan.notices.map((notice) => `- ${notice}`), "");
  }
  const excluded = Object.entries(plan.excluded).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  if (excluded.length > 0) {
    lines.push(
      "## Excluded, and why",
      "",
      "| Skill | Reason |",
      "| --- | --- |",
      ...excluded.map(([name, reason]) => `| \`${name}\` | ${reason} |`),
      "",
    );
  }
  lines.push(
    "## Limits this export respects",
    "",
    "- 10 knowledge files per Gem, 100 MB per file (<https://support.google.com/gemini/answer/14903178>).",
    "- Bundles are grouped by skill domain for retrieval coherence, not packed by size.",
    `- Output directory: \`${outDir}\`.`,
    "",
  );
  return lines.join("\n");
};

/** Write the knowledge files, instructions, and README, returning what was written. */
export const writeExport = (
  plan: ExportPlan,
  outDir: string,
  template: string,
  injections: Record<string, string> = {},
  outLabel: string = outDir,
): string[] => {
  fs.mkdirSync(outDir, { recursive: true });
  const files: Array<[string, string]> = [
    ...plan.bundles.map((bundle): [string, string] => [bundleFilename(bundle), renderBundle(bundle)]),
    ["instructions.md", renderInstructions(plan, template, injections)],
    ["README.md", renderReadme(plan, outLabel)],
  ];
  return files.map(([name, content]) => {
    const target = path.join(outDir, name);
    fs.writeFileSync(target, content, "utf8");
    return target;
  });
};
