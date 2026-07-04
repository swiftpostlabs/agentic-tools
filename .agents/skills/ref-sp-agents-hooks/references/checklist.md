# Hook Review Checklist

Run through this before committing or enabling a hook.

## Wiring

- The event exists on every target platform (`./platform-matrix.md`) -- not just the one you tested.
- The config sits in the correct file and shape (nested vs flat) for each platform.
- The matcher scopes the hook correctly, and the script also guards internally (VS Code ignores matchers).

## I/O Contract

- The script reads its input from stdin as JSON, not from arguments or env alone.
- stdout carries **only** JSON (or nothing); every log/diagnostic line goes to stderr.
- Blocking uses exit `2` or the platform's JSON deny decision -- never exit `1`.
- Field access is defensive across casings (`tool_name` and `toolName`) when the hook is cross-platform.
- `timeout` uses the right unit (milliseconds for Gemini, seconds elsewhere) and is short enough not to stall the agent.

## Safety

- No raw `tool_input` is interpolated into a shell command; values are quoted and matched against allowlists.
- No secrets are echoed, logged, or inlined in config; tokens pass through `env` / `allowedEnvVars`.
- Paths are project-rooted and validated against traversal.
- The failure mode is intentional (know each event's fail-open vs fail-closed default, e.g. Copilot `preToolUse`).
- Any shared/plugin hook was read before enabling.

## Verification

- Dry-run: a sample payload piped to the script produces the expected exit code and JSON.
- The real event was triggered and the allow/deny/context behavior matched the intent.
- The hook is idempotent -- running it twice on the same event is safe.
