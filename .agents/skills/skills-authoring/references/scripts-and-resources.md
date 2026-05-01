# Scripts And Resources Guide

Use this file when deciding whether a skill needs `scripts/`, `references/`, or `assets/`.

## Progressive Disclosure Principle

Supporting files exist so the entry `SKILL.md` can stay lean.

Use:

- `references/` for documentation the agent reads on demand.
- `scripts/` for executable logic.
- `assets/` for templates, schemas, examples, or static resources.

Do not move important behavioral guidance into support files if the agent needs that guidance immediately upon activation.

## When To Use `references/`

Put content in `references/` when it is:

- detailed,
- situational,
- too long for the entry skill,
- or only needed for specific branches.

Good examples:

- API error guides.
- Detailed schemas.
- Long examples.
- Domain-specific lookup notes.

Bad examples:

- The one gotcha the agent must know before it starts.

## When To Use `scripts/`

Bundle a script when the same logic keeps being reinvented or when reliability matters more than natural-language flexibility.

Good candidates:

- validators,
- parsers,
- file transformers,
- report builders,
- deterministic analyzers.

Signs a script should exist:

- traces show the agent repeatedly reconstructing similar code,
- the task has mechanical checks that are easy to automate,
- the natural-language instructions are becoming fragile or verbose.

## Script Design Rules

- Non-interactive only.
- Clear CLI shape.
- Helpful `--help` output.
- Structured stdout when possible.
- Diagnostics on stderr.
- Predictable exit codes.
- Safe defaults.
- Dry-run support for destructive work.
- Clear prereqs.

For Python scripts intended to be portable, prefer explicit `uv run`-friendly patterns or inline metadata over hidden local-environment assumptions.

## When To Use `assets/`

Use `assets/` for static materials that are loaded or copied rather than executed.

Good examples:

- output templates,
- starter config files,
- schemas,
- example JSON payloads,
- sample prompt sets.

## Reference Style

Point to support files with explicit conditions.

Path rule:

- Use relative paths like `./references/...`, `./assets/...`, and `./scripts/...` only for files inside the current skill.
- If you refer to a different skill, use an absolute filesystem path to that other skill's file.

Good:

- `Read ./references/release-checks.md before preparing a release PR.`
- `Use ./assets/report-template.md when the user requests the standard report format.`
- `Run ./scripts/validate.py after generating the mapping file.`
- `Read C:/Users/fcole/Projects/swiftpost-shareable-skills/.agents/skills/code-conventions/SKILL.md if the task shifts from skill design to repo Python coding standards.`

Bad:

- `See references/ for details.`
- `There are some helpful scripts in scripts/`.
- `Read ../code-conventions/SKILL.md if you need coding guidance.`

## Resource Layout Heuristic

If the entry `SKILL.md` is growing because it contains:

- long prose,
- large code blocks,
- or giant appendices,

split it. If the skill is growing because the workflow itself is genuinely complex, keep the entry focused and push detail to support files with clear load conditions.
