---
name: ref-sp-dev-repo-conventions
description: "How this agentic-tools repo is laid out and wired: the feature-first TypeScript CLI in src/, strict tsc, Jest, yarn scripts, .mts repo and skill scripts, the dist build, and the Python shim. Use when adding, moving, or validating code here."
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "repo-local"
  shareable-skills.reason: "Documents this repository's concrete TypeScript layout, build and packaging wiring, tooling commands, and the Python shim boundary."
---

# Repo Conventions

This repo's concrete layout, config, and commands. Portable defaults live in `ref-sp-js-typescript`
(typing, `.ts` vs `.mts`, direct Node execution), `ref-sp-dev-coding-patterns` (naming, control
flow, tests), and `ref-sp-dev-projects-architecture` (feature boundaries, shared code, product vs
scripts).

## Project context

- Language: strict TypeScript on Node >= 22, managed with Yarn 1. Runtime dependencies are `zod`
  (validation at every config boundary) and `json5` (config and settings files may carry comments).
  Ask before adding another.
- One implementation. The npm package `agentic-tools` ships the compiled CLI in `dist/` plus
  `.agents/skills`. A Python shim under `python/` ships the same CLI to Python projects.

## Top-level repo layout

```text
AGENTS.md                          # the only agent instruction file; no CLAUDE.md or GEMINI.md
.agents/skills/<skill>/SKILL.md    # skills (+ references/ assets/ evals/ scripts/)
.agents/config.json                # policy, skills, and plugin config
.agents/playground/  .agents/tasks/  .agents/retro/   # local workspaces (gitignored)
src/                               # the CLI, feature-first (see below)
scripts/*.mts                      # repo maintenance, run directly by Node, not shipped
python/                            # the Python shim: launcher module and hatch build hook
chat-assistants/                   # generated instructions for chat products
.claude-plugin/                    # generated plugin and marketplace manifests
dist/                              # tsc output for npm (gitignored, built by `prepare`)
```

## Source layout (feature-first)

```text
src/
  cli.ts              # bin entry: runs the dispatcher, sets the exit code
  cli/                # command table and dispatcher over node:util parseArgs
  core/<concern>.ts   # plumbing every feature uses: paths, fs, JSON and zod helpers, frontmatter, output
  <feature>/          # policy, skills, plugin, export; code and *.test.ts side by side
  test-support/       # fixtures for tests; never built or shipped
```

- A command group lives in its feature folder and is mounted in `src/cli/commands.ts`. Don't add
  another bin.
- Features take `cwd`, `home`, and an `Output` as arguments instead of reading `process.cwd()`,
  `os.homedir()`, or writing to stdout, so tests stay hermetic.
- Expected failures throw `ToolError` (`src/core/errors.ts`); the CLI prints the message and exits 1.
  Usage errors exit 2.
- Don't create `utils/` or `helpers/` folders: name the `core/<concern>` or the feature.
- No top-level `tests/` folder: `thing.ts` gets `thing.test.ts` beside it.

## TypeScript rules

- Erasable syntax only (`erasableSyntaxOnly`): no enums, namespaces, or parameter properties, so the
  same source runs under Node's type stripping, through Jest, and from the Python shim.
- Relative imports use the `.ts` extension; `tsc` rewrites them to `.js` in `dist/`
  (`rewriteRelativeImportExtensions`).
- `tsconfig.json` is strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` for
  `src/` and `scripts/`. `tsconfig.skills.json` checks skill scripts at plain `strict`, because they
  ship standalone to other repos. `tsconfig.build.json` emits `dist/`, without tests.
- Parse config and settings files with a zod schema through `parseWith` (`src/core/json.ts`), which
  reports the first issue with its field path.

## Scripts and skill scripts

- Repo maintenance scripts are `scripts/<name>.mts`, run with `node`, wired as yarn scripts. A
  user-facing capability belongs in a feature under `src/`, not in `scripts/`.
- Skill scripts are `.agents/skills/<skill>/scripts/<name>.mts`: standalone, Node built-ins only, no
  imports from `src/`. Node refuses to strip types under `node_modules`, so a skill script runs from
  a checkout, a global skills folder, or the Python shim's site-packages, but not from an npm install.
- Guard an entry point with `path.resolve(process.argv[1]) === import.meta.filename`, so tests can
  import the module.

## Packaging

- npm: `prepare` runs `tsc -p tsconfig.build.json`, so git installs (`github:swiftpostlabs/...`) build
  `dist/` themselves. `files` ships `dist/` and `.agents/skills`.
- Python: `pyproject.toml` builds a wheel through `python/hatch_build.py`, which stages `src/**/*.ts`
  (no tests), `package.json`, the runtime `node_modules`, and `.agents/skills` under
  `agentic_tools/js/`. The launcher runs `src/cli.ts` with Node from `nodejs-wheel-binaries`. The
  version is read from `package.json`. Build with `uv build --out-dir dist-python`; the default
  `dist/` is the npm build's.
- `package:agentic-tools` skill sources resolve from `node_modules`, then from the running package
  itself, which is how the shim finds its bundled skills.

## Testing

- Jest runs `.ts` through `jest.transform.mjs`, which calls Node's `stripTypeScriptTypes`. Import
  `describe`, `test`, and `expect` from `@jest/globals`.
- Use `src/test-support/fixtures.ts` for temp directories and skill fixtures; tests never touch the
  real home directory.
- Add at least one focused test for new non-trivial logic.

## Commands

- `yarn install`: install dependencies and build `dist/`.
- `yarn lint`: every drift check: policy files, plugin manifests, version files, projected
  chat-assistant instructions.
- `yarn typecheck`: `tsc` over `src/` and `scripts/`, then over skill scripts.
- `yarn test`: Jest. Pass paths to narrow it (`yarn test src/skills`).
- `yarn validate`: skill structure and sharing spec.
- `yarn cli <group> <command>`: run the CLI from source, e.g. `yarn cli policy sync`.
- `yarn release`: bump, changelog, and tag (`--release-as patch|minor|major`); see
  `./references/tooling.md`.

## Before finishing

While iterating, narrow tests to the touched feature. Before committing, run
`yarn lint && yarn typecheck && yarn test`, plus `yarn validate` when a skill changed, and commit
only if all pass. Read `./references/checklist.md` before finalizing a placement or packaging change.

## References

- `./references/tooling.md`: config files, the release flow, and the Python shim build in detail.
- `./references/checklist.md`: quick review pass on placement and packaging consistency.
