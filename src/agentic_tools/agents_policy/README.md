# Agents Policy

This feature packages the repository policy sync logic that turns `.agents/policy.json` into the agent-specific files used by the supported tools.

## Files

- `main.py` contains policy discovery, service selection, sync behavior, and the CLI entrypoints.
- `main_test.py` covers the focused behavior of the sync logic.

## Canonical commands

- `uv run agents-policy`
- `uv run agents-policy-import-vscode`

## Responsibilities

- discover `.agents/policy.json`, with legacy `.ai-policy.json` fallback
- sync `.aiexclude`, `.claude/settings.json`, and `.vscode/settings.json`
- clean disabled service outputs when `services` excludes a provider
- import VS Code approval maps back into the policy file when requested

## Focused validation

```sh
uv run python -m pytest src/agentic_tools/agents_policy/main_test.py -q
```
