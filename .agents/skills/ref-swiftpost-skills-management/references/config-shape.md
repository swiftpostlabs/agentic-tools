# Config Shape

## Expected file location

- Default repo-local config path: `.agents/skills.json`
- `sync --global` requires an explicit `--config`

## JSON structure

```json
{
  "sources": [
    {
      "from": "../shared-skills-repo",
      "skills": [
        "ref-skills-authoring",
        "ref-projects-architecture",
        "ref-coding-patterns"
      ]
    },
    {
      "from": "package:agentic-tools",
      "skills": [
        "ref-github-actions-ci"
      ]
    }
  ]
}
```

## Resolution rules

- Relative `from` values resolve from the repo root inferred from the config file location.
- Absolute `from` values are used directly.
- `package:<name>` values resolve by locating the installed package module and walking upward until a repo root with `.agents/skills` is found.
- A configured skill name may appear only once across all sync sources.

## Practical use

- Use sibling repo paths for local side-by-side development.
- Use `package:agentic-tools` when the source repo is installed into the consumer environment.
- Keep the skill list explicit rather than syncing an entire repo by default.
