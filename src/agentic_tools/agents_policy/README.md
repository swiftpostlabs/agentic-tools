# Agents Policy

This feature packages the repository policy sync logic that turns `.agents/policy.json` into the agent-specific files used by the supported tools.

## For Users

Use `agents-policy` when a repo keeps its agent access rules in `.agents/policy.json` and wants the generated files for Gemini, Claude Code, and Copilot to stay in sync.

### Sync Generated Policy Files

```sh
uv run agents-policy
```

Node install example:

```sh
corepack enable
yarn add --dev github:swiftpostlab/agentic-tools
yarn agents-policy
```

This reads `.agents/policy.json` and updates the supported generated outputs for the enabled services.

### Check Generated Policy Files

```sh
uv run agents-policy --check
```

Use check mode in CI or before committing when generated policy files should already be current. It exits with an error instead of rewriting files, and its message points to `uv run agents-policy` or `uv run agents-policy-import-vscode` depending on whether you want to regenerate outputs or keep local VS Code approval edits.

### Import VS Code Approvals

```sh
uv run agents-policy-import-vscode
```

Or, from the Node package:

```sh
yarn agents-policy-import-vscode
```

Use the import command when you want to pull the current VS Code approval maps back into `.agents/policy.json` before resyncing.

## For Developers

## Files

- `main.py` contains the Python policy discovery, service selection, sync behavior, and CLI entrypoints.
- `main_test.py` covers the focused Python behavior of the sync logic.
- `main.ts` contains the Node policy sync implementation and Node CLI entrypoints.
- `main.test.ts` covers the focused Node CLI behavior through Jest.
- `scripts/agents-policy.mts` and `scripts/agents-policy-import-vscode.mts` are thin Node runtime shims that call into the feature-local implementation.

## Canonical commands

- `uv run agents-policy`
- `uv run agents-policy --check`
- `uv run agents-policy-import-vscode`

## Responsibilities

- discover `.agents/policy.json`, with legacy `.ai-policy.json` fallback
- sync `.aiexclude`, `.claude/settings.json`, and `.vscode/settings.json`
- clean disabled service outputs when `services` excludes a provider
- report drift without rewriting files when `--check` is used
- import VS Code approval maps back into the policy file when requested

## Focused validation

```sh
uv run python -m pytest src/agentic_tools/agents_policy/main_test.py -q
```

```sh
corepack yarn test:node --runTestsByPath src/agentic_tools/agents_policy/main.test.ts
```

```sh
uv run agents-policy --check
```
