# Agentic Tools

This project packages reusable agent workflows, shareable skills, and supporting automation for agent-oriented repositories.

## For Users

Use this repo when you want to install shared agent tooling into another repository instead of copying prompts, skills, and policy glue by hand.

It provides:

- Shareable skill definitions under `.agents/skills/`
- A packaged `agentic-tools` CLI with grouped `skills` and `policy` scopes

### Install In Another Repo

Python repos can install the package with uv:

```sh
uv add --dev "agentic-tools @ git+https://github.com/swiftpostlabs/agentic-tools.git"
```

Node repos should prefer Yarn for Node-managed installs and commands:

```sh
corepack enable
yarn add --dev github:swiftpostlabs/agentic-tools
```

Then declare which shared skills you want in `.agents/config.json`:

```json
{
  "skills": {
    "sources": [
      {
        "from": "package:agentic-tools",
        "url": "https://github.com/swiftpostlabs/agentic-tools",
        "skills": [
          "ref-sp-agents-persona",
          "ref-sp-agents-security",
          "ref-sp-dev-coding-patterns",
          "ref-sp-py-python"
        ]
      }
    ]
  }
}
```

Sync the configured skills into the current repo:

```sh
uv run agentic-tools skills sync
```

If you run the command from a subdirectory, add `--workspace <repo-root>` so the grouped CLI resolves policy and skills paths from the intended repo root.

Or, in a Node-managed repo:

```sh
yarn agentic-tools skills sync
```

When the source uses `package:agentic-tools`, the linked skill directories come from the installed package location in the current environment, such as `.venv` for Python installs or `node_modules/agentic-tools/.agents/skills` for Node installs.

The Node package ships JavaScript/JSDoc ESM source, so installing it from GitHub works without a separate build step on modern Node.

### Manage Agent Policy

After adding or updating the `policy` section in `.agents/config.json`, sync the generated agent files with:

```sh
uv run agentic-tools policy sync
```

To enforce that generated policy files are already in sync during CI or before committing, run:

```sh
uv run agentic-tools policy check
```

Or, in a Node-managed repo:

```sh
yarn agentic-tools policy sync
```

### Focused Docs

- Skills management: [src/agentic_tools_old/skills_management/README.md](src/agentic_tools_old/skills_management/README.md)
- Agents policy: [src/agentic_tools_old/agents_policy/README.md](src/agentic_tools_old/agents_policy/README.md)

## Requirements

- macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
or
- Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`

uv can manage Python versions directly. To install Python 3.13 via uv: `uv python install 3.13`

For Node-based usage, use Node.js 22 or newer. Prefer Yarn for Node-managed installs and command execution. Deno-owned repos should keep using Deno's native tooling instead of adding Yarn just for this package.

## For Developers

### Local Setup

```sh
uv sync
```

```sh
yarn install
```

After this step you may want to close and reopen your terminal or IDE to ensure that the uv-managed virtual environment is activated correctly.

The Node CLI source is a no-build JavaScript/JSDoc port that lives with the owning features under `src/agentic_tools/<feature>/main.mjs`, with colocated Jest coverage in `main.test.mjs`.
The shipped Node command shim is `scripts/agentic-tools.mjs`; feature-specific CLIs route through the grouped `agentic-tools` command instead of standalone package bins.

### Skills Management

```sh
uv run agentic-tools skills list
```

```sh
uv run agentic-tools skills sync
```

`sync` also removes dead skill links and linked skills that are no longer declared in the destination `.agents/config.json`, then reports configured skill names that are missing from a source before changing anything. Legacy `.agents/skills.json` files still work as a fallback.

If a configured skill name was renamed upstream, `sync` resolves it through the source's rename registry, rewrites the stored name in your config to the current one, and prints a note — so a renamed skill keeps working without manual edits. After linking, `sync` (re)generates `.agents/skills/.gitignore` so the synced skill symlinks stay out of version control.

To declare shared skill sources for `sync`, add a `skills` section to `.agents/config.json` in the target repo. Each source may carry an optional `url` recording the repository the skills come from; sync lists those URLs in the generated `.gitignore`:

```json
{
  "skills": {
    "sources": [
      {
        "from": "package:agentic-tools",
        "url": "https://github.com/swiftpostlabs/agentic-tools",
        "skills": [
          "ref-sp-agents-skills-authoring",
          "ref-sp-dev-projects-architecture",
          "ref-sp-dev-coding-patterns"
        ]
      },
      {
        "from": "../another-skill-repo",
        "skills": [
          "ref-sp-js-react"
        ]
      }
    ]
  }
}
```

Relative `from` paths resolve from the target repo root. Package sources use `package:<name>` and resolve by looking up the installed package location. When the source package is installed instead of cloned, `agentic-tools skills sync` resolves packaged skills from the active environment, including the Python package's `agentic_tools/shareable_skills` directory and the Node package's `.agents/skills` directory.

### Versioning

The repo keeps `VERSION`, `pyproject.toml`, `package.json`, and `uv.lock` aligned.

Commitizen is the intended release owner for the repo's stable release workflow. The local helper script now remains only as a drift check while the migration away from custom version-writing commands settles.

Use these commands for version management:

```sh
uv run poe version-check
```

```sh
uv run cz commit
```

```sh
uv run poe version-next
```

```sh
uv run poe release-prepare-preview patch
```

```sh
uv run poe release-prepare patch
```

```sh
uv run poe release-publish-python
```

```sh
uv run poe release-publish-node
```

```sh
uv run poe release-publish
```

```sh
uv run cz check -m "fix(skills): example"
```

`release-prepare` is the normal release-prep command. It creates the release commit, updates `CHANGELOG.md`, and creates a `vX.Y.Z` tag through Commitizen.

`release-publish` is the local fallback when you already have publish credentials configured. The preferred path is to push the generated release tag and let [release.yaml](.github/workflows/release.yaml) publish both the Python and npm packages from CI.

There is still one manual bootstrap step: the current `0.1.0` baseline needs a matching `v0.1.0` tag before changelog-on-bump works cleanly for future releases. After that bootstrap tag exists, the normal workflow is `uv run poe release-prepare <major|minor|patch>` followed by pushing the resulting commit and tag.

For CI publishing, configure trusted publishing for both registries against [release.yaml](.github/workflows/release.yaml): PyPI should trust the workflow as a publisher for `agentic-tools`, and npm should register the same workflow filename as the package's trusted publisher.

### Tests

```sh
uv run poe test
```

```sh
yarn test
```

### Linting

```sh
uv run poe lint
```

```sh
yarn lint
```

```sh
yarn typecheck
```

This now includes `uv run agentic-tools policy check` before the Python lint step so generated policy files fail fast in the standard validation flow.

### Typechecking

```sh
uv run poe typecheck
```
