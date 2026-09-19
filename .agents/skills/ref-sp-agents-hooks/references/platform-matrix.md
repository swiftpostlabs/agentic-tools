# Platform Matrix

Translate a lifecycle moment into the concrete event name, config location, and config shape for each platform. Read this before writing a hook, then open the matching platform file for the full field list.

## Event Name By Lifecycle Moment

| Lifecycle moment | Claude Code | Codex | Copilot CLI | VS Code | Gemini CLI |
| --- | --- | --- | --- | --- | --- |
| Session begins | `SessionStart` | `SessionStart` | `sessionStart` / `SessionStart` | `SessionStart` | `SessionStart` |
| Session ends | `SessionEnd` | `SessionEnd` | `sessionEnd` / `SessionEnd` | (use `Stop`) | `SessionEnd` |
| Prompt submitted | `UserPromptSubmit` | `UserPromptSubmit` | `userPromptSubmitted` / `UserPromptSubmit` | `UserPromptSubmit` | `BeforeAgent` |
| Before tool use | `PreToolUse` | `PreToolUse` | `preToolUse` / `PreToolUse` | `PreToolUse` | `BeforeTool` |
| After tool use (success) | `PostToolUse` | `PostToolUse` | `postToolUse` / `PostToolUse` | `PostToolUse` | `AfterTool` |
| After tool use (failure) | `PostToolUseFailure` | (n/a) | `postToolUseFailure` / `PostToolUseFailure` | (n/a) | `AfterTool` |
| Turn / agent ends | `Stop` | `Stop` | `agentStop` / `Stop` | `Stop` | `AfterAgent` |
| Subagent starts | `SubagentStart` | `SubagentStart` | `subagentStart` | `SubagentStart` | (n/a) |
| Subagent stops | `SubagentStop` | `SubagentStop` | `subagentStop` / `SubagentStop` | `SubagentStop` | (n/a) |
| Before compaction | `PreCompact` | `PreCompact` | `preCompact` / `PreCompact` | `PreCompact` | `PreCompress` |
| After compaction | (n/a) | `PostCompact` | (n/a) | (n/a) | (n/a) |
| Run interrupted | (n/a) | `Interrupt` | (n/a) | (n/a) | (n/a) |
| Notification | `Notification` | (n/a) | `notification` | (n/a) | `Notification` |
| Permission request | `PermissionRequest` | `PermissionRequest` | `permissionRequest` | (n/a) | (n/a) |
| Before tool selection | (n/a) | (n/a) | (n/a) | (n/a) | `BeforeToolSelection` |
| Before model call | (n/a) | (n/a) | (n/a) | (n/a) | `BeforeModel` |
| After model call | (n/a) | (n/a) | (n/a) | (n/a) | `AfterModel` |
| Error occurred | (n/a) | (n/a) | `errorOccurred` / `ErrorOccurred` | (n/a) | (n/a) |

Notes:

- Claude Code exposes many additional events (e.g. `Setup`, `PermissionDenied`, `PostToolBatch`, `FileChanged`, `SessionEnd`); see its reference for the full list.
- Gemini uses a different vocabulary built around the agent loop (`Before/AfterAgent`, `Before/AfterModel`, `Before/AfterTool`) rather than the Pre/Post naming.
- Copilot CLI accepts **both** camelCase (its native names) and PascalCase (Claude-compatible) event keys and payload shapes.
- Codex uses Claude's PascalCase vocabulary and adds two moments no other platform exposes: `PostCompact` (after compaction finishes, not just before) and `Interrupt` (the user stopped the run).

## Config Location

| Platform | Project scope | User scope | Notes |
| --- | --- | --- | --- |
| Claude Code | `.claude/settings.json`, `.claude/settings.local.json` | `~/.claude/settings.json` | Also plugin `hooks/hooks.json`, skill/agent frontmatter, managed policy |
| Codex | `.codex/hooks.json`, `.codex/config.toml` (`[hooks]`) | `~/.codex/hooks.json`, `~/.codex/config.toml` | Only platform here that accepts hook config as TOML; plugin hooks ride in `extensions.com.openai` |
| Copilot CLI | `.github/hooks/*.json`, `.github/copilot/settings.json` (`hooks` field) | `~/.copilot/hooks/`, `~/.copilot/settings.json` | Also `/etc/github-copilot/policy.d/*.json` (machine policy, cannot be disabled) |
| VS Code | `.github/hooks/*.json`, `.claude/settings.json` | `~/.copilot/hooks`, `~/.claude/settings.json` | Also `.agent.md` frontmatter `hooks` field; `chat.hookFilesLocations` setting |
| Gemini CLI | `.gemini/settings.json` | `~/.gemini/settings.json` | Also `/etc/gemini-cli/settings.json` (system) and extensions |

## Config Shape

Two families. Claude, Codex, and Gemini **nest** hook entries under a matcher group; Copilot CLI and VS Code use **flat** entries.

Nested (Claude Code, Codex, Gemini CLI):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "./validate.sh" }
        ]
      }
    ]
  }
}
```

Flat (Copilot CLI, VS Code):

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      { "type": "command", "bash": "./validate.sh", "matcher": "Bash" }
    ]
  }
}
```

## Contract Differences At A Glance

| Concern | Claude Code | Codex | Copilot CLI | VS Code | Gemini CLI |
| --- | --- | --- | --- | --- | --- |
| stdin payload casing | snake_case | snake_case | camelCase (or Pascal) | snake_case / camelCase mix | snake_case |
| `timeout` unit | seconds | seconds | seconds (`timeoutSec`) | seconds | **milliseconds** |
| Default `timeout` | tens of seconds | **600 s** (`SessionEnd` / `Interrupt`: 1 s, max 3 s) | 30 s | tens of seconds | tens of seconds |
| Matcher honored | yes (regex) | yes (regex) | yes (regex) | **no (ignored)** | yes (regex) |
| Block via | exit `2` / `permissionDecision` | exit `2` / `permissionDecision` | exit `2` / `permissionDecision` | exit `2` / `permissionDecision` | exit `2` / JSON |
| preToolUse on crash | non-blocking unless exit `2` | non-blocking unless exit `2` | **fail closed (deny)** | non-blocking unless exit `2` | non-blocking unless exit `2` |
| Non-`command` types | `http`, `mcp_tool`, `prompt`, `agent` | (not documented) | `http`, `prompt` | `command` only | `command` only |
| Project-root env var | `CLAUDE_PROJECT_DIR` | (shell env) | (shell env) | (shell env) | `GEMINI_PROJECT_DIR` (+ `CLAUDE_PROJECT_DIR` alias) |
| Toggle all off | `disableAllHooks` | (not documented) | `disableAllHooks` | via settings | `/hooks disable-all` |

Codex's 600-second default is the outlier worth remembering: a hook that hangs stalls the session for ten minutes instead of failing fast. Set an explicit `timeout` on anything that touches the network.
