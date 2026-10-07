# Client Wiring Matrix

How each agent client reaches the repo's `AGENTS.md`, and what extra wiring it needs. Only wire
clients the repo shows traces of, or that the user names.

**Verification status.** Checked against provider docs on **2026-10-07**. Client surfaces move.
Before asserting a key or path to the user, re-check it if the repo's client is on a much newer
version than this table assumes.

---

## AGENTS.md support

Every client below reads `AGENTS.md`. None needs a bridge file. Do not create one: a `CLAUDE.md`
on the path makes Claude Code read it instead of `AGENTS.md`.

| Client | Root `AGENTS.md` | Nested `AGENTS.md` |
| --- | --- | --- |
| Claude Code (v2.1.277+) | Native, when no `CLAUDE.md` / `.claude/CLAUDE.md` / `CLAUDE.local.md` is on the path. | Ancestors of the working directory at start; a subdirectory's file when Claude first reads a file there (unless that folder has a `CLAUDE.md`). |
| OpenAI Codex | Native. | Only the chain from the git root down to the working directory, one file per folder, 32 KiB combined. Deeper files are not loaded. |
| GitHub Copilot CLI | Native. | Only the chain from the working directory up to the git root. Recursive discovery is an open request (github/copilot-cli#3051). |
| Copilot cloud agent and code review | Native; "the nearest `AGENTS.md` in the directory tree takes precedence". | Yes, anywhere in the repo. |
| VS Code (Local agent) | Needs `chat.useAgentsMdFile`. | Needs `chat.useNestedAgentsMdFiles` (experimental, off by default). VS Code lists the nested paths and the agent decides which to read; sources are additive, with no precedence. |
| Cursor | Native. | Applied when working on files in that folder; combined with parents, more specific wins. |
| Gemini CLI | Only with `context.fileName` set to include `AGENTS.md`. | With that setting, ancestors plus a scan of subdirectories below the working directory (respects `.gitignore` and `.geminiignore`). |
| Hermes | Native; truncated at `context_file_max_chars` (default 20,000). | Not documented. |
| Others in the ecosystem (Jules, Aider, Zed, Warp, Devin, Junie, Windsurf, …) | Listed as adopters on <https://agents.md/>. | The standard says the nearest file wins; verify per client if it matters. |

What this means for a repo with nested files:

- The root file must point to each nested file, because Codex and Copilot CLI sessions started at
  the root never load deeper files.
- Each root-to-leaf chain must stay under 32 KiB.
- Nested files add to the root and must not contradict it: VS Code applies no precedence and Claude
  Code may follow either side.

`I3` in `./remediation.md` turns these into steps.

## Per-client extra wiring

### Claude Code

1. **Skills symlink** (`C2`). Claude looks for skills under `.claude/skills`. Point it at the
   canonical root instead of copying:

   ```bash
   ln -s ../.agents/skills <repo>/.claude/skills
   ```

2. **Ignore the link**, so the symlink is a local wiring detail rather than a committed artifact:

   ```gitignore
   # <repo>/.claude/.gitignore
   # Ignore .claude/skills, it just symlinks .agents/skills
   skills
   ```

   On Windows, a directory symlink needs Administrator rights or Developer Mode; a directory
   junction is the fallback.

3. **Settings** (`.claude/settings.json`) carry permissions and deny rules, not instructions. Leave
   instruction content out of them.

### GitHub Copilot / VS Code

Copilot reads `AGENTS.md` natively, so `.github/copilot-instructions.md` should be absent. Fold
any content it has into `AGENTS.md` (`I2`).

VS Code gates the feature on settings (verified 2026-10-07):

| Setting | Effect |
| --- | --- |
| `chat.useAgentsMdFile` | Enables root `AGENTS.md`. Checked by `C3`. |
| `chat.useNestedAgentsMdFiles` | Enables nested `AGENTS.md` (experimental, off by default). Checked by `C3` when the repo has nested files. |
| `chat.useClaudeMdFile` | Enables `CLAUDE.md` detection. Irrelevant once the repo has no `CLAUDE.md`. |
| `chat.instructionsFilesLocations` | Where `.instructions.md` files are discovered. |

```jsonc
// <repo>/.vscode/settings.json
{
  "chat.useAgentsMdFile": true,
  "chat.useNestedAgentsMdFiles": true  // only when the repo has nested AGENTS.md files
}
```

Instruction precedence in Copilot is personal > repository > organization, so a personal instruction
file can override the repo's `AGENTS.md`. Worth saying out loud when a user reports the repo rules
being ignored.

### Google Gemini CLI

Gemini CLI loads `GEMINI.md` by default. Point it at `AGENTS.md` with a setting instead of a
bridge file:

```jsonc
// <repo>/.gemini/settings.json
{
  "context": { "fileName": ["AGENTS.md"] }
}
```

Prove it loaded with `/memory show`; reload with `/memory refresh`. Gemini also honours
`.aiexclude` for file exclusions; that is policy, not instructions.

### Hermes (Nous)

Nothing to wire. Hermes auto-injects `.hermes.md`, `AGENTS.md`, `CLAUDE.md`, and
`.cursorrules` when present, each truncated to `context_file_max_chars` (default 20,000). So a
repo's existing `AGENTS.md` already reaches Hermes.

Two consequences: a very long `AGENTS.md` gets silently cut, and the user-level surface is
`~/.hermes/SOUL.md`, an identity file, so durable personal voice goes there.

### OpenClaw

Workspace-centric rather than repo-centric. Its `AGENTS.md` lives in the agent workspace (default
`~/.openclaw/workspace`, set by `agents.defaults.workspace` in `~/.openclaw/openclaw.json`) and is
injected at session start, alongside `SOUL.md`, `USER.md`, `IDENTITY.md`, and an optional
`MEMORY.md`.

Relevant config keys: `agents.defaults.repoRoot` (auto-detected by walking up from the workspace when
unset), `agents.defaults.skills` and `agents.entries.*.skills` (skill allowlists — the per-agent list
**replaces** the defaults rather than merging), and `agents.defaults.skipBootstrap` to stop it
generating workspace files.

For a repo, this means: the repo's `AGENTS.md` is not automatically the one OpenClaw loads. Point
the workspace at the repo (`repoRoot`, `workspace`) or accept that OpenClaw runs off its own
workspace files. Confirm the current shape against OpenClaw's docs before wiring — this client has
been renamed before and its config has moved with it.

## A client not on this list

Do not guess a path. Guessing produces a file no agent reads, and the user finds out weeks later.

1. Look for repo-local traces first: a dotfolder, a vendor-named Markdown file, an entry in
   `.gitignore`, a mention in the README.
2. Check whether the client is in the `AGENTS.md` ecosystem (<https://agents.md/>). If it is, there
   is nothing to wire.
3. Otherwise read the client's current docs for its instruction file and, separately, its skills
   directory. They are usually different mechanisms.
4. Apply the same shape as every row above: **one body in `AGENTS.md`, a client setting rather than
   a vendor file where the client needs one, a symlink for the skills directory.**
5. Record what was verified and the date, so the next pass knows whether to re-check.
