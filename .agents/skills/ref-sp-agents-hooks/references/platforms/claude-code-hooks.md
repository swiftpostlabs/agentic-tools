# Claude Code Hooks

Anthropic Claude Code. Docs: <https://code.claude.com/docs/en/hooks> and <https://code.claude.com/docs/en/hooks-guide>.

## Config Location

Hooks live in JSON settings files (later entries override earlier scopes):

- `~/.claude/settings.json` -- all projects, user machine only.
- `.claude/settings.json` -- one project, committed to the repo.
- `.claude/settings.local.json` -- one project, gitignored (personal).
- Plugin `hooks/hooks.json`, and skill/agent frontmatter `hooks:` -- component-scoped.
- Managed policy settings -- organization-wide, admin-controlled.

Inspect configured hooks in-session with `/hooks` (read-only browser).

## Config Shape (nested)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/guard.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

- Each event maps to an array of matcher groups; each group has a `matcher` and a `hooks` array of handlers.
- `matcher`: exact tool name(s) (`Bash`, `Edit|Write`), `"*"`/`""` for all, or regex (`mcp__memory__.*`).
- Add new event keys as siblings inside the single `hooks` object; do not replace it.

## Events

Core: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Notification`, `Stop`, `SubagentStop`, `SessionStart`, `SessionEnd`, `PreCompact`.

Extended (subset): `Setup`, `PermissionRequest`, `PermissionDenied`, `PostToolUseFailure`, `PostToolBatch`, `SubagentStart`, `PostCompact`, `SessionEnd`, `CwdChanged`, `FileChanged`, `WorktreeCreate`. See the reference for the full list.

## Hook Types

- `command` -- shell command or executable. Supports `args` (switches to exec form, no shell parsing), `shell` (`bash`/`powershell`), `async`, `asyncRewake`, `timeout`.
- `http` -- POST the payload to a `url`; `headers` support `$VAR` interpolation gated by `allowedEnvVars`.
- `mcp_tool` -- call a `tool` on a connected MCP `server` with `input`.
- `prompt` / `agent` -- have a fast model (or a chosen `model`) evaluate `$ARGUMENTS` for judgment-based decisions.

## stdin Payload (snake_case)

Common fields: `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`. Event-specific, e.g. `PreToolUse`/`PostToolUse`:

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf build" }
}
```

## Output / Decisions

Exit `0` with optional JSON on stdout; exit `2` blocks and stderr is the reason; other non-zero is a non-blocking error. JSON decision fields:

```json
{
  "continue": true,
  "stopReason": "Build failed",
  "systemMessage": "Warning shown to user",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "rm commands not allowed",
    "additionalContext": "extra context for Claude"
  }
}
```

Per-event exit-`2` behavior: blocks on `PreToolUse`, `UserPromptSubmit`, `PermissionRequest`, `Stop`, `PreCompact`; non-blocking on `PostToolUse` (stderr is shown to Claude as context).

## Placeholders And Env

`${CLAUDE_PROJECT_DIR}` (project root), `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` -- available in config and exported to the process. Hooks run **without a controlling terminal** (no `/dev/tty`); use `terminalSequence` in JSON output or a native notifier for alerts.

## Example: block `rm -rf`

```bash
#!/usr/bin/env bash
# .claude/hooks/guard.sh
command=$(jq -r '.tool_input.command // empty')
if printf '%s' "$command" | grep -qE '\brm\s+-rf\b'; then
  jq -n '{hookSpecificOutput: {hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "Destructive rm blocked by hook"}}'
fi
exit 0
```

## Notes

- Strings in JSON output are capped (~10,000 chars); overflow is written to a file.
- Managed `allowManagedHooksOnly` can restrict a machine to admin-approved hooks.
- The `if` field (e.g. `"if": "Bash(rm *)"`) filters command hooks by permission rule but is best-effort; enforce hard policy with `permissionDecision`.
