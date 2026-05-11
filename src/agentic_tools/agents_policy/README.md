# Agents Policy

This feature packages the repository policy sync logic that turns `.agents/policy.json` into the agent-specific files used by the supported tools.

## For Users

Use `agents-policy` when a repo keeps its agent access rules in `.agents/policy.json` and wants the generated files for Gemini, Claude Code, and Copilot to stay in sync.

### Sync Generated Policy Files

```sh
uv run agents-policy
```

This reads `.agents/policy.json` and updates the supported generated outputs for the enabled services.

### Import VS Code Approvals

```sh
uv run agents-policy-import-vscode
```

Use the import command when you want to pull the current VS Code approval maps back into `.agents/policy.json` before resyncing.

## For Developers

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
