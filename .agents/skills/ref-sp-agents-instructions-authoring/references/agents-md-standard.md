# The AGENTS.md Standard

## What it is

`AGENTS.md` (<https://agents.md/>) is a plain-Markdown instruction file for coding agents at the
repository root: the build and test commands, conventions, and safety notes an agent needs, kept
apart from the human-facing `README.md`. No schema; any headings work. It is stewarded by the
Agentic AI Foundation under the Linux Foundation and read by most coding agents.

## Client support

Verified against provider docs on **2026-09-29**. Re-check before asserting a version or key.

| Client | Reads `AGENTS.md` | Limits and caveats |
| --- | --- | --- |
| Claude Code | Natively since v2.1.277 (all session types since v2.1.281). Loads every `AGENTS.md` and `.claude/AGENTS.md` from the working directory up, plus a subdirectory's file when Claude reads a file there. `@path` imports work. | Only when **no** `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` sits in the working directory or above (`~/.claude/CLAUDE.md` and `.claude/rules/` do not count). The user setting **Project instructions** (`/config`) can force both or `CLAUDE.md` only. `InstructionsLoaded` hooks do not fire for it. Nothing under `.agents/` is read, so skills still need `.claude/skills`. Recommended size: under 200 lines per file. |
| OpenAI Codex | Natively. `~/.codex/AGENTS.override.md` or `~/.codex/AGENTS.md`, then each directory from the git root down to the working directory, `AGENTS.override.md` before `AGENTS.md`. | Stops adding files at `project_doc_max_bytes`, default 32 KiB across the combined files. Extra names via `project_doc_fallback_filenames`. |
| GitHub Copilot (CLI, coding agent, VS Code) | Natively. VS Code gates it on `chat.useAgentsMdFile`. | Personal instructions outrank repository ones. |
| Gemini CLI | Only when configured. Default context file is `GEMINI.md`; set `context.fileName` (for example `["AGENTS.md", "GEMINI.md"]`) in `.gemini/settings.json`. | Inspect with `/memory show`. |
| Cursor, Jules, Aider, Zed, Warp, Devin, Hermes, others | Natively, per the standard's adopter list. | Hermes truncates each context file at `context_file_max_chars` (default 20,000). |

The binding constraints on size are Codex's 32 KiB cap and Claude Code's 200-line recommendation.
Past either, content is cut or adherence drops.

## Fallback bridges

Use a bridge only when a client or version in real use cannot read `AGENTS.md` and has no setting
for it (for example Claude Code before v2.1.277, or a user who set Project instructions to
`claude-md`).

- **Import:** a `CLAUDE.md` whose first line is `@AGENTS.md`, optionally followed by a short
  client-specific note. Claude Code never loads `AGENTS.md` twice through an import. Prefer this on
  Windows.
- **Symlink:** `ln -s AGENTS.md CLAUDE.md`. Identical content, but Claude's Edit tool refuses to
  write through the link, and Git on Windows checks symlinks out as plain text unless
  `core.symlinks` is enabled.
- Never keep a second hand-maintained body. Past about 25 lines a bridge is a second source of
  truth.

## Removing an old bridge

| Existing setup | Action |
| --- | --- |
| `CLAUDE.md` or `.claude/CLAUDE.md` containing only `@AGENTS.md` | Delete it; Claude Code then reads `AGENTS.md` directly. Keep it only for clients stuck on old versions. |
| `CLAUDE.md` telling Claude in prose to read `AGENTS.md` | Delete it. Prose only works if the model decides to open the file. |
| `CLAUDE.md -> AGENTS.md` symlink | Harmless; delete to simplify. |
| `CLAUDE.md` with its own body | Merge the body into `AGENTS.md`, then delete. |
| `GEMINI.md` importing `AGENTS.md` | Replace with `context.fileName` in `.gemini/settings.json`, or delete if Gemini is not used. |
| `SessionStart` hook that prints `AGENTS.md` | Remove; it now adds a second copy. |

## Nesting and monorepos

Root `AGENTS.md` for shared rules, nested `AGENTS.md` for what differs in a package. Nested files
are appended after the root, so closer files read last. Codex treats that as override order; Claude
Code may follow either side of a conflict. Keep nested files to the differences and avoid conflicts.

## When not to use it

- `AGENTS.md` is repo-scoped. User-level defaults live elsewhere; see `./global-instructions.md`.
- A repo used by exactly one client with a richer native mechanism (for example Claude Code with
  path-scoped `.claude/rules/`) may use that mechanism for scoped rules, while keeping `AGENTS.md`
  as the always-on body.
