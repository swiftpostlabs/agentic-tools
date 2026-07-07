# Global (User-Level) Instructions

## Purpose

Repo instruction files scope guidance to one project. Most agents also read
**user-level** instruction files that apply across *every* repo you open on that
machine. Use them for durable personal defaults — communication style, safety
rules, cross-project conventions — that should not be committed into any single
repo.

## Scope model

- **Global / user-level**: personal defaults, applied across all workspaces. Not
  committed to any repo. Highest precedence in most agents (personal > repo >
  organization).
- **Repo-level**: project-specific stack, tooling, commands, and skill routing.
  Committed to the repo. Covered by the provider references in
  `./providers/`.

Keep these separated. Repo-specific rules (stack, package manager, folder
layout, quick commands) belong in the repo instruction file, not in global
config. Cross-project personality and safety rules belong in global config, not
duplicated into every repo.

## Provider locations

| Provider | User-level path | Notes |
| --- | --- | --- |
| GitHub Copilot | `~/.copilot/instructions/*.instructions.md` | Any `*.instructions.md` file in the folder is picked up; a `default.instructions.md` is a common catch-all. |
| Anthropic Claude | `~/.claude/CLAUDE.md` | The user's global memory file, loaded for every project. Copilot-style user rules may also live under `~/.claude/rules/*.instructions.md`. |
| Google Gemini | `~/.gemini/GEMINI.md` | Global tier of Gemini CLI's hierarchical context (global -> project -> component), concatenated for every prompt. Filename is configurable via the `context.fileName` setting; inspect the effective context with `/memory show` and reload with `/memory reload`. |
| Hermes Agent (Nous) | `~/.hermes/SOUL.md` | Primary agent identity, injected as slot #1 of the system prompt. Persistent memory lives under `~/.hermes/memories/` (`MEMORY.md`, `USER.md`). Hermes has no global `HERMES.md` bridge file — see the note below. |

Verify the exact path against the provider's current docs before relying on it —
these paths shift, and some are configurable (e.g. Copilot's instruction
directory, Claude's config home via `CLAUDE_CONFIG_DIR`, or Gemini's
`context.fileName`).

Hermes is a special case. Its global surface is an *identity* file (`SOUL.md`),
not a Copilot/Claude/Gemini-style instruction bridge, so treat it as the place
for durable personal voice and defaults rather than as another file to point at
a shared source. At the repo level Hermes auto-injects `.hermes.md`, `AGENTS.md`,
`CLAUDE.md`, and `.cursorrules` when present (each truncated to
`context_file_max_chars`, default 20,000), so a repo's existing `AGENTS.md`
already reaches Hermes without extra wiring — see
`./agents-md-standard.md`.

## Bridge the same way as repos

The single-source-of-truth pattern used for repo files also works for global
config. Keep the real personal guidance in one file and route the others to it,
instead of hand-maintaining several parallel global bodies.

There is no `AGENTS.md` equivalent for the global/home tier, so — unlike the
repo tier, where a root `AGENTS.md` is the default source of truth (see
`./agents-md-standard.md`) — keep **Copilot**
(`~/.copilot/instructions/*.instructions.md`) as the recommended global source
of truth and bridge the other providers back to it.

A common working setup:

- Put the actual personal defaults in one file, e.g.
  `~/.copilot/instructions/default.instructions.md`.
- Make `~/.claude/CLAUDE.md` a thin bridge that imports it (`@`-import or a
  relative path the provider supports).
- Add a matching thin bridge for `~/.gemini/GEMINI.md` if Gemini is used. Gemini
  reads it as the global tier and concatenates it, so a short import line plus a
  pointer to the shared file is enough.
- For Hermes, put the durable personal defaults in `~/.hermes/SOUL.md` directly.
  It is an identity file that cannot be as cleanly reduced to a one-line bridge,
  so accept some duplication there or keep `SOUL.md` focused on voice and let
  the repo-level files carry the rest.

This keeps one authoritative personal-defaults file while every agent still
loads it. See `./import-bridge.md` for the bridge vs. stub vs. split-source
tradeoffs — they apply identically to the providers that support imports.

## What belongs in global vs. repo

- Global: interaction style, escalation stance, absolute safety rules (e.g.
  never printing secrets), and conventions you want on by default everywhere.
- Repo: the stack, the commands, the folder structure, the skill catalog, and
  any rule that only makes sense inside that project.

When a global rule and a repo rule conflict, expect the repo rule to lose in
most agents (personal instructions rank highest). If a repo genuinely needs to
override a personal default, state that override explicitly in the repo file.
