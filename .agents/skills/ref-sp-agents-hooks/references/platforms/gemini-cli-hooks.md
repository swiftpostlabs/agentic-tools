# Gemini CLI Hooks

Google Gemini CLI. Docs: <https://geminicli.com/docs/hooks/>.

## Config Location

Configured in `settings.json` under a `hooks` object, highest precedence first:

- `.gemini/settings.json` -- project.
- `~/.gemini/settings.json` -- user.
- `/etc/gemini-cli/settings.json` -- system.
- Extensions.

Manage in-session with `/hooks panel`, `/hooks enable-all`, `/hooks disable-all`, `/hooks enable <name>`, `/hooks disable <name>`.

## Config Shape (nested)

```json
{
  "hooks": {
    "BeforeTool": [
      {
        "matcher": "write_file|replace",
        "hooks": [
          {
            "name": "security-check",
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/security.sh",
            "timeout": 5000,
            "description": "Validates file operations"
          }
        ]
      }
    ]
  }
}
```

- Like Claude, entries are **nested** under a `matcher` group with a `hooks` array.
- `type` must be `"command"` (the only supported type today); `command` required.
- `name` and `description` are optional labels for logs and the `/hooks` panel.
- `matcher`: regex for tool events, exact string for lifecycle events; `"*"` or `""` matches all.

## Events (distinct vocabulary)

Gemini names events around the agent loop, not Pre/Post:

| Event | Trigger | Capability |
| --- | --- | --- |
| `SessionStart` | Session begins | Inject context |
| `SessionEnd` | Session ends | Advisory only |
| `BeforeAgent` | After prompt, before planning | Block / add context |
| `AfterAgent` | Agent loop completes | Retry / halt |
| `BeforeModel` | Before LLM request | Block / mock |
| `AfterModel` | After LLM response | Redact / filter |
| `BeforeToolSelection` | Before tool selection | Filter tools |
| `BeforeTool` | Before tool execution | Block / rewrite |
| `AfterTool` | After tool execution | Block result |
| `PreCompress` | Before context compression | Advisory |
| `Notification` | System notification | Advisory |

So `BeforeTool`/`AfterTool` are the analogues of `PreToolUse`/`PostToolUse`, and `BeforeAgent`/`AfterAgent` roughly map to prompt-submit / stop.

## stdin Payload / Output

JSON on stdin. Output rules are strict:

- Exit `0` -- success; stdout parsed as JSON. This is the preferred path even for blocks (emit a JSON block decision).
- Exit `2` -- system block; action aborted, **stderr is the rejection reason**.
- other non-zero -- non-fatal warning; proceeds with original parameters.

**stdout must contain only the final JSON object.** Any stray non-JSON text on stdout fails parsing and the CLI defaults to "allow". Use stderr exclusively for debugging.

## Timeout Unit (caveat)

`timeout` is in **milliseconds** (default 60000), unlike the second-based platforms. `5000` means 5 seconds, not 5000.

## Environment

- `GEMINI_PROJECT_DIR` -- project root absolute path.
- `GEMINI_PLANS_DIR` -- plans directory.
- `GEMINI_SESSION_ID` -- session id.
- `GEMINI_CWD` -- current working directory.
- `CLAUDE_PROJECT_DIR` -- compatibility alias for `GEMINI_PROJECT_DIR`.

## Security

Hooks execute synchronously inside the agent loop. Gemini fingerprints project-level hooks so changes in untrusted projects require re-approval; still review any `.gemini/settings.json` hook before enabling it.
