# Skills Authoring Playbook

Use this file when you are creating a new skill or substantially restructuring an existing one.

## Goal

Create a skill that improves agent behavior on a real class of tasks, not a skill-shaped document that restates generic advice.

## Authoring Sequence

1. Identify the real task the skill should improve.
2. Collect source material from successful work in this repo or domain.
3. Define the skill boundary.
4. Draft the trigger description.
5. Write the core workflow in `SKILL.md`.
6. Move bulky detail into `references/`, `scripts/`, or `assets/`.
7. Test triggering and execution quality.
8. Tighten the skill from real traces and failures.

## Start From Real Expertise

Good source material:

- Runbooks, checklists, and internal docs.
- Successful fixes and commits.
- Issue threads and review comments.
- Existing scripts and validated commands.
- Examples of recurring agent mistakes and the corrections that fixed them.

Weak source material:

- Generic blog-post summaries.
- Broad best-practice lists with no repo context.
- Advice that does not change what the agent would actually do.

If you cannot point to a real failure mode, real procedure, or real decision rule that the skill adds, the skill probably is not ready.

## Define The Skill Boundary

Aim for one coherent unit of work.

Good boundaries:

- `code-review` for security and correctness review patterns.
- `pdf-processing` for extracting text, filling forms, and validating output.
- `ref-sp-dev-repo-conventions` for repo layout and tool wiring.

Bad boundaries:

- A skill that covers code review, testing, deployment, and release notes.
- A skill that is so narrow that several skills must activate for a routine task.

Use this test: if the agent activates the skill, should most of the loaded instructions apply to the current task? If not, the skill is scoped too broadly.

## Choose The Skill Role And Name

Pick the skill name only after you know whether the skill is primarily reference material or primarily an action workflow.

- Use `ref-...` when the skill mainly explains a domain, repo convention, workflow model, or decision surface.
- Use `tool-...` when the skill mainly tells the agent how to perform an action-oriented workflow that the user may invoke directly.
- Make `tool-...` names sound like actions, such as `tool-sp-create-skill` or `tool-sp-maintain-skills`, not passive topic labels. Avoid deictic words like "these" or "this" in a name — they do not resolve outside the repo the skill came from.
- Do not use `tool-...` just because the skill mentions commands. If the skill mainly informs the agent when interpreting or reviewing something, it still belongs under `ref-...`.

## What Belongs In `SKILL.md`

Keep only the instructions the agent should see every time the skill activates:

- Purpose and activation conditions.
- Default workflow.
- Critical gotchas.
- Required validation loop.
- Output expectations.
- References to supporting files with explicit load conditions.

Move these out of `SKILL.md` when they get long:

- Full schemas.
- Large templates.
- Extensive examples.
- Long API references.
- Reusable scripts.

## Default Structure

Use this structure unless the task has a better shape:

1. Purpose.
2. When to use this skill.
3. Core workflow.
4. Defaults.
5. Gotchas.
6. Validation.
7. References.
8. Scripts.
9. Examples.

## Content Heuristics

- Add what the agent is likely to get wrong without help.
- Prefer procedures over slogans.
- Prefer defaults over option menus.
- Prefer explicitly framed tasks over bare command lists.
- Explain why when the rule is context-sensitive.
- Keep non-obvious constraints close to the top.
- Avoid describing what the agent already knows by default.
- Keep generic examples synthetic. If you copy examples from another repo, replace real folder and script names unless the skill is intentionally documenting that exact repo surface.

## Task Framing Rule

When a skill contains commands, scripts, or repeated operational actions, do not leave them as unexplained steps.

For each important action, make these points clear:

- **What:** what the step does.
- **Why:** why the step matters.
- **When:** when to use it.
- **Expected outcome:** what result should confirm success.

If there are multiple commands or a branching workflow, use the table format from `./task-framing.md`.

## Patterns That Usually Help

### Gotchas

Use a gotchas section for facts that defy reasonable assumptions.

Examples:

- A health endpoint is shallow and cannot be trusted for readiness.
- The same concept uses different field names across systems.
- A local command requires a wrapper task instead of direct invocation.

### Checklists

Use explicit checklists when order matters or when skipped steps are expensive.

### Validation Loops

Use `do -> validate -> fix -> revalidate` when the task has a reliable checker.

### Plan-Validate-Execute

Use this for destructive or fragile workflows where an intermediate artifact can be checked before action.

### Templates

Use output templates when format compliance matters. Inline small templates; store long ones in `assets/`.

## Refactoring Existing Skills

When updating a copied or stale skill:

1. Remove inherited stack details that do not match this repo.
2. Rewrite the description before tuning anything else.
3. Replace copied example paths, feature names, and script names with synthetic placeholders unless they are intentionally documenting a real repo surface.
4. Delete filler sections that do not influence behavior.
5. Promote recurring corrections into defaults, gotchas, or validation rules.
6. Split the skill if it covers multiple unrelated workflows.

## Done Criteria

A skill is in good shape when:

- The description triggers reliably on relevant prompts.
- The entry skill is concise enough to load comfortably.
- Support files are referenced with clear conditions.
- The workflow is concrete enough that the agent can execute it.
- The skill improves behavior on real prompts or evals.
