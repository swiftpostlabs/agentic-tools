#!/usr/bin/env bash
# Pre-tool-use hook: block a `git commit` when the repo's configured author
# identity does not match the account its remote points at.
#
# Why this exists: on a machine that hosts more than one git identity (for
# example a personal account and a work account, often routed through distinct
# SSH host aliases), a repo whose local user.email is unset silently falls
# through to the GLOBAL identity. git never errors -- the commit is just
# authored under the wrong name. This hook turns that silent fallthrough into a
# hard block at commit time, on any platform that runs command hooks.
#
# It is a worked instance of this skill's core pattern: match a shell tool call
# by intent, re-check inside the script, and deny with exit 2 + a JSON decision.
#
# Contract this script follows (see SKILL.md):
#   - Input  : JSON event payload on stdin.
#   - stdout : ONLY JSON (a decision object) or nothing.
#   - stderr : all diagnostics / the block reason.
#   - exit 0 : allow.
#   - exit 2 : hard block; stderr becomes the reason where the platform reads it.
#   - exit 1 or other: NON-blocking warning -- never use it to block.
#
# Requires: jq, git. Adapt the IDENTITY RULES table below to your own accounts.

set -euo pipefail

# --- IDENTITY RULES (edit these) -------------------------------------------
# Map a pattern matched against the repo's `origin` remote URL to the author
# email that repo MUST be configured with. Patterns are extended-regex, tested
# in order; the first match wins. The values here are placeholders -- replace
# the patterns and emails with your own accounts.
identity_rule_pattern=(
  'work-git|[:/]acme-corp/'   # work SSH host alias or work org
  'personal-git|[:/]myuser/'  # personal SSH host alias or personal namespace
)
identity_rule_email=(
  'you@work.example'
  'you@personal.example'
)
# ---------------------------------------------------------------------------

payload="$(cat)"

# First non-empty value among several jq paths -- reads defensively so the same
# script works whether the platform sends snake_case or camelCase.
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

tool_name="$(first_field '.tool_name' '.toolName')"
command_arg="$(first_field '.tool_input.command' '.toolArgs.command')"
event_cwd="$(first_field '.cwd' '.workspaceRoot' '.tool_input.cwd' '.toolArgs.cwd')"

deny() {
  # reason: $1 -- goes to stderr AND into the JSON decision.
  printf 'git-identity-guard: %s\n' "$1" >&2
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    },
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }'
  exit 2
}

# Only shell-style tools carry a command; tool names vary per platform.
case "$tool_name" in
  *[Bb]ash* | *[Ss]hell* | *[Tt]erminal*) ;;
  *) exit 0 ;;
esac

# Only act on a real `git commit` (not `git commit --help` / `-h`).
if ! printf '%s' "$command_arg" | grep -qE '\bgit\b([^;&|]*\s)?commit\b'; then
  exit 0
fi
if printf '%s' "$command_arg" | grep -qE '\bcommit\b[^;&|]*(--help|(^|\s)-h(\s|$))'; then
  exit 0
fi

# Resolve the repo. Honour `git -C <dir>` in the command, else the event cwd,
# else $PWD. Not exhaustive (a cd'd subshell can defeat it) -- fail open there.
target_dir="$event_cwd"
c_dir="$(printf '%s' "$command_arg" | grep -oE '\-C\s+[^[:space:]]+' | head -n1 | awk '{print $2}' || true)"
[ -n "$c_dir" ] && target_dir="$c_dir"
[ -n "$target_dir" ] || target_dir="$PWD"

repo="$(git -C "$target_dir" rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$repo" ] || exit 0   # not a git repo we can resolve; let git handle it.

origin="$(git -C "$repo" remote get-url origin 2>/dev/null || true)"
[ -n "$origin" ] || exit 0  # no origin -> no rule to enforce.

# Find the first identity rule whose pattern matches the origin remote.
expected=""
for i in "${!identity_rule_pattern[@]}"; do
  if printf '%s' "$origin" | grep -qE "${identity_rule_pattern[$i]}"; then
    expected="${identity_rule_email[$i]}"
    break
  fi
done
[ -n "$expected" ] || exit 0  # remote not covered by any rule -> nothing to enforce.

# effective = the identity the commit will actually use (may fall through to the
# global config). local = only what this repo sets; empty means "inheriting".
effective="$(git -C "$repo" config user.email 2>/dev/null || true)"
local_email="$(git -C "$repo" config --local user.email 2>/dev/null || true)"

if [ "$effective" != "$expected" ]; then
  if [ -z "$local_email" ]; then
    deny "This repo sets no local user.email; it would commit under your global identity <${effective:-unset}>, but origin expects <$expected>. Set: git -C \"$repo\" config user.email \"$expected\""
  fi
  deny "Author identity mismatch: origin expects <$expected> but this repo is configured as <$local_email>. Fix: git -C \"$repo\" config user.email \"$expected\""
fi

exit 0
