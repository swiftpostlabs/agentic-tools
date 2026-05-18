# Agentic Tools CLI

This package is moving toward one umbrella CLI that groups the policy and skills workflows under a single command surface.

## For Users

Use `agentic-tools` as the canonical entry point once the merged CLI is in place.

When you need to run a command from a subdirectory, add `--workspace <repo-root>` and the grouped CLI will resolve relative paths from that workspace instead of the current shell directory.

### Policy examples

Python install example:

```sh
uv add --dev "agentic-tools @ git+https://github.com/swiftpostlab/agentic-tools.git"
uv run agentic-tools policy sync
uv run agentic-tools --workspace ../target-repo policy sync
uv run agentic-tools policy check
uv run agentic-tools policy import-vscode
```

Node install example:

```sh
corepack enable
yarn add --dev github:swiftpostlab/agentic-tools
yarn agentic-tools policy sync
yarn agentic-tools policy check
yarn agentic-tools policy import-vscode
```

### Skills examples

```sh
uv run agentic-tools skills list
uv run agentic-tools --workspace ../target-repo skills sync
uv run agentic-tools skills sync
uv run agentic-tools skills link ref-python --from ../agentic-tools
uv run agentic-tools skills unlink ref-python --from ../agentic-tools
```

### CLI shape

```text
agentic-tools [--workspace <path>] policy sync [--config <path>]
agentic-tools [--workspace <path>] policy check [--config <path>]
agentic-tools [--workspace <path>] policy import-vscode [--config <path>]
agentic-tools [--workspace <path>] skills list [--from <source>]
agentic-tools [--workspace <path>] skills link <skill...> [--from <source>] [--to <repo> | --global] [--dry-run] [--force]
agentic-tools [--workspace <path>] skills sync [--config <path>] [--to <repo> | --global] [--dry-run] [--force]
agentic-tools [--workspace <path>] skills unlink <skill...> [--from <source>] [--to <repo> | --global] [--dry-run]
```

### Compatibility plan

- Keep `agents-policy`, `agents-policy-import-vscode`, and `skills-management` available as compatibility aliases during the transition.
- Treat `agentic-tools ...` as the canonical documentation surface for new repos, READMEs, and consumer-repo tasks.
- Keep the grouped CLI behavior aligned across Python and Node installs.

## For Developers

This README is the command spec for the merged CLI.

### Scope mapping

- `policy` owns sync, drift checking, and VS Code approval import for `.agents/policy.json`.
- `skills` owns listing, linking, syncing, and unlinking shared skills.

### Design rules

- The umbrella CLI should delegate to the existing feature implementations instead of duplicating policy or skills logic.
- The grouped CLI should return the same exit codes and error messages as the underlying feature commands where practical.
- The grouped CLI should preserve the existing standalone commands as thin compatibility wrappers.
- Python and Node should expose the same subcommand names and behavior.

### Focused validation

```sh
uv run python -m pytest src/agentic_tools/main_test.py -q
```

```sh
yarn test --runTestsByPath src/agentic_tools/main.test.mjs
```
