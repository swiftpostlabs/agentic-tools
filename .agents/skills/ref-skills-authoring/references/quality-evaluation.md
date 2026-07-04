# Quality Evaluation Workflow

Use this file when a skill is important enough to test with realistic runs, human review, and objective checks.

## Source Note

This workflow adapts portable practices from the Apache-2.0 Claude skill-creator bundle kept at `.agents/tasks/claude-skills-creator/skill-creator/`. The source bundle's Claude-only trigger harness, CLI assumptions, and browser workflow are not copied as requirements. Keep this skill compatible with the Agent Skills format and the repo's provider-agnostic rules.

## Claude Bundle Adoption Decisions

Use this table when reviewing why only part of the local Claude skill-creator bundle was promoted into `ref-skills-authoring`.

| Source artifact | Decision | Reason |
| --- | --- | --- |
| `scripts/quick_validate.py` | Adapted as `./scripts/validate-skill.mts` (TypeScript, Node >= 22). | The validation idea is portable, but the implementation was rewritten to avoid a YAML dependency, support catalog-wide checks, respect this repo's metadata conventions, and report warnings/errors predictably. Sharing-spec checks were split out to `ref-shareable-skills/scripts/validate-sharing.mts`. |
| `scripts/aggregate_benchmark.py` | Adapted as `./scripts/aggregate_eval_results.py`. | Aggregating `grading.json` results is provider-agnostic, but the local version is simplified around generic eval workspaces and stable JSON/Markdown output. |
| `scripts/run_eval.py`, `scripts/run_loop.py`, and `scripts/improve_description.py` | Not copied; only the trigger-eval concepts were retained. | These scripts depend on `claude -p`, `.claude/commands`, Claude stream events, Claude auth/session behavior, and description optimization against Claude's available-skills mechanism. That would violate this skill's provider-agnostic Agent Skills compatibility. |
| `scripts/generate_report.py`, `eval-viewer/generate_review.py`, and `eval-viewer/viewer.html` | Not copied. | The report and viewer are useful for a specific generated-run workflow, but they introduce a browser/server review surface and UI assumptions that are not required for the portable skill-authoring workflow. |
| `scripts/package_skill.py` | Not copied. | This repo currently shares skills through source directories, package installation, and symlink/sync tooling rather than a `.skill` zip package flow; the source packager also excludes root `evals/` by default and depends on the source validator shape. |
| `scripts/utils.py` | Not copied as a standalone helper. | Its useful parsing behavior was folded into the rewritten validator where needed; the rest only supports the Claude-specific runner scripts. |
| `agents/analyzer.md`, `agents/comparator.md`, and `agents/grader.md` | Not copied as agent files. | Their roles were preserved as review practices in this document: evidence-backed grading, baseline comparison, trace review, and human review. Keeping client-specific agent prompt files would make the skill less portable. |
| `references/schemas.md` | Partially summarized instead of copied wholesale. | The stable field expectations that matter for aggregation, especially `text`, `passed`, and `evidence`, are documented here without importing viewer-specific schema requirements. |

Adopt future source artifacts only when they are deterministic, non-interactive, dependency-light, useful outside one client, and compatible with the Agent Skills package shape. Otherwise, preserve the principle in prose or an eval rather than copying the implementation.

## Intake

Before writing or revising evals, capture the intent:

- What should the skill make the agent better at doing?
- Which user prompts and contexts should trigger it?
- What output shape or artifact should success produce?
- Which edge cases, input files, tools, or repo commands matter?
- Is the outcome objectively checkable, mostly subjective, or both?

Extract answers from the current conversation, previous corrections, transcripts, and existing artifacts before asking the user for missing details.

## Test Prompts

Write prompts a real user would send. Include file paths, partial context, typos, indirect wording, and near misses when they reveal trigger boundaries.

For trigger evals:

- Use both `should_trigger: true` and `should_trigger: false` cases.
- Prefer tricky near misses over obviously irrelevant negatives.
- Run multiple times if the client is nondeterministic.
- Keep a held-out validation split when tuning a description.

For output evals:

- Put maintained prompts in `evals/evals.json`.
- Include input fixtures under `evals/files/` when prompts need files.
- Start with expected outcomes, then add assertions or expectations after the first run clarifies what good output looks like.

## Baselines

Compare skill runs with a baseline:

- New skill: compare `with_skill` against `without_skill`.
- Existing skill: compare the edited skill against a snapshot of the previous version.
- Client-specific skill: document the client and model because trigger behavior may differ.

Launch comparable runs as close together as possible so timing, tool availability, and context differences do not dominate the comparison.

## Grading

Grade outputs against explicit assertions or expectations. A grade should pass only when evidence demonstrates real task completion.

Good grading evidence:

- quotes from output files or transcripts,
- validator script output,
- parsed file structure,
- checked artifact properties,
- specific trace steps showing the intended script or workflow was used.

Weak grading evidence:

- a file exists but content was not checked,
- a heading exists without substance,
- the transcript claims success but the artifact was not inspected,
- the assertion could pass on a hallucinated or empty output.

Use the exact fields `text`, `passed`, and `evidence` for each graded expectation when a result will be aggregated or shown in a report.

## Trace Review

Read execution traces as well as final outputs.

Look for:

- instructions the agent ignored,
- branches that wasted time,
- repeated helper code that should become a script,
- ambiguity that caused the agent to invent its own workflow,
- assertions that always pass or always fail in both baseline and skill runs,
- high-variance runs that may indicate flaky prompts or nondeterministic tooling.

If several runs independently rebuild the same parser, formatter, or checker, add a deterministic script under `scripts/` and teach the skill when to use it.

## Human Review

Use human review for holistic quality and subjective judgment. Present prompts, outputs, grades, and benchmark summaries in a compact form before revising the skill.

Treat empty feedback as approval for that case. Treat specific feedback as evidence to generalize from, not as a reason to overfit the skill to one prompt.

## Revision Rules

When a skill fails:

- If the agent was confused, simplify the instructions or provide one stronger default.
- If the output missed a repeatable mechanical step, add or improve a script.
- If the skill increased time or tokens without improving quality, remove low-signal prose or move detail into a reference.
- If an assertion is non-discriminating, improve the eval before trusting the score.

Avoid piling on rigid all-caps rules when a clearer explanation of why the behavior matters would generalize better.

## Helper Scripts

- Run `node ./scripts/validate-skill.mts <skill-dir>` before packaging or sharing a skill (needs Node >= 22).
- Run `node ./scripts/validate-skill.mts .agents/skills --all` during catalog maintenance.
- For sharing-spec conformance, also run `node ../ref-shareable-skills/scripts/validate-sharing.mts .agents/skills --all`.
- Run `./scripts/aggregate_eval_results.py <workspace>` after output evals produce `grading.json` files.

Generated run outputs should live in a temporary workspace near the skill or under `.agents/tasks/`, not inside the skill package unless curated as fixtures.
