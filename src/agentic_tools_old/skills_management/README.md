# Skills Management

This feature packages the CLI that lists, links, syncs, and unlinks skill folders across repositories using the repo's category and shareability metadata.

## For Users

Use `agentic-tools skills` when you want a repo to consume shared skills from another clone or from an installed package.

### Install And Sync Shared Skills

1. Install `agentic-tools` in the target repo.
2. Add a `skills` section to `.agents/config.json` with one or more configured sources.
3. Run the synced CLI from the package manager you installed with.

Python install example:

```sh
uv add --dev "agentic-tools @ git+https://github.com/swiftpostlab/agentic-tools.git"
uv run agentic-tools skills sync
```

Node install example:

```sh
corepack enable
yarn add --dev github:swiftpostlab/agentic-tools
yarn agentic-tools skills sync
```

Example config:

```json
{
 "skills": {
  "sources": [
   {
    "from": "package:agentic-tools",
    "skills": [
     "ref-agents-persona",
     "ref-coding-patterns",
     "ref-python"
    ]
   }
  ]
 }
}
```

When `from` uses `package:agentic-tools`, `sync` resolves the installed package in the current environment and links skill folders from the packaged skill tree shipped by that install, including Python virtual environments and Yarn-managed `node_modules` installs. The Node package is published as JavaScript/JSDoc ESM source, so installing from GitHub does not require a separate build step on modern Node.

### Key Behavior

- `sync` resolves both filesystem sources and installed package sources.
- `sync` removes dead destination links and obsolete linked skills that are no longer declared in `.agents/config.json` before relinking the configured set. Legacy `.agents/skills.json` files still work as a fallback.
- `sync` reports missing configured skills by source before changing anything.
- On Windows, directory-link creation falls back to junctions when symlink privileges are unavailable.

## For Developers

## Files

- `main.py` contains the Python manifest parsing, dependency resolution, path resolution, and CLI command handlers.
- `main_test.py` covers the focused Python linking behavior.
- `main.mjs` contains the Node manifest parsing, dependency resolution, path resolution, and CLI command handlers.
- `main.test.mjs` covers the focused Node CLI behavior through Jest.

## Canonical commands

- `uv run agentic-tools skills list`
- `uv run agentic-tools skills link <skill> --from <repo>`
- `uv run agentic-tools skills sync`
- `uv run agentic-tools skills unlink <skill> --from <repo>`

## Responsibilities

- read category and shareability metadata from skill frontmatter
- enforce `shareable-skills.visibility` and hard dependencies
- link skills into another repo or the global skills directory
- resolve package and filesystem sources for `.agents/config.json` skills sections and legacy `.agents/skills.json`
- fall back to a Windows directory junction when symlink creation is blocked

## Focused validation

```sh
uv run python -m pytest src/agentic_tools/skills_management/main_test.py -q
```

```sh
yarn test --runTestsByPath src/agentic_tools/skills_management/main.test.mjs
```
