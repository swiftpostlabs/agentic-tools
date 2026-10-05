---
name: ref-sp-agents-skills-authoring
description: "How to write and review agent skills that load when needed and stay short and readable: descriptions, body shape, progressive disclosure, scripts, and evals. Use when creating, rewriting, reviewing, or trimming a skill."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
---

# Skills Authoring

How to write a skill that an agent loads at the right moment and a person can read in a minute or
two. Naming grammar, domains, visibility, and dependencies are the sharing spec's job
(`ref-sp-agents-shareable-skills`); this skill is about quality. To run a guided creation, use
`tool-sp-create-skill`; for a catalog-wide pass, `tool-sp-maintain-skills`.

Sources: the [Agent Skills spec](https://agentskills.io/specification),
[agentskills.io best practices](https://agentskills.io/skill-creation/best-practices), and
[Anthropic's authoring guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## How skills load

1. **Listing:** at session start the agent sees only `name` and `description`, in a shared budget
   (Codex: 2% of context or 8,000 characters; Claude Code: 1% of context, 1,536 characters per
   entry).
2. **Activation:** it reads the whole `SKILL.md` when the description matches the task.
3. **On demand:** it reads `references/`, runs `scripts/`, or uses `assets/` only when `SKILL.md`
   says to.

So the description decides whether the skill is used at all, every line of `SKILL.md` costs
context on every use, and reference files are free until opened. Agents also skip skills for tasks
they think are simple, so a repo's `AGENTS.md` should point to the skills that matter most (see
`ref-sp-agents-instructions-authoring`).

## Description

- Say what the skill covers, then one short "Use when …" clause. Main use case first.
- Aim for 150–300 characters. The validator warns above 400; the spec's hard limit is 1024.
- Name the user's intent and the words they would use, not the skill's internals.
- Do not repeat the first sentence as a list of triggers.
- No angle brackets.

```yaml
# Weak
description: Helps with commits.
# Good
description: "Rules for grouping a diff into focused commits and writing type(scope) commit messages, including when a body is needed. Use when committing, splitting a diff, or writing a commit message."
```

When triggering is unreliable, test it rather than adding keywords: `./references/description-guide.md`.

## Body shape

Write for an agent that is already smart, in plain prose a person can follow.

```markdown
# Title

One to three sentences: what this is for, and which neighbouring skill to use instead for
related work.

## <Task-named section>        e.g. "Title", "Body", "Migrations"
Rules as short bullets or steps, each with its reason when the reason is not obvious.

## Examples                    real input/output, a command, a snippet

## Gotchas                     facts that defy reasonable assumptions

## Before finishing            only checks that are easy to miss
```

- Name sections after the task they serve, not abstract categories. Add only the sections the
  content needs.
- Do not add "Purpose", "When to use", "Values", or what/why/when/outcome tables. After activation
  they repeat the description, and the tables restate the rules.
- One copy of each rule. A "Before finishing" list adds checks; it does not repeat the rules.
- Use tables for genuine lookups (versions, flags, options to compare), not for prose.
- Keep `SKILL.md` under about 200 lines; the spec's ceiling is 500 lines or 5,000 tokens. Move
  detail to `references/` with a load condition ("read the API errors reference when a call
  returns non-200").
- For a reference over 100 lines, start it with a short contents list.

## What to write

- **Add what the agent lacks.** Repo facts, non-obvious procedures, exact commands and paths.
  Cut textbook explanations. Ask of each line: would the agent get this wrong without it?
- **Defaults, not menus.** "Use X. For Y, use Z instead."
- **Procedures over answers.** Teach the method that generalises, not one instance.
- **Match control to fragility.** Fragile or destructive steps get exact commands and a
  validate-then-act loop; flexible work gets direction and reasons.
- **Gotchas in `SKILL.md`,** where the agent sees them before it hits the problem. When an agent
  makes a mistake you have to correct, add it here.
- **Present tense.** No plans ("later"), status ("not yet"), or history ("was renamed"); they go
  stale and read as current. Dated provenance of a source ("verified 2026-08-01") is evidence and
  stays.
- **Synthetic example names** (`my-feature`, `example.py`) unless the skill documents a real
  surface. When adapting a skill from another repo, replace its commands, paths, and stack.
- **Portable.** No client-only features unless the skill is about that client.

## Files and paths

```text
<skills-root>/<skill-name>/
├── SKILL.md
├── references/   read on demand
├── scripts/      run, not read
├── assets/       templates and data
└── evals/        evals.json for important skills
```

- `name` matches the folder: lowercase letters, digits, single hyphens, at most 64 characters.
- Prefix `ref-` for guidance and `tool-` for a workflow the user invokes; tool names read as
  actions (`tool-sp-create-skill`), ref names as subjects.
- `metadata` is a flat string-to-string map: no lists or nested objects.
- Link this skill's files as `./references/...` and another skill in the repo by its repo-root
  path (`.agents/skills/<name>/SKILL.md`), never by parent-directory hops or absolute paths. Keep
  references one level deep from `SKILL.md`.
- Scripts are non-interactive, have `--help`, print data to stdout and diagnostics to stderr, and
  offer `--dry-run` when destructive. Details: `./references/scripts-and-resources.md`.

## Evaluating

Test the two things that can fail: does the description trigger on realistic prompts, and does the
skill make the output better than no skill or the previous version? Read
`./references/evaluation-guide.md` before building evals; starter files are in `./assets/`.

## Before finishing

- `node ./scripts/validate-skill.mts <skill-dir>` passes (in this repo, `yarn validate`, which also
  runs the sharing-spec check).
- Every reference file has a load condition, and every referenced file exists.
- Run `./references/checklist.md` for a review or consolidation pass.

## References

- `./references/template.md`: starting point for a new skill.
- `./references/checklist.md`: review, refactor, and consolidation checklist.
- `./references/description-guide.md`: writing and trigger-testing descriptions.
- `./references/evaluation-guide.md`: trigger and output evals, baselines, grading.
- `./references/scripts-and-resources.md`: what goes in `references/`, `scripts/`, `assets/`, `evals/`.
- `./scripts/aggregate_eval_results.py`: summarise `grading.json` files from eval runs.
