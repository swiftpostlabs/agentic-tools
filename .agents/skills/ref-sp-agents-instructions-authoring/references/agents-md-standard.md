# The AGENTS.md Standard

## What it is

`AGENTS.md` (see <https://agents.md/>) is a cross-provider convention for a
single, agent-facing instruction file at the repository root. Think of it as a
"README for agents": the technical context an AI coding agent needs — build and
test commands, code style, testing instructions, security notes, PR and commit
conventions — kept separate from the human-facing `README.md`.

It is plain Markdown with no required schema. Any headings work; the agent just
parses the text. That makes it a natural fit for the source-of-truth role.

## Why it matters for this skill

The provider references in `./providers/` each target one vendor's entry file
(`.github/copilot-instructions.md`, `GEMINI.md`, `.claude/CLAUDE.md`).
`AGENTS.md` is the emerging *shared* entry file that many of those same tools now
read directly — GitHub Copilot, VS Code, Cursor, OpenAI Codex, Google Jules,
Aider, Zed, Warp, Devin, and others. That changes the source-of-truth calculus.

## Choosing AGENTS.md as the source of truth

- **At the repo level, prefer a root `AGENTS.md` as the default source of
  truth** over any single vendor file. It is read natively by many agents, so it
  removes a layer of bridging.
- Fall back to `.github/copilot-instructions.md` as the source of truth only when
  the repo is Copilot-centric or already has a mature file established there. In
  that case, consider still adding a root `AGENTS.md` (or symlinking it) so newer
  AGENTS.md-aware tools also find the guidance.
- Either way, keep exactly one authoritative body of guidance and route the rest
  to it, per `./import-bridge.md`.
- This repo-level default does **not** extend to the global/home tier: as of
  today we could not find tool documentation (Copilot, Gemini, and others) for a
  user-level `AGENTS.md`, so global config keeps using Copilot as its source of
  truth. See `./global-instructions.md`.

## Bridging to vendor files

Some agents still read only their own file. Bridge them to `AGENTS.md` the same
way you would bridge to any source of truth:

- **Symlink** the vendor file to `AGENTS.md` when the provider follows symlinks
  and you want byte-identical content (e.g. `CLAUDE.md -> AGENTS.md`). This is
  the migration path the standard itself recommends.
- **Import/route** from the vendor file when it supports imports and you want a
  small provider-specific note plus a pointer back to `AGENTS.md`.

Avoid maintaining two full instruction bodies — a symlink or a thin bridge keeps
them from drifting.

## Nesting and monorepos

`AGENTS.md` supports nested files: agents read the **nearest** file up the
directory tree, so the closest one wins. In a monorepo, place a root
`AGENTS.md` for shared guidance and per-package `AGENTS.md` files for
package-specific rules. Keep the nested files focused on what actually differs at
that level rather than restating the root.

## When not to reach for it

- If only one agent is in play and it has a first-class native file, a single
  vendor file may be simpler than adding `AGENTS.md` plus bridges.
- `AGENTS.md` is repo-scoped. It does not replace user-level/global config — see
  `./global-instructions.md` for that layer.
