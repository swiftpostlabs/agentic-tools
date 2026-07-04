#!/usr/bin/env bash
# Portable command-hook starter for agent lifecycle hooks.
#
# Works as a pre-tool-use hook on Claude Code, GitHub Copilot CLI, VS Code, and
# Gemini CLI. It reads the event payload as JSON on stdin, resolves the tool
# name and command under both snake_case and camelCase spellings, and blocks a
# destructive command by emitting a deny decision.
#
# Contract this script follows (identical across platforms):
#   - Input  : JSON event payload on stdin.
#   - stdout : ONLY JSON (a decision object) or nothing. No stray text.
#   - stderr : all diagnostics / logs.
#   - exit 0 : success; stdout (if any) is parsed as the decision.
#   - exit 2 : hard block; stderr becomes the reason on platforms that use it.
#   - exit 1 or other: NON-blocking warning. Never use it to try to block.
#
# Requires: jq. Adapt the field paths and decision shape per platform using the
# references in ../references/platforms/.

set -euo pipefail

# Read the whole stdin payload once.
payload="$(cat)"

# Helper: first non-empty value among several jq paths. Reads defensively so
# the same script works whether the platform sends snake_case or camelCase.
first_field() {
  local path value
  for path in "$@"; do
    value="$(printf '%s' "$payload" | jq -r "$path // empty" 2>/dev/null || true)"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done
  return 0
}

# Claude/Gemini/VS Code: .tool_name / .tool_input.command
# Copilot CLI (native): .toolName / .toolArgs.command
tool_name="$(first_field '.tool_name' '.toolName')"
command_arg="$(first_field '.tool_input.command' '.toolArgs.command')"

# Log to stderr, never stdout.
printf 'hook: tool=%s\n' "${tool_name:-<none>}" >&2

# Only act on shell-style tools; match broadly since tool names differ per
# platform (Bash, run_in_terminal, shell, ...).
case "$tool_name" in
  *[Bb]ash* | *[Ss]hell* | *[Tt]erminal*)
    if printf '%s' "$command_arg" | grep -qE '\brm\s+-rf\b'; then
      # Emit a JSON deny (understood by Claude / Copilot / VS Code) AND exit 2
      # (understood by Gemini and as a universal block signal). stderr is the
      # reason for platforms that read it.
      printf 'Blocked destructive command: %s\n' "$command_arg" >&2
      jq -n '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: "Destructive rm -rf blocked by hook"
        },
        permissionDecision: "deny",
        permissionDecisionReason: "Destructive rm -rf blocked by hook"
      }'
      exit 2
    fi
    ;;
esac

# Default: allow. No stdout, clean exit.
exit 0
