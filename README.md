# Agentic Tools

This project packages reusable agent workflows, shareable skills, and supporting automation for agent-oriented repositories. It includes:

- Shareable skill definitions under `.agents/skills/`
- A packaged skills-management CLI for listing, linking, and unlinking skills
- Test setup with pytest
- Linting setup with Black
- Typechecking setup with Pyright

## Requirements

- macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
or
- Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`

uv can manage Python versions directly. To install Python 3.13 via uv: `uv python install 3.13`

## Installation

```sh
uv sync
```

After this step you may want to close and reopen your terminal or IDE to ensure that the uv-managed virtual environment is activated correctly.

## Skills Management

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

Relative `from` paths resolve from the target repo root. Package sources use `package:<name>` and resolve by looking up the installed package location, then walking up to the repo's `.agents/skills` directory.

## Tests

```sh
uv run poe test
```

## Linting

```sh
uv run poe lint
```

## Typechecking

```sh
uv run poe typecheck
```
