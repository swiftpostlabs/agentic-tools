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
      },
      {
        "from": "github:swiftpostlabs/agentic-tools",
        "ref": "v0.2.0",
        "skills": [
          "ref-sp-agents-verification-discipline"
        ]
      }
    ]
  }
}
```

## Resolution rules

- Relative `from` values resolve from the destination repo root.
- Absolute `from` values are used directly.
- `package:<name>` values resolve to `node_modules/<name>` in the config's repo or any parent directory, then to the running `agentic-tools` package itself, which is how the Python shim finds its bundled skills. Other Python packages are not searched.
- `git:<url>` takes any URL git accepts over https, http, ssh, git, or file, including `git@host:owner/repo`. `github:<owner>/<repo>` is short for `git:https://github.com/<owner>/<repo>.git`.
- A URL carrying credentials (a password, or any user name on http and https) is refused: it would land in the lock and in messages. Let git's credential helper or SSH key supply them.
- `ref` is allowed only on a git source: a tag, branch, or commit name, never a revision expression such as `main~1` or `HEAD`. Each git source may appear only once.
- A configured skill name may appear only once across all sync sources.

## Lock file

One lock per config, committed: `.agents/config.json` (or the legacy `.agents/skills.json`) pins in `.agents/agentic-tools.lock`, and any other config `<name>.json` in `<name>.lock` beside it, so syncing one config never rewrites another's pins. One entry per git source, keyed by its `from`:

```json
{
  "version": 1,
  "sources": {
    "github:swiftpostlabs/agentic-tools": {
      "ref": "v0.2.0",
      "commit": "<full 40-character commit sha>"
    }
  }
}
```

- `sync` keeps an entry while its `ref` matches the config, and resolves the ref again when it does not.
- `sync --locked` fails rather than change the file; `update` rewrites the entries it updates.
- Exports of this lock's sources in `.agents/local/sources/` that it no longer pins are removed by the next `sync`; another config's exports are left alone. The folder carries its own `.gitignore`.
- A sync that fails removes the exports it wrote; the shared bare clones are a cache and may have been fetched.

## Practical use

- Use sibling repo paths for local side-by-side development.
- Use `package:agentic-tools` when the source repo is installed into the consumer environment.
- Keep the skill list explicit rather than syncing an entire repo by default.
- During `sync`, missing configured skill names are reported by source before any linking happens.
- During `sync`, dead links already present under the destination `.agents/skills` directory are cleaned up before the configured skills are linked.
