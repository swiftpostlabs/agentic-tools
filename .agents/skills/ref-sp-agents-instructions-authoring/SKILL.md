---
name: ref-sp-agents-instructions-authoring
description: "Guidance for structuring and maintaining repository instruction files across major agent entry points such as Copilot, Gemini, and Claude. Use when: designing the repo's instruction system, choosing a source of truth, or updating AGENTS.md, GEMINI.md, and .claude/CLAUDE.md together."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-agents-mr-wolf-persona"
---

# Agents Instructions Authoring

## Purpose

Provide portable defaults for designing maintainable repository instruction systems across the major agent entry points without duplicating the same workflow, policy, and routing text in every provider file.

## When to use this skill

- Creating or refactoring repo instruction files.
- Deciding where the source of truth for instructions should live.
- Adding Gemini or Claude support to a repo that already has Copilot instructions, or the reverse.
- Reviewing whether top-level instruction files still match the codebase and the skill catalog.

## Scope Boundaries

- Use this skill for the overall instruction architecture across providers.
- Use `./references/providers/copilot-instructions.md` for what belongs specifically in `.github/copilot-instructions.md`.
- Use `./references/providers/gemini-instructions.md` for `GEMINI.md` bridge or provider-specific decisions.
- Use `./references/providers/claude-instructions.md` for `.claude/CLAUDE.md` bridge or provider-specific decisions.
- Use `./references/global-instructions.md` for user-level/global instruction files (e.g. `~/.copilot/instructions/*.instructions.md`, `~/.claude/CLAUDE.md`) rather than repo-scoped files.
- Use `./references/agents-md-standard.md` for the cross-provider root `AGENTS.md` file and how it fits the source-of-truth model.
- Use the repo's agent-persona skill (`ref-sp-agents-mr-wolf-persona` here) when the instruction system needs to preserve or refresh the repo's agent voice, interaction style, or escalation stance.
- Use the repo's skill-authoring skill (`ref-sp-agents-skills-authoring` here) for authoring skills rather than top-level instruction files.
- Use the guided instruction-maintenance skill (`tool-sp-maintain-agents-instructions` here) when the user wants a guided update workflow instead of just the reference guidance.

## Major Provider References

- GitHub Copilot: `./references/providers/copilot-instructions.md`
- Google Gemini: `./references/providers/gemini-instructions.md`
- Anthropic Claude: `./references/providers/claude-instructions.md`

## Defaults

- Choose one source-of-truth instruction file for the repo.
- Prefer a root `AGENTS.md` as the repo source of truth by default — it is read natively by many agents; see `./references/agents-md-standard.md`. Fall back to `.github/copilot-instructions.md` only when the repo is Copilot-centric or has a mature file already established there.
- Use thin provider bridge files for Gemini and Claude by default rather than duplicating the full instruction set.
- Keep always-on repo rules in the source-of-truth file and move domain-specific detail into skills.
- Inline the persona core in the source-of-truth file rather than routing to a persona skill — persona is the one category of guidance that must shape *every* turn, and a skill only loads when something triggers it. See "Persona placement" below.
- Add provider-specific exceptions only when a real platform behavior requires them.
- Keep cross-project personal defaults in user-level/global config, not duplicated into every repo; see `./references/global-instructions.md`.
- For the global/home tier, as of today no tool documents an `AGENTS.md` equivalent, so keep Copilot (`~/.copilot/instructions/*.instructions.md`) as the recommended global source of truth; see `./references/global-instructions.md`.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Choose the instruction source of truth | Decide which file owns the actual repo guidance. | Instruction systems drift quickly when several entry files all act authoritative. | When setting up or refactoring multi-provider support. | One file owns the real policy and workflow text. |
| Design the import bridge | Route other provider entry files back to the source-of-truth file with minimal local text. | Thin bridge files reduce duplication while preserving provider compatibility. | When the repo supports more than one AI entry point. | The provider files stay short and the effective guidance still matches. |
| Separate always-on rules from on-demand detail | Keep durable repo workflow and safety rules in the top-level instructions and move domain specifics into skills. | Bloated instruction files become harder to maintain and easier to contradict. | When top-level instructions start absorbing framework or language detail. | Instruction files stay durable and the skills remain discoverable. |

## Core Rules

### Source-of-truth model

- Make one file authoritative.
- Default to a root `AGENTS.md` as that authoritative file; fall back to `.github/copilot-instructions.md` only when the repo is Copilot-centric or already has a mature file established there (see `./references/agents-md-standard.md`).
- Avoid parallel hand-maintained instruction bodies across several provider files.

### Import bridge pattern

- In multi-provider repos, prefer a bridge pattern where the provider-specific entry files import or route back to the source-of-truth file.
- Keep bridge files minimal and readable.
- Use repo-root imports when the provider supports them so the bridge does not depend on folder depth.

### Persona placement

Persona is the deliberate exception to "move detail into skills". Everything else in a skill can
afford to load on demand; the agent's voice, directness, and escalation stance cannot, because they
govern how the agent behaves on the very first turn — before any skill has been triggered.

- **Inline the persona core** in the source-of-truth instruction file (`AGENTS.md` or equivalent),
  where it loads on every task. Do not replace it with a pointer to a persona skill.
- **Keep the persona skill as the canonical text** the inline copy is refreshed against. The skill
  is the source; the instruction file is the always-loaded projection of it. When they disagree, the
  skill wins and the instruction file gets updated — not the reverse.
- **Inline the core, not the whole skill.** The instruction file carries voice, directness, pushing
  back, and escalation stance. Worked examples, rationale, and adoption guidance stay in the skill.
- Accept the duplication. It is real, and it is the correct trade: a persona that loads lazily is a
  persona that does not apply when it matters most. Treat it as a deliberate sync point, reviewed
  whenever either side changes.
- This is the one place a repo should tolerate a hand-maintained copy of skill text in an
  instruction file. It is not a licence to inline anything else.

**In SwiftPost-opinionated setups**, that persona is `ref-sp-agents-mr-wolf-persona`: the repo's
`AGENTS.md` carries its Instructions section inline as the Personality block, and the skill remains
the canonical source it is refreshed against. A repo adopting this instruction architecture without
the SwiftPost persona applies the same pattern with whatever persona skill it owns.

### Provider-specific exceptions

- Add provider-specific text only when the platform has a real bootstrap requirement, limitation, or routing constraint.
- Keep the provider-specific exception narrow and then route back to the shared instructions.
- Do not duplicate the full workflow, command list, or policy text in the provider bridge file when a reference is enough.

### Maintenance

- Review top-level instructions when quick commands, workflow defaults, safety policy, the persona skill, or the skill catalog changes.
- When the persona skill changes, re-sync the inline persona block in the source-of-truth file in the same pass. This is the deliberate duplication from "Persona placement", and it only stays correct if it is refreshed deliberately.
- If the repo adds or removes important skills, update both the skill inventory and the routing hints in the source-of-truth file.
- Keep instruction files aligned with generated policy files and provider settings when the repo uses them.

## Validation

- The repo has one clear instruction source of truth.
- Bridge files stay thin unless a provider-specific exception is genuinely required.
- Top-level instructions contain durable repo workflow and routing, not duplicated domain detail.
- The persona core is inline in the source-of-truth file, not merely pointed at, and it still matches the persona skill it is projected from.
- The instruction files still match the current skills, commands, and policy model.

## References

- Read `./references/providers/copilot-instructions.md` for Copilot-specific source-of-truth guidance.
- Read `./references/providers/gemini-instructions.md` for `GEMINI.md` bridge guidance.
- Read `./references/providers/claude-instructions.md` for `.claude/CLAUDE.md` bridge guidance.
- Read `./references/global-instructions.md` for user-level/global instruction files and how the bridge pattern applies to personal defaults.
- Read `./references/agents-md-standard.md` for the root `AGENTS.md` convention, nesting/monorepo behavior, and symlink migration.
- Read `./references/checklist.md` for a quick multi-provider instruction review pass.
- Read `./references/import-bridge.md` when choosing between thin stubs, bridge files, and rare split-source patterns.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for instruction-authoring prompts.
- Review `./evals/evals.json` when validating output quality for source-of-truth and bridge recommendations.
