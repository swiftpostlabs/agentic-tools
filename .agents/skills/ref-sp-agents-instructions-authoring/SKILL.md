---
name: ref-sp-agents-instructions-authoring
description: "Structure and maintain a repo's agent instruction file: a root AGENTS.md as the one source of truth read natively by Claude Code, Codex, Copilot, and others, what belongs in it versus in skills, size budgets, persona placement, and the narrow cases that still need a CLAUDE.md, GEMINI.md, or Copilot fallback. Use when: designing or trimming AGENTS.md, deciding whether a client needs a bridge file, removing an old bridge, or reviewing whether instruction files still match the repo."
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

Keep one agent instruction file per repo, a root `AGENTS.md`, small enough that every client loads
all of it, with domain detail pushed into skills that load on demand.

## When to use this skill

- Creating, trimming, or reviewing a repo's `AGENTS.md`.
- Deciding whether a client still needs its own file (`CLAUDE.md`, `GEMINI.md`,
  `.github/copilot-instructions.md`), or removing one that is no longer needed.
- Reviewing whether top-level instructions still match the codebase.

## Scope Boundaries

- Use `./references/agents-md-standard.md` for which clients read `AGENTS.md`, their size limits,
  nesting, and the fallback bridge when a client cannot read it.
- Use `./references/global-instructions.md` for user-level files (`~/.claude/CLAUDE.md`,
  `~/.copilot/instructions/`, `~/.codex/AGENTS.md`), not repo files.
- Use `./references/providers/copilot-instructions.md` only for a repo that keeps
  `.github/copilot-instructions.md` as its source of truth.
- Use the repo's persona skill (`ref-sp-agents-mr-wolf-persona` here) for the persona text itself.
- Use `tool-sp-setup-agent-repo` to wire clients and skill directories, and
  `tool-sp-maintain-agents-instructions` for a guided refresh.

## Defaults

- **One file, no bridges.** A root `AGENTS.md` is read natively by Claude Code (v2.1.277+), Codex,
  Copilot, Cursor, and most of the ecosystem. Do not add `CLAUDE.md` or `GEMINI.md` stubs by
  default. For Claude Code a stub is worse than useless: any `CLAUDE.md`, `.claude/CLAUDE.md`, or
  `CLAUDE.local.md` on the path makes it read that file *instead of* `AGENTS.md`.
- **Configure, don't bridge,** where a client has a setting for it (Gemini CLI's
  `context.fileName`, VS Code's `chat.useAgentsMdFile`).
- **Bridge only as a fallback,** for a client or version that cannot read `AGENTS.md`. Then use an
  `@AGENTS.md` import or a symlink, never a second body.
- **A compact skill index, not a catalog.** Clients already list every skill's description, so
  copying descriptions into `AGENTS.md` only doubles the cost. But agents often fail to load a
  matching skill on their own: in Vercel's 2026 evals the skill went unused in 56% of cases, and an
  explicit instruction to use it raised the pass rate from 53% to 79%. So keep a short
  area-to-skill table for the repo's main areas plus one instruction to check it after exploring
  and before editing. Vercel found "explore first, then invoke" beat "you MUST invoke".
- **Stay inside the smallest budget.** Claude Code recommends under 200 lines per file; Codex stops
  reading at `project_doc_max_bytes` (32 KiB default); Hermes truncates at 20,000 characters. Aim
  for roughly 150 lines and 15 KB.
- **Inline the persona core** (see below). It is the one sanctioned copy of skill text.

## Core Rules

### What belongs in AGENTS.md

Only what must shape every turn and cannot be derived from the code:

- persona core and always-on safety rules,
- workflow steps and validation expectations,
- the commands an agent would otherwise guess wrong,
- conventions that differ from tool defaults.

Everything else goes to a skill: multi-step procedures, framework or language detail, anything that
matters for one area of the codebase. Directory layouts, dependency lists, and architecture tours
the agent can read from the repo are noise; cut them. Evidence backs this: Gloaguen et al. (ETH
Zurich, 2026) found context files raised inference cost by over 20% with little or no gain in task
success, and recommend describing only minimal requirements. Knowledge the agent must apply that is
absent from its training data (a new framework API) is the exception, where always-loaded context
beat on-demand skills in Vercel's evals.

Write instructions concretely enough to verify ("run `uv run poe test` before committing", not
"test your changes"). Contradictions between files are resolved arbitrarily by the model, so remove
one side rather than adding a tiebreaker.

### Persona placement

Persona is the deliberate exception to "move detail into skills". A skill loads on demand; the
agent's voice and escalation stance must apply from the first turn.

- Inline the persona core in `AGENTS.md`. Do not replace it with a pointer to the persona skill.
- The persona skill is the canonical text; `AGENTS.md` is its always-loaded projection. When they
  disagree, update `AGENTS.md`.
- Inline the core only. Examples, rationale, and adoption guidance stay in the skill.
- Re-sync the block whenever either side changes. It is not a licence to inline anything else.

In SwiftPost-opinionated setups the persona is `ref-sp-agents-mr-wolf-persona`, carried as the
Personality block. Another repo applies the same pattern with its own persona skill.

### Monorepos

Put shared rules in the root `AGENTS.md` and only the differences in nested `AGENTS.md` files.
Nested files add to the root rather than replacing it, but clients load them differently: Codex
reads every `AGENTS.md` from the git root down to the launch directory at startup, while Claude Code
also picks up a subdirectory's file when it first reads a file there.

## Validation

- The repo has one instruction body, in `AGENTS.md`, and no `CLAUDE.md`, `.claude/CLAUDE.md`, or
  `GEMINI.md` unless a documented fallback needs it.
- `AGENTS.md` is under the budgets above and carries a compact skill index, not copied descriptions.
- The persona core is inline and matches the persona skill.
- Commands, workflow, and safety rules still match the repo.

## References

- Vercel, "AGENTS.md outperforms skills in our agent evals" (2026-01-27):
  <https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals>
- Gloaguen et al., "Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding
  Agents?" (2026): <https://www.sri.inf.ethz.ch/publications/gloaguen2026agentsmd>

- `./references/agents-md-standard.md`: client support, size limits, nesting, fallback bridges,
  and removing old bridges.
- `./references/global-instructions.md`: user-level instruction files per client.
- `./references/providers/copilot-instructions.md`: repos that keep `.github/copilot-instructions.md`.
- `./references/checklist.md`: quick review pass.
- `./assets/trigger-eval-queries.example.json` and `./evals/evals.json`: trigger and output evals.
