# Agentic Tools

This project packages reusable agent workflows, shareable skills, and supporting automation for agent-oriented repositories.

## For Users

Use this repo when you want to install shared agent tooling into another repository instead of copying prompts, skills, and policy glue by hand.

It provides:

- Shareable skill definitions under `.agents/skills/`
- A packaged `skills-management` CLI for listing, linking, syncing, and unlinking skills
- A packaged `agents-policy` CLI for syncing agent-specific policy files from `.agents/policy.json`

### Install In Another Repo

Install the package as a development dependency:

```sh
uv add --dev "agentic-tools @ git+https://github.com/swiftpostlab/agentic-tools.git"
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

When the source uses `package:agentic-tools`, the linked skill directories come from the installed package inside the current repo's `.venv`.

### Manage Agent Policy

After adding or updating `.agents/policy.json`, sync the generated agent files with:

```sh
uv run agents-policy
```

### Focused Docs

- Skills management: [src/agentic_tools/skills_management/README.md](src/agentic_tools/skills_management/README.md)
- Agents policy: [src/agentic_tools/agents_policy/README.md](src/agentic_tools/agents_policy/README.md)

## Requirements

- macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
or
- Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`

uv can manage Python versions directly. To install Python 3.13 via uv: `uv python install 3.13`

## For Developers

### Local Setup

```sh
uv sync
```

After this step you may want to close and reopen your terminal or IDE to ensure that the uv-managed virtual environment is activated correctly.

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

Relative `from` paths resolve from the target repo root. Package sources use `package:<name>` and resolve by looking up the installed package location. When the source package is installed instead of cloned, `skills-management sync` resolves the packaged skills under `agentic_tools/shareable_skills` inside the environment and links from there.

### Tests

```sh
uv run poe test
```

### Linting

```sh
uv run poe lint
```

### Typechecking

```sh
uv run poe typecheck
```
