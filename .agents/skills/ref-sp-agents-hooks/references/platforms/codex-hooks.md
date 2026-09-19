# OpenAI Codex Hooks

Codex CLI and the Codex surfaces in the ChatGPT apps. Docs: <https://developers.openai.com/codex/hooks> (redirects to <https://learn.chatgpt.com/docs/hooks>).

Codex uses **Claude-format** hooks: PascalCase event names, nested matcher groups, exit `2` to block, and `permissionDecision` in the stdout JSON. A Claude config is close to portable here; the differences are the config location, two extra events, and a far longer default timeout.

## Config Location

Loaded from all of these:

- Repo: `<repo>/.codex/hooks.json`, or inline `[hooks]` tables in `<repo>/.codex/config.toml`.
- User: `~/.codex/hooks.json`, or inline `[hooks]` tables in `~/.codex/config.toml`.

The TOML option is unique to Codex; no other platform in this skill accepts hook config outside JSON. Prefer `hooks.json` when the same hook must also serve another agent, since the JSON form is the one that copies across.

## Config Shape (nested)

Same nesting as Claude Code and Gemini CLI: an event key holds matcher groups, and each group holds the hook entries.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^apply_patch$",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/guard.sh",
            "timeout": 600
          }
        ]
      }
    ]
  }
}
```

The `matcher` is a regex filtering which tool triggers the group, written in the same style as the other nested platforms (`"Bash"`, `"^apply_patch$"`, `"Edit|Write"`).

## Events

Turn-scoped: `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`.

Session-scoped: `SessionStart`, `SessionEnd`, `SubagentStart`, `Interrupt`.

Two have no equivalent elsewhere in this skill:

- **`PostCompact`** fires after compaction completes. Every other platform exposes only the pre-compaction moment, so a hook that needs to restore or re-inject state *after* a compaction is Codex-only.
- **`Interrupt`** fires when the user interrupts a run, which is the moment to release locks or clean up partial work.

## stdin Payload

A JSON object on stdin carrying the shared fields `session_id`, `cwd`, and `hook_event_name`, plus event-specific data. The naming is snake_case, matching Claude Code and Gemini CLI rather than Copilot's native camelCase.

## Output / Decisions

JSON on stdout. The response fields:

```json
{
  "continue": false,
  "stopReason": "explanation shown when processing stops",
  "systemMessage": "warning surfaced to the user",
  "additionalContext": "text injected into the model's context"
}
```

Blocking works either way: exit `2` with the reason on stderr, or a structured `{"permissionDecision": "deny"}` in the stdout JSON.

## Timeouts

**Default `timeout` is 600 seconds**, an order of magnitude more permissive than the other platforms (Claude, Copilot, and VS Code sit in the tens of seconds). A hook that hangs stalls the session for ten minutes rather than failing fast, so set an explicit short `timeout` on anything that touches the network.

`SessionEnd` and `Interrupt` invert this: they default to **1 second** and cap at **3 seconds**, because both fire on a teardown path. Cleanup work that cannot finish in three seconds belongs in a detached process, not in the hook.

## Hooks Bundled In A Plugin

Agent Plugins 1.0 deliberately leaves hooks out of the portable contract, so a plugin-bundled hook is client-specific configuration rather than a portable component. In a root `plugin.json`, Codex reads hook settings from the `extensions.com.openai` namespace. See the repo's plugin-distribution skill (`.agents/skills/ref-sp-agents-plugin-marketplaces/SKILL.md`) for how the extension namespaces work and what each client reads.

## Portability Notes

- Event names and the nested config shape match Claude Code, so a Claude hook usually transfers by moving the file to `.codex/hooks.json`.
- `PostCompact` and `Interrupt` have no equivalent elsewhere; a hook relying on them is Codex-only by construction.
- The 600-second default is the trap. A config copied from Claude carries Claude's short timeout and behaves sanely; a config written fresh against Codex defaults does not.
