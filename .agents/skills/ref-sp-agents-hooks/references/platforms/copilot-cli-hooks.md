# GitHub Copilot CLI Hooks

GitHub Copilot CLI and Copilot Cloud Agent. Docs: <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks> and <https://docs.github.com/en/copilot/reference/hooks-reference>.

## Config Location

Loaded from all of these (combined), highest precedence first:

- Machine policy: `/etc/github-copilot/policy.d/*.json` (Linux/macOS) or `C:\ProgramData\GitHub\Copilot\policy.d\*.json`. Root-owned, cannot be disabled.
- Repo: `.github/hooks/*.json` (committed to the default branch).
- User: `~/.copilot/hooks/` (or `%USERPROFILE%\.copilot\hooks\`).
- Settings `hooks` field: `.github/copilot/settings.json`, `.github/copilot/settings.local.json`, `~/.copilot/settings.json`.
- Plugin `hooks.json`.

Cloud Agent loads only `.github/hooks/*.json` from the cloned repo.

## Config Shape (flat)

```json
{
  "version": 1,
  "disableAllHooks": false,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "$SCRIPT_DIR/guard.sh",
        "powershell": "pwsh -File guard.ps1",
        "command": "fallback-command",
        "matcher": "Bash",
        "cwd": ".",
        "env": { "LEVEL": "high" },
        "timeoutSec": 30
      }
    ]
  }
}
```

- Top-level `version` (1) and optional `disableAllHooks`.
- Hook entries are **flat** (no nested `hooks` array). The `matcher` sits directly on the entry, anchored as `^(?:PATTERN)$`.
- A `command` hook needs one of `bash`, `powershell`, or `command`. Provide both `bash` and `powershell` for cross-OS coverage.
- `timeout` is an alias for `timeoutSec` (seconds, default 30).

## Events

Native camelCase names: `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `preCompact`, `agentStop`, `subagentStart`, `subagentStop`, `errorOccurred`, `notification` (CLI only), `permissionRequest` (CLI only).

Copilot also accepts **PascalCase / Claude-format** event keys (`PreToolUse`, `Stop`, ...) and Claude-format matcher semantics, so a Claude-style config often works unchanged.

Guide-level docs highlight six core triggers: `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `errorOccurred`.

## Hook Types

- `command` -- `bash` / `powershell` / `command`, with `cwd`, `env`, `timeoutSec`, `matcher`.
- `http` -- POST payload to `url`; `headers`, `allowedEnvVars`, `timeoutSec`. HTTPS required for permission-granting responses.
- `prompt` -- auto-submit `prompt` text as if typed (sessionStart only, CLI only).

## stdin Payload

Two shapes. camelCase native (`sessionId`, `timestamp`, `cwd`, `toolName`, `toolArgs`) or PascalCase Claude-compatible (`hook_event_name`, `session_id`, `tool_name`, `tool_input`). `preToolUse` reports the Claude tool name in the Pascal form.

## Output / Decisions

`preToolUse` stdout controls execution:

```json
{
  "permissionDecision": "allow",
  "permissionDecisionReason": "required if deny",
  "modifiedArgs": { "command": "safe-command" }
}
```

- Empty output = default behavior. Under Cloud Agent, `"ask"` is treated as `"deny"` (no user present).
- `postToolUse`: `{ "modifiedResult": {...}, "additionalContext": "..." }`.
- `agentStop` / `subagentStop`: `{ "decision": "block" | "allow", "reason": "..." }` -- `block` forces another turn using `reason` as the prompt.
- `permissionRequest` (CLI): `{ "behavior": "allow" | "deny", "message": "...", "interrupt": bool }`.

## Exit Codes (important caveat)

- `0` -- success; stdout parsed as hook JSON.
- `2` -- warning; on `preToolUse` treated as deny, on `permissionRequest` merged with a deny decision.
- other non-zero -- logged; run continues **except `preToolUse` fails closed (denies the call)**.
- timeout -- killed; logged **except `preToolUse` fails open (call proceeds via normal permission flow)**.

So a slow `preToolUse` hook silently lets tool calls through -- keep it fast.

## Environment

Cloud Agent sandbox exposes `GITHUB_COPILOT_API_TOKEN`, `GITHUB_COPILOT_GIT_TOKEN`, `COPILOT_AGENT_PROMPT`, `HOME=/root`; `GITHUB_TOKEN` is **not** set. It is a non-interactive Linux sandbox with an ephemeral filesystem and network restricted to GitHub/Copilot hosts by default. The CLI runs in your normal shell with the full environment.

## Disabling

`"disableAllHooks": true` at the top of a file skips its hooks. In repo `settings.json` (CLI only) it disables every non-policy hook from all sources.
