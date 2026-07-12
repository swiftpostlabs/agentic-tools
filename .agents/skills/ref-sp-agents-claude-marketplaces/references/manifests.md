# Manifests: `plugin.json` and `marketplace.json`

Load this when writing or debugging either manifest. Examples use synthetic names
(`acme/agent-skills`, plugin `acme-skills`).

## Where files go

```text
<repo root>/                     # marketplace root AND plugin root, in the simplest layout
├── .claude-plugin/
│   ├── plugin.json              # the plugin manifest   (ONLY this file goes in here)
│   └── marketplace.json         # the marketplace catalog
├── skills/                      # default skills location, scanned automatically…
└── any/other/dir/               # …or point `skills` at wherever they already live
```

Component directories (`skills/`, `agents/`, `commands/`, `hooks/`, `output-styles/`) **must be at
the plugin root, not inside `.claude-plugin/`**. Skills silently fail to appear if you nest them there.

## `plugin.json`

The manifest is **optional**. Without it, components are auto-discovered in default locations and the
plugin name comes from the directory name. Use it when you need metadata or custom component paths.
If present, `name` is the only required field.

```jsonc
{
  "name": "acme-skills",              // required; kebab-case. Namespaces components: /acme-skills:<skill>
  "displayName": "Acme Skills",       // UI only; not used for lookup
  "version": "1.4.0",                 // see references/releasing.md — omit for SHA-based versioning
  "description": "Acme's shared agent skills.",
  "author": { "name": "Acme", "email": "eng@acme.example", "url": "https://acme.example" },
  "homepage": "https://acme.example/skills",
  "repository": "https://github.com/acme/agent-skills",
  "license": "MIT",
  "keywords": ["skills", "conventions"],

  "skills": ["./.agents/skills/ref-acme-dev-testing", "./.agents/skills/ref-acme-py-python"],

  // other component types, out of scope for skill distribution:
  "commands": ["./custom/commands/special.md"],
  "agents": ["./custom/agents/reviewer.md"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json"
}
```

### Path behavior rules

- All paths are **relative to the plugin root** and **must start with `./`**.
- Arrays are allowed anywhere a path is.
- **`skills` adds to the default scan.** `skills/` is always scanned; listed paths load alongside it.
  - **Exception:** for a marketplace entry whose `source` resolves to the **marketplace root**,
    listed subdirectories **replace** the default scan. The listed paths are then the complete set.
    Listing `./skills/` itself, or the plugin root, keeps the full scan. If none of the listed paths
    exist, the default scan runs instead.
- **`commands`, `agents`, `outputStyles` replace the default** instead. To keep the default and add
  more, list it explicitly: `"commands": ["./commands/", "./extras/"]`.
- A `skills` path pointing at a directory that contains a `SKILL.md` **directly** (e.g. `["./"]`)
  loads that as a single skill, named by its frontmatter `name`. A path pointing at a directory of
  skill directories loads each child as a skill.
- Recent Claude Code versions warn in `claude plugin list` when a default folder exists but is ignored
  because the manifest overrides it.

### Unrecognized fields are ignored

Claude reads only `name`, `description`, and `disable-model-invocation` from a `SKILL.md`'s
frontmatter. Any other `metadata.*` keys — a repo's ownership, domain, visibility, or dependency
metadata — pass through untouched. Publishing does not require stripping them.

## `marketplace.json`

```jsonc
{
  "name": "acme",                     // marketplace name
  "owner": { "name": "Acme", "email": "eng@acme.example" },
  "metadata": {
    "description": "Acme's plugin catalog",
    "version": "1.0.0",               // catalog version, distinct from plugin versions
    "pluginRoot": "./plugins"         // optional: base dir prepended to relative plugin sources
  },
  "plugins": [
    {
      "name": "acme-skills",          // what users install; keys enabledPlugins
      "source": "./",                 // this repo IS the plugin — see source types below
      "description": "Acme's shared agent skills.",
      "category": "productivity",
      "keywords": ["skills"],
      "skills": [                     // with a marketplace-root source, this is the COMPLETE set
        "./.agents/skills/ref-acme-dev-testing",
        "./.agents/skills/ref-acme-py-python"
      ]
    }
  ],
  "renames": { "old-plugin-name": "acme-skills" }   // migrate existing users on rename; null = removed
}
```

A plugin entry may carry **any field from the plugin manifest schema** (`description`, `version`,
`author`, `commands`, `hooks`, …) plus marketplace-only fields: `source`, `category`, `tags`,
`strict`, `relevance`, `defaultEnabled`, `displayName`.

### `source` types

| Type | Shape | Notes |
| --- | --- | --- |
| Relative path | `"./my-plugin"` | Resolved against the **marketplace root** (the dir containing `.claude-plugin/`), not against `.claude-plugin/` itself. Must start with `./`. Never `../`. |
| `github` | `{ "source": "github", "repo": "acme/p", "ref"?, "sha"? }` | |
| `url` | `{ "source": "url", "url": "https://…", "ref"?, "sha"? }` | Any git URL; `.git` suffix optional. |
| `git-subdir` | `{ "source": "git-subdir", "url", "path", "ref"?, "sha"? }` | Sparse clone; good for monorepos. |
| `npm` | `{ "source": "npm", "package": "@acme/p", "version"?, "registry"? }` | Installed with `npm install`. Supports ranges (`^2.0.0`) and private registries. |

- `ref` = branch or tag; `sha` = full 40-char commit. When both are set, **`sha` wins**.
- The **marketplace** source (how users add the catalog) supports `ref` but **not** `sha`. An
  individual **plugin** source supports both.
- **Relative paths do not resolve in URL-distributed marketplaces.** If users add the marketplace via a
  direct URL to `marketplace.json`, only that one file is downloaded, so `"./…"` has nothing to resolve
  against. Use `github`, `url`, or `npm` sources for URL-based distribution.

### `strict` mode

Controls whether `plugin.json` is the authority for component definitions.

| Value | Behavior |
| --- | --- |
| `true` (default) | `plugin.json` is authoritative. The marketplace entry may **supplement** it; both merge. |
| `false` | The marketplace entry is the **entire** definition. If the plugin also has a `plugin.json` that declares components, **that is a conflict and the plugin fails to load.** |

Use `strict: true` when the plugin owns itself and should also be installable directly. Use
`strict: false` when the marketplace operator wants full control and the plugin repo just supplies raw
files. Do not straddle the two.
