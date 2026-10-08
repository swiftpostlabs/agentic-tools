---
name: ref-sp-agents-hooks
description: "Write agent lifecycle hooks (shell commands at session, prompt, tool, and stop events) for Claude Code, Codex, Copilot CLI, VS Code, and Gemini CLI. Use when creating a hook, making one portable, bundling one in a plugin, or debugging why a hook doesn't fire or block."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "hooks"
---

# Agent Hooks

A hook is **(event, matcher, command)**: at a lifecycle event the agent runs your command, passes a
JSON payload on stdin, and reads the exit code and stdout as a decision. Unlike asking the model to
remember something, a hook always fires. This skill covers `command` hooks, the type every platform
supports; other types are noted in the platform references. Hooks configured at repo or user scope
and hooks bundled in a plugin share the same contract; only the config location differs (plugin
packaging: `ref-sp-agents-plugin-marketplaces`). Hooks that guard secrets: `ref-sp-agents-security`.

## The contract

- **Input:** JSON on stdin.
- **stdout:** JSON only, or nothing. A stray `echo` corrupts the decision; Gemini CLI treats invalid
  stdout as "allow".
- **stderr:** every log, progress, and error line.

| Exit code | Effect |
| --- | --- |
| `0` | Success; stdout is parsed as a decision or context object (empty = no-op). |
| `2` | Block where the event supports it; stderr becomes the reason shown to the agent. |
| anything else | Non-blocking warning; the run continues. |

**Exit `1` does not block.** Use exit `2` or the platform's JSON deny decision. This is the most
common hook mistake.

## Lifecycle moments

Pick the moment first, then look up each platform's event name in `./references/platform-matrix.md`.

| Moment | Use it to | Common names |
| --- | --- | --- |
| Session start | Inject context, validate setup | `SessionStart` |
| Prompt submitted | Audit, add context, block | `UserPromptSubmit`; Gemini `BeforeAgent` |
| Before tool use | Allow, deny, or rewrite a call | `PreToolUse`; Gemini `BeforeTool` |
| After tool use | Format, lint, log, add context | `PostToolUse`; Gemini `AfterTool` |
| Turn ends | Force another turn, report | `Stop`; Gemini `AfterAgent` |
| Before compaction | Save context | `PreCompact`; Gemini `PreCompress` |

Most real hooks are `PreToolUse` gates and `PostToolUse` formatters. Codex alone has `PostCompact`
and `Interrupt`; hooks on those won't port.

## Writing one

1. Pick the moment and whether you observe, add context, or block.
2. Resolve the event name for each target platform.
3. Use a `command` hook unless the platform supports another type (`http`, `prompt`, `agent`,
   `mcp_tool`) and the job needs it. Start from `./assets/portable-hook.sh`: read stdin, branch,
   exit with a code and JSON.
4. Scope it with a matcher, and **also re-check inside the script**: VS Code ignores matchers, so
   every configured hook fires there.
5. Put the config in each platform's file (platform references below).
6. Dry-run: pipe a sample payload into the script and check exit code and stdout.
7. Trigger the real event and confirm it allows or denies as intended.

## Making it portable

- **Field names differ:** `tool_name`, `tool_input` (Claude, Gemini, VS Code) vs `toolName`,
  `toolArgs` (Copilot CLI native). Copilot and VS Code also accept Claude's form. Read both.
- **Tool names differ:** Claude `Write`/`Edit`, VS Code `create_file`/`replace_string_in_file`.
  Match on intent and re-check in the script.
- **Timeouts differ:** seconds everywhere except Gemini CLI (milliseconds). Codex defaults to 600
  seconds, so a hung hook stalls a session for ten minutes; its `SessionEnd` and `Interrupt` allow
  only 1 second (max 3), so slow teardown belongs in a detached process. Always set an explicit
  timeout.
- **Matchers** are regexes anchored as `^(?:PATTERN)$`, except in VS Code, which ignores them.
- **Project root:** `CLAUDE_PROJECT_DIR` (Claude), `GEMINI_PROJECT_DIR` (Gemini, which also sets
  the Claude name). Resolve with a fallback.
- **Config shape:** Claude, Codex, and Gemini nest `{ "matcher", "hooks": [...] }`; Copilot CLI and
  VS Code use flat entries. Codex, Copilot CLI, and VS Code all read Claude-format events and
  nesting (VS Code even reads `.claude/settings.json`), so one config often serves four platforms.
  Gemini needs its own. Codex also reads `[hooks]` in `.codex/config.toml`; use JSON when a hook
  must travel.

## Security

Hooks run arbitrary shell with your permissions, automatically, without confirmation.

- Never treat `tool_input` as shell: quote it, no `eval`, match against allowlists.
- Never inline or print secrets; pass them through the platform's `env` or `allowedEnvVars`.
- Validate paths against the project root before reading or writing.
- Prefer an explicit deny when a check errors, and know each event's fail-open or fail-closed
  default.
- Keep hooks fast and idempotent; they run inline.
- Read repo-committed and plugin hooks before enabling them: they execute on your machine.

## Gotchas

- Copilot CLI `preToolUse` fails **closed** on a crash but **open** on a timeout: a slow gate
  silently lets the call through.
- Claude hooks have no controlling terminal (`/dev/tty`); use the platform's notifications, not an
  interactive prompt.

## References

- `./references/platform-matrix.md`: event names and config shapes per platform. Read first.
- Per platform, when configuring for it:
  - `./references/platforms/claude-code-hooks.md`: `.claude/settings.json`, hook types, decision fields.
  - `./references/platforms/codex-hooks.md`: `.codex/hooks.json` or `config.toml`, extra events.
  - `./references/platforms/copilot-cli-hooks.md`: `.github/hooks/*.json`, camel/Pascal forms.
  - `./references/platforms/vscode-hooks.md`: ignored matchers, OS-specific command overrides.
  - `./references/platforms/gemini-cli-hooks.md`: `.gemini/settings.json`, its own vocabulary.
- `./references/checklist.md`: review pass before committing a hook.
- `./assets/git-identity-guard.sh`: worked `PreToolUse` example that blocks `git commit` when the
  author identity doesn't match the account `origin` points at. Edit its rules table.
