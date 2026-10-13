# Tooling and Packaging

The detail behind the summary in `../SKILL.md`. Load it when changing a config file, the build, the
release flow, or the Python shim.

## Config files

| File | Owns |
| --- | --- |
| `package.json` | Version source, runtime and dev dependencies, the `agentic-tools` bin (`dist/cli.js`), yarn scripts, the npm `files` list |
| `tsconfig.json` | Strict type-check of `src/` and `scripts/`; no emit |
| `tsconfig.build.json` | Emits `dist/` from `src/`, excluding `*.test.ts` and `testFixtures.ts` |
| `tsconfig.skills.json` | Type-check of skill scripts and `.mts` assets at plain `strict` |
| `jest.config.mjs`, `jest.transform.mjs` | Jest over `src/`, `scripts/`, and `.agents/skills`, stripping types with Node |
| `.versionrc.json` | `commit-and-tag-version`: bump files, changelog header, the plugin-sync hook |
| `pyproject.toml`, `python/` | The Python shim: metadata, version from `package.json`, the wheel build hook |
| `VERSION` | The version the plugin manifests and the release workflow read |

## Versions and release

- `package.json` and `VERSION` carry the version. `scripts/checkVersionDrift.mts` (in `yarn lint`)
  fails when they disagree, and also checks a static `pyproject.toml` version if one is ever added.
- `yarn release` runs `commit-and-tag-version`: it picks the bump from conventional commits (or
  `--release-as patch|minor|major`), updates `package.json` and `VERSION`, regenerates
  `.claude-plugin/` with `plugin sync`, prepends `CHANGELOG.md`, commits, and tags `vX.Y.Z`.
  Run it on a clean tree: the release commit includes every staged change. `yarn release:preview`
  is the dry run.
- Pushing the tag runs `.github/workflows/release.yaml`: verify the tag against `VERSION`, then
  publish to npm. The PyPI job stays disabled until the shim's distribution name is settled; the
  name `agentic-tools` on PyPI belongs to an unrelated project.

## The Python shim

- `pyproject.toml` names the distribution `agentic-tools`, so Python repos keep
  `agentic-tools @ git+https://github.com/swiftpostlabs/agentic-tools.git` as their dependency and run
  `uv run agentic-tools ...`.
- `python/hatch_build.py` stages the wheel payload. Runtime npm dependencies are copied from
  `node_modules` when the checkout has them, otherwise installed at their `yarn.lock` versions with the
  npm from `nodejs-wheel-binaries`, a build requirement. A uv git install therefore needs network
  access to the npm registry once per built version.
- `python/agentic_tools/__main__.py` runs `js/src/cli.ts` with that package's Node. It holds no logic
  beyond the launch; behaviour changes belong in `src/`.
- CI builds the wheel from a checkout without `node_modules` and runs it, which is the uv git-install
  path.

## Common tasks

- **New command**: add the handler in its feature, a `CommandSpec` in `src/cli/commands.ts`, and a
  test that calls the handler with a captured `Output`.
- **New config field**: extend the feature's zod schema; reading and validation stay in one place.
- **New runtime dependency**: ask first. It lands in `dependencies`, and the shim's build hook picks it
  up from `package.json` with no further change.
- **New repo script**: `scripts/<name>.mts`, a yarn script for it, and a `<name>.test.mts` beside it.
