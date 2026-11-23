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

None of Copilot, Claude, or Gemini document a user-level `AGENTS.md` today. A few tools outside
our provider set document their own (e.g. OpenAI Codex reads `~/.codex/AGENTS.md`), and the
standard's repo has an open proposal for a shared `~/.config/agents/AGENTS.md`. Keep the source
of truth there: it is vendor-neutral, and it is the location most likely to be read natively if a
global tier is standardised. Until a client reads it, bridge every provider to it. Global skills
stay in `~/.agents/skills/`, because clients read that folder directly; only the instructions
move.

The setup:

- Put the personal defaults in `~/.config/agents/AGENTS.md`. Keep a `description` front matter
  block at the top: Copilot uses it, and the other clients read it as plain text.
- **Copilot** reads only its own folder and has no import: make
  `~/.copilot/instructions/default.instructions.md` a symlink to `~/.config/agents/AGENTS.md` (on Windows, a
  symlink needs Developer Mode or an elevated shell; a hard link also works but breaks when an
  editor replaces the file instead of writing in place, so check it after editing).
- **Claude Code**: `~/.claude/CLAUDE.md` holds only `@../.config/agents/AGENTS.md`.
  Claude reads it from its config home, so with `CLAUDE_CONFIG_DIR` set, check that the session
  actually loads it (it is listed at session start) and add the same bridge in that folder if not.
- **Gemini**, if used: a thin `~/.gemini/GEMINI.md` with an import line pointing to the source.
- **Hermes**: put the durable personal defaults in `~/.hermes/SOUL.md` directly. It is an
  identity file that cannot be as cleanly reduced to a one-line bridge, so accept some
  duplication there or keep `SOUL.md` focused on voice and let the repo-level files carry the
  rest.
- **Moving an older setup** whose source is `~/.copilot/instructions/default.instructions.md`:
  move the file to `~/.config/agents/AGENTS.md`, put the Copilot symlink at the old Copilot path, and change the
  `CLAUDE.md` import. Reword anything in the file that calls it Copilot-only or points repo rules
  anywhere but `AGENTS.md`.

This keeps one authoritative personal-defaults file while every agent still
loads it. Unlike the repo tier, the global tier still needs bridges, because
Claude Code reads `AGENTS.md` only from the project path, not from `~/.claude/`.

## What belongs in global vs. repo

- Global: interaction style, escalation stance, absolute safety rules (e.g.
  never printing secrets), and conventions you want on by default everywhere.
- Repo: the stack, the commands, the folder structure, the skill catalog, and
  any rule that only makes sense inside that project.

When a global rule and a repo rule conflict, expect the repo rule to lose in
most agents (personal instructions rank highest). If a repo genuinely needs to
override a personal default, state that override explicitly in the repo file.
