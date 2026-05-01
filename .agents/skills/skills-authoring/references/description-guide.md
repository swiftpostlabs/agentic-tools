# Description Guide

Use this file when drafting or revising the `description` field in a skill.

## Why It Matters

In the Agent Skills loading model, the description is the main discovery surface. Agents typically see the `name` and `description` first and decide from that whether to load the full `SKILL.md`.

If the description is weak:

- The skill will not trigger when it should.
- The skill may false-trigger on adjacent tasks.
- The quality of the `SKILL.md` body will not matter because the body will not load.

## Writing Rules

- Write it as activation guidance: `Use this skill when...`
- Focus on user intent and job-to-be-done.
- Mention the kinds of artifacts, workflows, and near-miss phrasings the user may use.
- Keep it concise but concrete.
- Do not describe only the internals of the skill.
- Keep it under the spec limit of 1024 characters.

## Good Shape

Strong descriptions usually answer both questions:

1. What capability does the skill provide?
2. In what situations should the agent activate it?

Example:

```yaml
description: >
  Analyze CSV and tabular data files, compute summary statistics, generate charts,
  clean messy rows, and add derived columns. Use this skill when the user wants
  to explore, transform, or visualize spreadsheet-like data, even if they do not
  explicitly mention CSV or analysis.
```

Weak example:

```yaml
description: Helps with CSVs.
```

## Common Failure Modes

### Too Narrow

The skill only triggers when the user uses the exact domain term.

Symptom:

- It triggers on `analyze this csv` but not on `my manager wants a chart from this data export`.

Fix:

- Add the underlying user intent and indirect wording, not just the keyword.

### Too Broad

The skill claims neighboring tasks it does not actually improve.

Symptom:

- It activates on vaguely related tasks and injects irrelevant instructions.

Fix:

- Tighten the boundary and explicitly exclude adjacent tasks if needed.

### Implementation-First

The description talks about scripts, parsers, or APIs instead of what the user is trying to do.

Fix:

- Rewrite around the user request and outcome.

## Trigger Evaluation Workflow

1. Draft 8-10 should-trigger queries.
2. Draft 8-10 should-not-trigger queries.
3. Include realistic file paths, typos, backstory, and indirect wording.
4. Run each query multiple times if the client is nondeterministic.
5. Measure trigger rate, not just one run.
6. Split train and validation queries to avoid overfitting.

## What To Put In Query Sets

Should-trigger queries should vary by:

- Formality.
- Explicitness.
- Length.
- Number of steps.
- Whether the domain keyword is mentioned directly.

Should-not-trigger queries should be near misses, not obviously irrelevant prompts.

Example near misses for a CSV-analysis skill:

- Editing formulas in an Excel workbook.
- Writing a database ETL script that happens to read CSV.
- Updating spreadsheet formatting without analysis.

## Revision Strategy

When tuning a description:

- Broaden by intent, not by keyword stuffing.
- Narrow by boundary, not by becoming vague.
- Prefer structural rewrites over endless tiny edits if the description stalls.
- Stop if validation performance stops improving; the query set may be the problem.

## Practical Standard

The description should be good enough that a reasonable agent can decide to load the skill without needing the body first.
