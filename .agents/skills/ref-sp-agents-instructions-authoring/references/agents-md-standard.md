# The AGENTS.md Standard

## What it is

`AGENTS.md` (<https://agents.md/>) is a plain-Markdown instruction file for coding agents at the
repository root: the build and test commands, conventions, and safety notes an agent needs, kept
apart from the human-facing `README.md`. No schema; any headings work. It is stewarded by the
Agentic AI Foundation under the Linux Foundation and read by most coding agents.

## Client support

Verified against provider docs on **2026-10-07**. Re-check before asserting a version or key.

| Client | Root `AGENTS.md` | Nested `AGENTS.md` | Limits and caveats |
| --- | --- | --- | --- |
| Claude Code | Native since v2.1.277 (all session types since v2.1.281). `@path` imports work. | Every `AGENTS.md` and `.claude/AGENTS.md` from the working directory up at start; a subdirectory's file when Claude first reads a file there. | Only when **no** `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` is in that directory or above (`~/.claude/CLAUDE.md` and `.claude/rules/` do not count). The user setting **Project instructions** (`/config`) can force both or `CLAUDE.md` only. `InstructionsLoaded` hooks do not fire for it. Nothing under `.agents/` is read, so skills still need `.claude/skills`. Under 200 lines per file recommended. |
| OpenAI Codex | Native; `~/.codex/AGENTS.override.md` or `~/.codex/AGENTS.md` first. | Only the chain from the git root down to the working directory, one file per folder (`AGENTS.override.md` before `AGENTS.md`). Deeper files are not loaded. | Stops at `project_doc_max_bytes`, 32 KiB combined by default. Extra names via `project_doc_fallback_filenames`. Check with `codex --ask-for-approval never "Summarize the current instructions."` |
| GitHub Copilot CLI | Native. | Only the chain from the working directory up to the git root (recursive discovery requested in github/copilot-cli#3051). | Personal instructions outrank repository ones. |
| Copilot cloud agent, code review | Native. | Anywhere in the repo; "the nearest `AGENTS.md` in the directory tree will take precedence". | Also accepts a root `CLAUDE.md` or `GEMINI.md`, which a repo should not keep. |
| VS Code (Local agent) | Needs `chat.useAgentsMdFile`. | Needs `chat.useNestedAgentsMdFiles` (experimental, off by default); VS Code lists nested paths and the agent picks which to read. | Instruction sources are additive; VS Code warns against relying on precedence. |
| Cursor | Native. | Applied when working on files in that folder, combined with parents; more specific wins. | |
| Gemini CLI | Only when configured: set `context.fileName` (for example `["AGENTS.md"]`) in `.gemini/settings.json`. | With that setting, ancestors to the project root plus a scan of subdirectories below the working directory (respects `.gitignore`, `.geminiignore`). | Inspect with `/memory show`, rescan with `/memory refresh`. |
| Jules, Aider, Zed, Warp, Devin, Junie, Windsurf, Hermes, others | Listed as adopters on <https://agents.md/>. | Not uniformly documented. | Hermes truncates each context file at `context_file_max_chars` (default 20,000). |

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

The standard (<https://agents.md/>): place an `AGENTS.md` in each package; "the closest
`AGENTS.md` to the edited file wins; explicit user chat prompts override everything."

Because clients implement nesting differently (table above), a repo with nested files must:

1. **Point to each nested file from the root `AGENTS.md`**, for example a row in the area index:
   "`packages/api/`: read `packages/api/AGENTS.md` before editing". Codex and Copilot CLI sessions
   started at the root load nothing deeper.
2. **Keep each root-to-leaf chain under 32 KiB**, Codex's combined cap.
3. **Write nested files as additions to the root, never contradictions.** Codex applies later
   files over earlier ones, VS Code applies no precedence, and Claude Code may follow either side.
4. **Use only `AGENTS.md`**: no `AGENTS.override.md` (Codex-only) and no `CLAUDE.md` in the same
   folder (Claude Code reads that instead).
5. **Turn on `chat.useNestedAgentsMdFiles`** in `.vscode/settings.json` when the team uses VS Code.

`tool-sp-setup-agent-repo`'s audit checks points 1, 2, and 4 (`I3`, `I2`) and point 5 (`C3`).

## When not to use it

- `AGENTS.md` is repo-scoped. User-level defaults live elsewhere; see `./global-instructions.md`.
- A repo used by exactly one client with a richer native mechanism (for example Claude Code with
  path-scoped `.claude/rules/`) may use that mechanism for scoped rules, while keeping `AGENTS.md`
  as the always-on body.
