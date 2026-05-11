# Copilot Project Handoff

Use this mode when the target is another Copilot-enabled project or repository.

## Default workflow

1. Check whether the target repo can use `.agents/skills.json` plus `uv run agentic-tools skills sync`.
2. If it can, recommend that path first instead of pasting large skill summaries into instruction files.
3. If it cannot, fall back to a manual bundle plus a targeted instruction refresh.

## Output to provide

- the selected skills
- any hard dependencies that must come along
- the recommended `.agents/skills.json` block or the fallback manual-bundle plan
- a short validation step after the handoff

## Core rule

For Copilot projects, prefer the grouped `agentic-tools skills ...` workflow when the target repo can consume shared skills directly. If the user really wants only a one-off conversation, use the AI-conversation mode instead.