# Agentic Tools

Reusable agent skills, plus the `agentic-tools` CLI that links them into other repositories and keeps
per-client agent policy files in sync.

## For Users

Use this repo when you want shared agent tooling in another repository instead of copying prompts,
skills, and policy glue by hand. It provides:

- Shareable skills under `.agents/skills/`.
- The `agentic-tools` CLI with `skills`, `policy`, `plugin`, and `export` command groups.

The CLI is written in TypeScript. Node repos install it from npm or GitHub; Python repos install a
thin Python package that bundles the same CLI with a Node runtime, the way `pyright` ships on PyPI,
so they need no Node install of their own.

### Install in another repo

A Python repo, with uv:

```sh
uv add --dev "agentic-tools @ git+https://github.com/swiftpostlabs/agentic-tools.git"
```

Building that install fetches the CLI's two npm dependencies from the npm registry once, using the
npm that ships with the bundled Node runtime.

A Node repo, with Yarn:

```sh
corepack enable
yarn add --dev github:swiftpostlabs/agentic-tools#<commit>
```

Pin a full commit SHA. Every commit of this package carries the same `version`, and Yarn classic
caches a GitHub dependency without a ref under one folder (`npm-agentic-tools-<version>`) for all
commits, so a machine that cached an older commit installs that copy whatever the lockfile says.
With the commit in the spec, each commit gets its own cache entry. To upgrade, change the commit and
run `yarn install`. A machine that already installed a stale copy needs
`yarn cache clean agentic-tools`, then removing `node_modules/agentic-tools` and
`yarn install --force`.

The commands below use `uv run agentic-tools`; in a Node repo, run `yarn agentic-tools` instead.

### Sync shared skills

Declare the skills you want in `.agents/config.json`:

```json
{
  "skills": {
    "sources": [
      {
        "from": "package:agentic-tools",
        "url": "https://github.com/swiftpostlabs/agentic-tools",
        "skills": ["ref-sp-agents-mr-wolf-persona", "ref-sp-agents-security", "ref-sp-dev-coding-patterns"]
      },
      {
        "from": "../another-skill-repo",
        "skills": ["ref-sp-js-react"]
      }
    ]
  }
}
```

Then link them:

```sh
uv run agentic-tools skills sync
```

- `package:agentic-tools` links to the installed copy: `node_modules/agentic-tools/.agents/skills`
  in a Node repo, the copy inside the Python package in a uv repo. Relative `from` paths resolve from
  the repo root.
- `sync` removes dead links and links no longer declared, reports missing skill names per source
  before changing anything, and regenerates `.agents/skills/.gitignore` so the links stay out of
  version control.
- A skill renamed upstream still resolves through the source's rename registry; `sync` rewrites the
  stored name in your config and prints a note.
- Only `public` and `organization` skills travel. A requested `repo-local` skill is reported and
  skipped.
- From a subdirectory, add `--workspace <repo-root>`.

`skills list`, `skills link <name>...` (with `--global` for `~/.agents/skills`), and
`skills unlink <name>...` cover one-off use. Every command takes `--help`.

### Manage agent policy

After adding or changing the `policy` section of `.agents/config.json`, regenerate the client files
(`.aiexclude`, `.claude/settings.json`, `.vscode/settings.json`):

```sh
uv run agentic-tools policy sync
```

`policy check` fails without writing when the generated files drifted, for CI and pre-commit use.
`policy import-vscode` copies approvals you made in VS Code back into the policy before syncing.

### Skill scripts

Some skills carry `.mts` scripts, run with `node <skill-dir>/scripts/<name>.mts` on Node 22.18 or
newer. Node refuses to strip types for files under `node_modules`, so run them from a checkout, from
a global skills folder, or from a uv install, not from a Yarn or npm install.

## For Developers

Requirements: Node 22.18 or newer and Yarn 1 (`corepack enable`). uv is needed only to build the
Python package.

```sh
yarn install    # dependencies, and builds dist/
yarn lint       # policy, plugin, version, and chat-assistant drift checks
yarn typecheck
yarn test
yarn validate   # skill structure and sharing spec, when a skill changed
```

Run the CLI from source with `yarn cli <group> <command>`, for example `yarn cli skills list`.

- `src/` holds the CLI, one folder per feature with tests beside the code. `scripts/` holds repo
  maintenance scripts as `.mts`. `python/` holds the Python launcher and its wheel build hook.
- `yarn assistants:build` regenerates `chat-assistants/*/instructions.md` from their templates; see
  [chat-assistants/README.md](chat-assistants/README.md).
- `yarn cli plugin sync` regenerates `.claude-plugin/` from the skills catalog.

### Releasing

`yarn release` bumps `package.json` and `VERSION` from the conventional commits since the last tag
(or `--release-as patch|minor|major`), regenerates the plugin manifests, prepends `CHANGELOG.md`,
commits, and tags `vX.Y.Z`. `yarn release:preview` shows what it would do. Pushing the tag runs
[release.yaml](.github/workflows/release.yaml), which publishes to npm with trusted publishing.

The PyPI job is disabled: the name `agentic-tools` on PyPI belongs to an unrelated project, so Python
repos install from GitHub until a distribution name is chosen. Build the Python package locally with
`uv build --out-dir dist-python`.
