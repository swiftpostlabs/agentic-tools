# VS Code Agent Hooks

Agent hooks in VS Code (Copilot Chat agent mode). Docs: <https://code.visualstudio.com/docs/agent-customization/hooks> and <https://code.visualstudio.com/learn/customizations/5-hooks>.

## Config Location

Discovered in precedence order:

- Workspace: `.github/hooks/*.json`.
- Workspace, Claude format: `.claude/settings.json`, `.claude/settings.local.json`.
- User: `~/.copilot/hooks`, `~/.claude/settings.json`.
- Custom agent: `hooks` field in `.agent.md` frontmatter.
- Plugin: `hooks.json` or `hooks/hooks.json`.

Override the search locations with the `chat.hookFilesLocations` setting. Because VS Code reads Claude-format files, a `.claude/settings.json` hook config is often shared between Claude Code and VS Code.

## Config Shape (flat, PascalCase)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "type": "command",
        "command": "./scripts/validate-tool.sh",
        "timeout": 15,
        "cwd": "./project",
        "env": { "VAR_NAME": "value" },
        "windows": "powershell -File scripts\\validate.ps1",
        "linux": "./scripts/validate-linux.sh",
        "osx": "./scripts/validate-mac.sh"
      }
    ]
  }
}
```

- Entries are flat. `type` must be `"command"`; `command` is required.
- `timeout` is seconds (default 30). `cwd` and `env` supported.
- OS-specific overrides: `windows`, `linux`, `osx` replace `command` on that platform.

## Events (8)

`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `SubagentStart`, `SubagentStop`, `Stop`.

- `SessionStart` fires on the first prompt of a new session.
- `Stop` fires when the agent session ends (use it in place of a session-end event).

## Hook Types

`command` only. There is no `http`/`prompt`/`agent`/`mcp_tool` type in VS Code hooks.

## stdin Payload

JSON on stdin with common fields: `timestamp` (ISO 8601), `cwd` (optional), `session_id` (optional), `hook_event_name`, `transcript_path` (optional). Event-specific fields follow (e.g. `PreToolUse` adds `tool_name` and `tool_input`).

Watch the naming differences from Claude Code:

- Tool input keys are **camelCase** (`tool_input.filePath`) where Claude uses snake_case (`tool_input.file_path`).
- Tool **names differ**: VS Code uses `create_file` / `replace_string_in_file` where Claude uses `Write` / `Edit`.

## Output / Decisions

Exit codes: `0` success (parse stdout JSON), `2` blocking error (stop, show error to the model), other non-zero non-blocking warning.

```json
{
  "continue": true,
  "stopReason": "Operation blocked",
  "systemMessage": "Warning displayed to the user",
  "hookSpecificOutput": {
    "permissionDecision": "deny",
    "additionalContext": "context details"
  }
}
```

- `continue: false` terminates the session; `stopReason` explains it.
- `systemMessage` is always shown to the user.
- `hookSpecificOutput.permissionDecision` is `"allow"`, `"deny"`, or `"ask"` on `PreToolUse`.

## Critical Difference: Matchers Are Ignored

VS Code **ignores hook matchers** -- every configured hook runs on every occurrence of its event regardless of matcher syntax. If a hook should only act on some tools or paths, filter inside the script (check `tool_name` / `tool_input`) rather than relying on `matcher`.

## Security

Hooks execute shell commands with the same permissions as VS Code. Review scripts, apply least privilege, validate all input, and never hardcode secrets in hook configs.
