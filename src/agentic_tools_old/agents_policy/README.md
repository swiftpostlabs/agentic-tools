# Agents Policy

This feature packages the repository policy sync logic that turns the `policy` section in `.agents/config.json` into the agent-specific files used by the supported tools.

## For Users

Use `agentic-tools policy` when a repo keeps its agent access rules in `.agents/config.json` and wants the generated files for Gemini, Claude Code, and Copilot to stay in sync.

### Sync Generated Policy Files

```sh
uv run agentic-tools policy sync
```

Node install example:

```sh
corepack enable
yarn add --dev github:swiftpostlabs/agentic-tools
yarn agentic-tools policy sync
```

This reads the `policy` section in `.agents/config.json` and updates the supported generated outputs for the enabled services. Legacy `.agents/policy.json` and `.ai-policy.json` files still work as fallbacks.

### Check Generated Policy Files

```sh
uv run agentic-tools policy check
```

Use check mode in CI or before committing when generated policy files should already be current. It exits with an error instead of rewriting files, and its message points to `uv run agentic-tools policy sync` or `uv run agentic-tools policy import-vscode` depending on whether you want to regenerate outputs or keep local VS Code approval edits.

### Import VS Code Approvals

```sh
uv run agentic-tools policy import-vscode
```

Or, from the Node package:

```sh
yarn agentic-tools policy import-vscode
```

Use the import command when you want to pull the current VS Code approval maps back into `.agents/config.json` before resyncing.

## For Developers

## Files

- `main.py` contains the Python policy handler used by the grouped CLI.
- `policy.py` contains the Python policy schema and parsing helpers.
- `claude.py`, `gemini.py`, and `vscode.py` contain provider-specific Python transforms.
- `main_test.py` covers the focused Python behavior of the sync logic.
- `main.mjs` contains the Node policy sync implementation used by the grouped CLI.
- `main.test.mjs` covers the focused Node CLI behavior through Jest.

## Canonical commands

- `uv run agentic-tools policy sync`
- `uv run agentic-tools policy check`
- `uv run agentic-tools policy import-vscode`

## Responsibilities

- discover `.agents/config.json` policy sections, with `.agents/policy.json` and legacy `.ai-policy.json` fallbacks
- sync `.aiexclude`, `.claude/settings.json`, and `.vscode/settings.json`
- clean disabled service outputs when `services` excludes a provider
- report drift without rewriting files when `--check` is used
- import VS Code approval maps back into the policy section when requested

## Focused validation

```sh
uv run python -m pytest src/agentic_tools/agents_policy/main_test.py -q
```

```sh
yarn test --runTestsByPath src/agentic_tools/agents_policy/main.test.mjs
```

```sh
uv run agentic-tools policy check
```
