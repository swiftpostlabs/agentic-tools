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

- Language: strict TypeScript on Node >= 24 (`engines`), managed with Yarn 1. Runtime dependencies are `citty`
  (commands and help), `consola` (output), `zod` (validation at every config boundary), and `json5`
  (config and settings files may carry comments). Ask before adding another.
- One implementation. The npm package `agentic-tools` ships the compiled CLI in `dist/` plus
  `.agents/skills`. A Python shim under `python/` ships the same CLI to Python projects.

## Top-level repo layout

```text
AGENTS.md                          # the only agent instruction file; no CLAUDE.md or GEMINI.md
.agents/skills/<skill>/SKILL.md    # skills (+ references/ assets/ evals/ scripts/)
.agents/config.json                # policy, skills, and plugin config
.agents/playground/  .agents/tasks/  .agents/retro/   # local workspaces (gitignored)
src/                               # the CLI, feature-first (see below)
scripts/<name>.mts                 # repo maintenance, run directly by Node, not shipped
python/                            # the Python shim: launcher module and hatch build hook
chat-assistants/                   # generated instructions for chat products
.claude-plugin/                    # generated plugin and marketplace manifests
dist/                              # tsc output for npm (gitignored, built by `prepare`)
```

## Source layout (feature-first)

```text
src/
  core/
    cli.mts             # run-only bin entry → dist/core/cli.mjs
    program.ts          # runCli: mounts each feature's command, --workspace, help, exit codes
    command.ts          # CommandContext, defineStrictCommand, repeatedOption
    <concern>.ts        # plumbing every feature uses: errors, output, paths, fs, json, frontmatter
    testFixtures.ts     # test fixtures; never built or shipped
  features/
    <feature>/          # policy, skills, plugin, export
      <feature>.command.ts   # the citty command group
      <concern>.ts           # the feature's logic, with <concern>.test.ts beside it
```

- Each folder's rules are in its nested `AGENTS.md` (`src/`, `src/core/`, `src/features/`, each
  feature, `scripts/`); this skill gives the overview they share.
- A command group is `features/<feature>/<feature>.command.ts`, mounted with one line in
  `src/core/program.ts`. Don't add another bin.
- Features take a `CommandContext` (`cwd`, `home`, `output`, `setExitCode`) instead of reading
  `process.cwd()`, `os.homedir()`, or writing to stdout, so tests stay hermetic.
- Expected failures throw `ToolError` and exit 1; `UsageError` and citty's parse errors exit 2.
- File and folder names are camelCase and say what they hold. Don't create `utils/` or `helpers/`:
  name the `core/<concern>` or the feature.
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

## Lint and format

- `eslint.config.mjs` uses typescript-eslint `strictTypeChecked` with Prettier as the
  `prettier/prettier` rule, its options inline (`singleQuote`, `experimentalTernaries`) and no
  `.prettierrc`. This matches the repo's other TypeScript projects.
- Skill scripts lint against `tsconfig.skills.json`, where `no-unnecessary-condition` is off because
  that config leaves `noUncheckedIndexedAccess` off.
- `.git-blame-ignore-revs` lists mechanical reformat commits; set
  `git config blame.ignoreRevsFile .git-blame-ignore-revs` once per clone.

## Scripts and skill scripts

- Repo maintenance scripts are `scripts/<camelCaseName>.mts`, run with `node`, wired as yarn scripts. A
  user-facing capability belongs in a feature under `src/`, not in `scripts/`.
- Skill scripts are `.agents/skills/<skill>/scripts/<name>.mts`: standalone, Node built-ins only, no
  imports from `src/`. Node refuses to strip types under `node_modules`, so under Node a skill script
  runs from a checkout, a global skills folder, or the Python shim's site-packages, but not from an
  npm install. Bun has no such restriction.
- Guard an entry point with `path.resolve(process.argv[1]) === import.meta.filename`, so tests can
  import the module.

## Runtimes

- Node is the declared runtime (`engines`, the npm `bin`, the Python shim). Bun runs the same source
  unchanged; the rules that keep it so are in root `AGENTS.md` (Node and Bun).
- `scripts/checkRuntimeParity.mts` runs a fixed list of deterministic commands under both runtimes
  and compares stdout, stderr, and exit code. CI's `bun_parity` job runs it and `bun test`, with
  Bun pinned in the workflow.

## Packaging

- npm: `prepare` runs `tsc -p tsconfig.build.json`, so git installs (`github:swiftpostlabs/...`) build
  `dist/` themselves. `files` ships `dist/` and `.agents/skills`.
- Python: `pyproject.toml` builds a wheel through `python/hatch_build.py`, which stages `src/**/*.ts`
  (no tests), `package.json`, the runtime `node_modules`, and `.agents/skills` under
  `agentic_tools/js/`. The launcher runs `src/core/cli.mts` with Node from `nodejs-wheel-binaries`. The
  version is read from `package.json`. Build with `uv build --out-dir dist-python`; the default
  `dist/` is the npm build's.
- `package:agentic-tools` skill sources resolve from `node_modules`, then from the running package
  itself, which is how the shim finds its bundled skills.

## Testing

- Jest runs `.ts` through `jest.transform.mjs`, which calls Node's `stripTypeScriptTypes`. Import
  `describe`, `test`, and `expect` from `@jest/globals`; `bun test` runs the same files unchanged.
  It skips dot directories, so `yarn test:bun` names `./.agents/skills` explicitly.
- Use `src/core/testFixtures.ts` for temp directories and skill fixtures; tests never touch the
  real home directory.
- Add at least one focused test for new non-trivial logic.

## Commands

- `yarn install`: install dependencies and build `dist/`.
- `yarn lint`: ESLint with Prettier, then every drift check: policy files, plugin manifests, version
  files, projected chat-assistant instructions. `yarn lint:fix` applies fixes;
  `yarn check:generated` runs only the drift checks.
- `yarn typecheck`: `tsc` over `src/` and `scripts/`, then over skill scripts.
- `yarn test`: Jest. Pass paths to narrow it (`yarn test src/features/skills`).
- `yarn validate`: skill structure and sharing spec.
- `yarn test:bun`, `yarn check:runtimes`: the suite under Bun, and the Node/Bun output comparison.
  Both need Bun on `PATH`.
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
