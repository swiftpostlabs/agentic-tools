# Agentic Tools

This project packages reusable agent workflows, shareable skills, and supporting automation for agent-oriented repositories.

## For Users

Use this repo when you want to install shared agent tooling into another repository instead of copying prompts, skills, and policy glue by hand.

It provides:

- Shareable skill definitions under `.agents/skills/`
- A packaged `skills-management` CLI for listing, linking, syncing, and unlinking skills
- A packaged `agents-policy` CLI for syncing agent-specific policy files from `.agents/policy.json`

### Install In Another Repo

Python repos can install the package with uv:

```sh
uv add --dev "agentic-tools @ git+https://github.com/swiftpostlab/agentic-tools.git"
```

Node repos should prefer Yarn for Node-managed installs and commands:

```sh
corepack enable
yarn add --dev github:swiftpostlab/agentic-tools
```

Then declare which shared skills you want in `.agents/skills.json`:

```json
{
  "sources": [
    {
      "from": "package:agentic-tools",
      "skills": [
        "ref-agents-persona",
        "ref-agents-security",
        "ref-coding-patterns",
        "ref-python"
      ]
    }
  ]
}
```

Sync the configured skills into the current repo:

```sh
uv run skills-management sync
```

Or, in a Node-managed repo:

```sh
yarn skills-management sync
```

When the source uses `package:agentic-tools`, the linked skill directories come from the installed package location in the current environment, such as `.venv` for Python installs or `node_modules/agentic-tools/.agents/skills` for Node installs.

The Node package ships native TypeScript ESM source, so installing it from GitHub works without a separate build step on modern Node.

### Manage Agent Policy

After adding or updating `.agents/policy.json`, sync the generated agent files with:

```sh
uv run agents-policy
```

Or, in a Node-managed repo:

```sh
yarn agents-policy
```

### Focused Docs

- Skills management: [src/agentic_tools/skills_management/README.md](src/agentic_tools/skills_management/README.md)
- Agents policy: [src/agentic_tools/agents_policy/README.md](src/agentic_tools/agents_policy/README.md)

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
corepack yarn install
```

After this step you may want to close and reopen your terminal or IDE to ensure that the uv-managed virtual environment is activated correctly.

The Node CLI source now lives with the owning features under `src/agentic_tools/<feature>/main.ts`, with colocated Jest coverage in `main.test.ts`.

### Skills Management

```sh
uv run skills-management list
```

```sh
uv run skills-management sync
```

`sync` also removes dead skill links already present in the destination `.agents/skills` directory and reports configured skill names that are missing from a source before changing anything.

To declare shared skill sources for `sync`, add `.agents/skills.json` to the target repo:

```json
{
  "sources": [
    {
      "from": "package:agentic-tools",
      "skills": [
        "ref-skills-authoring",
        "ref-projects-architecture",
        "ref-coding-patterns"
      ]
    },
    {
      "from": "../another-skill-repo",
      "skills": [
        "ref-js-react"
      ]
    }
  ]
}
```

Relative `from` paths resolve from the target repo root. Package sources use `package:<name>` and resolve by looking up the installed package location. When the source package is installed instead of cloned, `skills-management sync` resolves packaged skills from the active environment, including the Python package's `agentic_tools/shareable_skills` directory and the Node package's `.agents/skills` directory.

### Tests

```sh
uv run poe test
```

```sh
corepack yarn test:node
```

### Linting

```sh
uv run poe lint
```

### Typechecking

```sh
uv run poe typecheck
```
