---
name: ref-sp-agents-hooks
description: "Author agent lifecycle hooks that run deterministic shell commands at session, prompt, tool, and stop events across Claude Code, GitHub Copilot CLI, VS Code, and Gemini CLI. Use when: creating or editing a hook, choosing a lifecycle event, writing a hook script that reads stdin JSON and returns an allow/deny/context decision, making a hook portable across agents, or debugging why a hook does not fire or block."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "hooks"
---

# Agent Hooks

## Purpose

Give the agent portable defaults for authoring lifecycle hooks -- shell commands that run automatically at agent events -- so the shared input/output contract lives in one place and only the per-service specifics (event names, config location, field names) are looked up per platform.

## When to use this skill

- Creating or editing a hook for any agent CLI or IDE.
- Deciding which lifecycle event a behavior should attach to.
- Writing a hook script that reads a JSON event on stdin and returns a decision.
- Making one hook work across more than one agent platform.
- Debugging why a hook does not fire, does not block, or breaks output parsing.

## Scope Boundaries

- This skill centers on `command` (shell) hooks, the one type every platform supports. Non-command types (`http`, `mcp_tool`, `prompt`, `agent`) are noted per platform in the references.
- For the config location, event vocabulary, and payload field names of one platform, read that platform's reference file.
- This skill is not about MCP servers, skills, or subagents themselves.
- For repo instruction files (`AGENTS.md`, `GEMINI.md`, `.claude/CLAUDE.md`), use the repo's instruction-authoring skill (`ref-sp-agents-instructions-authoring` here).
- When a hook reads or guards protected/secret files, use the repo's agent-security skill (`ref-sp-agents-security` here).

## Mental Model

A hook is a triple: **(event, matcher, command)**. At a lifecycle event, the agent runs your command, passes a JSON event payload on stdin, and interprets the command's exit code plus stdout as a decision. Hooks are deterministic: unlike asking the model to "remember to run the linter," a hook always fires.

The one contract that holds on all four platforms:

- **Input:** the event payload arrives as JSON on **stdin**.
- **Diagnostics:** human/debug text goes to **stderr**, never stdout.
- **Decision:** carried by the **exit code** plus **JSON on stdout**.

## The Exit-Code Contract

This is identical enough across platforms to memorize once:

| Exit code | Meaning | Effect |
| --- | --- | --- |
| `0` | Success | stdout is parsed as a JSON decision/context object (empty stdout = no-op) |
| `2` | Block / deny | Action is blocked where the event supports it; **stderr becomes the reason** shown to the agent |
| other non-zero | Non-blocking error | Logged as a warning; the run continues |

Critical corollary: **exit `1` does not block.** To stop a tool call or a turn you must use exit `2` (or the platform's JSON deny decision), not `1`. This is the single most common hook mistake.

Platform caveat: Copilot CLI `preToolUse` **fails closed** (a crash/non-zero exit denies the tool call) but **fails open on timeout**. See `./references/platforms/copilot-cli-hooks.md`.

## The stdout Rule

stdout is a structured channel. Print **only** JSON (or nothing) to it. Any stray `echo`/`print` on stdout can corrupt parsing -- Gemini CLI explicitly falls back to "allow" when stdout is not valid JSON, and the others may mis-handle it. Send every log line, progress note, and error message to stderr.

## Shared Lifecycle

Map behavior to a lifecycle moment first, then look up the event name per platform in `./references/platform-matrix.md`. The moments that exist almost everywhere:

| Moment | What you can do here | Common names |
| --- | --- | --- |
| Session start | Inject context, validate setup | `SessionStart` (Gemini/Claude/VS Code/Copilot) |
| Prompt submitted | Audit, add context, block prompt | `UserPromptSubmit` / `BeforeAgent` (Gemini) |
| Before tool use | Allow / deny / rewrite a tool call | `PreToolUse` / `BeforeTool` (Gemini) |
| After tool use | Format, lint, log, inject follow-up context | `PostToolUse` / `AfterTool` (Gemini) |
| Turn ends (stop) | Force another turn, run reports | `Stop` / `AfterAgent` (Gemini) |
| Before compaction | Save/export context | `PreCompact` / `PreCompress` (Gemini) |

`PreToolUse` and `PostToolUse` are where most real hooks live: gate dangerous commands, and format/validate after edits.

## Core Authoring Workflow

1. **Pick the moment and the decision.** What lifecycle point, and do you need to observe, add context, or block/modify?
2. **Resolve the event name per target platform** from `./references/platform-matrix.md`.
3. **Choose the hook type.** Default to `command`. Reach for `http`/`prompt`/`agent`/`mcp_tool` only when the platform supports it and the job needs it.
4. **Write the script to the portable contract** (read stdin JSON, branch, emit exit code + JSON on stdout). Start from `./assets/portable-hook.sh`.
5. **Scope it with a matcher** on the tool/event, but also guard inside the script (VS Code ignores matchers -- every hook fires).
6. **Place the config** in the correct file for each platform (see each platform reference).
7. **Dry-run**: pipe a sample payload into the script and confirm exit code + stdout before wiring it up.
8. **Validate blocking**: trigger the real event and confirm it actually allows/denies as intended.

## Portability Rules

When one hook must serve multiple agents:

- **Read fields defensively.** Payload keys differ: snake_case (`tool_name`, `tool_input`) on Claude/Gemini/VS Code vs camelCase (`toolName`, `toolArgs`) on Copilot CLI's native form. Copilot and VS Code also accept the Claude PascalCase form. Probe both spellings.
- **Do not key on one tool name.** The same action has different tool names per platform (Claude `Write`/`Edit` vs VS Code `create_file`/`replace_string_in_file`). Match on intent, or match broadly and re-check inside the script.
- **`timeout` units differ.** Seconds on Claude, Copilot, and VS Code; **milliseconds** on Gemini CLI.
- **Matchers are not uniform.** Regex is anchored as `^(?:PATTERN)$`; VS Code ignores matchers entirely, so filter in-script.
- **Project-root env vars differ.** `CLAUDE_PROJECT_DIR` (Claude), `GEMINI_PROJECT_DIR` (Gemini, plus a `CLAUDE_PROJECT_DIR` compatibility alias). Resolve a root with a fallback rather than hardcoding paths.
- **Config shape differs.** Claude and Gemini nest `{ "matcher", "hooks": [ ... ] }`; Copilot CLI and VS Code use flat hook entries. See the references.
- **Reuse across Claude-family tools.** Copilot CLI and VS Code both read Claude-format PascalCase events (and VS Code even reads `.claude/settings.json`), so one config often covers all three. Gemini uses a distinct vocabulary (`BeforeTool`/`AfterTool`/`BeforeAgent`) and needs its own.

## Security

Hooks run arbitrary shell with your full user permissions, automatically, without a confirmation each time. Treat every hook as production code.

- **Never trust `tool_input` as shell.** Quote it, avoid `eval`, and match against allowlists rather than interpolating raw values into commands.
- **Never echo or persist secrets.** Do not inline tokens in config; use the platform's `env`/`allowedEnvVars` to pass them, and keep them off stdout/stderr and logs.
- **Use project-rooted, validated paths.** Guard against path traversal before reading or writing.
- **Fail safe.** Prefer explicit deny (exit `2` / `permissionDecision: deny`) over silent pass when a check errors -- but know each event's fail-open vs fail-closed default.
- **Be fast and idempotent.** Hooks run inline with the agent; slow hooks stall it and can hit the timeout.
- **Review shared hooks before enabling.** Repo-committed and plugin hooks execute on your machine; read them first.

## Task Framing

| Action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Choose the lifecycle moment | Map the behavior to a shared moment before picking a name | Names differ per platform; the moment is stable | At the start of every hook | The hook attaches to the right event on each target |
| Write to the exit-code contract | Emit exit `0`/`2` + JSON stdout, diagnostics to stderr | Wrong exit code (e.g. `1`) silently fails to block | Whenever the hook must gate or modify | Blocking and context injection behave as intended |
| Guard inside the script | Re-check tool/args in-script, not only via matcher | VS Code ignores matchers; payloads vary | Any cross-platform or gating hook | The hook only acts on the cases it should |
| Dry-run with a sample payload | Pipe fixture JSON to the script and inspect output | Catches parsing/exit-code bugs before they hit a session | Before committing or enabling a hook | Verified exit code and JSON shape |

## Gotchas

- **Exit `1` is not a block.** Use exit `2` (or a JSON deny) to stop an action.
- **stdout must be JSON-only.** Route logs to stderr or you corrupt the decision parse (Gemini defaults to allow on invalid stdout).
- **VS Code ignores matchers** -- every configured hook fires; filter in the script.
- **Gemini `timeout` is milliseconds**, unlike the second-based platforms.
- **Copilot `preToolUse` fails closed on crash, open on timeout** -- a slow hook silently lets the call through.
- **Payload casing varies** (snake_case vs camelCase) and **tool names vary** across platforms.
- **No controlling terminal.** Claude hooks cannot use `/dev/tty`; for desktop alerts use the platform's notification mechanism, not an interactive prompt.

## References

- Read `./references/platform-matrix.md` first to translate a lifecycle moment into the event name and config shape for each platform.
- Read `./references/platforms/claude-code-hooks.md` for Claude Code (`.claude/settings.json`, nested config, hook types, JSON decision fields).
- Read `./references/platforms/copilot-cli-hooks.md` for GitHub Copilot CLI (`.github/hooks/*.json`, camel/Pascal duality, fail-closed preToolUse).
- Read `./references/platforms/vscode-hooks.md` for VS Code agent hooks (ignored matchers, OS-specific command overrides, Claude-format compatibility).
- Read `./references/platforms/gemini-cli-hooks.md` for Gemini CLI (`.gemini/settings.json`, distinct event vocabulary, millisecond timeouts).
- Read `./references/checklist.md` for a quick review pass before committing a hook.
- Read the repo's agent-security skill (`ref-sp-agents-security` here) when a hook touches protected files, secrets, or exclusion rules.

## Assets

- `./assets/portable-hook.sh` is a starter `command` hook that reads stdin JSON, reads a field under both snake_case and camelCase spellings, and returns an allow/deny decision. Adapt it per platform.
- `./assets/trigger-eval-queries.example.json` holds should-trigger / should-not-trigger prompts for checking this skill's activation.

## Validation

- Confirm the event name is valid for each target platform (`./references/platform-matrix.md`).
- Confirm stdout emits only JSON and all diagnostics go to stderr.
- Confirm blocking uses exit `2` or the platform's deny decision, never exit `1`.
- Confirm the config sits in the right file/shape for each platform.
- Dry-run the script against a sample payload before enabling it.
- Review `./evals/evals.json` when checking this skill's own output quality.
