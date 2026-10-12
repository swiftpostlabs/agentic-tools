/** Render `.aiexclude`: protected patterns first, then noise and generated output. */
export const buildAiExcludeContent = (options: {
  protectedFiles: string[];
  excludedFiles: string[];
  policyLabel: string;
}): string =>
  [
    "# ==============================================================================",
    "# AI EXCLUSION FILE",
    `# Generated from ${options.policyLabel}`,
    "# Protected files are sensitive; excluded files are mostly noise or generated output.",
    "# ==============================================================================",
    "",
    "# --- 1. Protected files ---",
    ...options.protectedFiles,
    "",
    "# --- 2. Excluded noise / generated output ---",
    ...options.excludedFiles,
    "",
  ].join("\n");
