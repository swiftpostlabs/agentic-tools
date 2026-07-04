# Config Shape

## Expected file location

- Default repo-local config path: `.agents/config.json`
- Legacy fallback path: `.agents/skills.json`
- `sync --global` requires an explicit `--config`

## JSON structure

```json
{
  "skills": {
    "sources": [
      {
        "from": "../shared-skills-repo",
        "skills": [
          "ref-sp-agents-skills-authoring",
          "ref-sp-dev-projects-architecture",
          "ref-sp-dev-coding-patterns"
        ]
      },
      {
        "from": "package:agentic-tools",
        "skills": [
          "ref-sp-dev-github-actions-ci"
        ]
      }
    ]
  }
}
```

## Resolution rules

- Relative `from` values resolve from the destination repo root.
- Absolute `from` values are used directly.
- `package:<name>` values resolve by locating the installed package module and walking upward until a repo root with `.agents/skills` is found.
- A configured skill name may appear only once across all sync sources.

## Practical use

- Use sibling repo paths for local side-by-side development.
- Use `package:agentic-tools` when the source repo is installed into the consumer environment.
- Keep the skill list explicit rather than syncing an entire repo by default.
- During `sync`, missing configured skill names are reported by source before any linking happens.
- During `sync`, dead links already present under the destination `.agents/skills` directory are cleaned up before the configured skills are linked.
