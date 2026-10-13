# scripts

Repo maintenance, run directly by Node and wired as yarn scripts. Nothing here ships.

- `checkVersionDrift.mts`: fails when `package.json`, `VERSION`, and the plugin manifests disagree.
  Part of `yarn lint`.
- `projectAssistantInstructions.mts`: renders `chat-assistants/*/instructions.md` from their
  templates (`yarn assistants:build`), or checks them (`--check`, part of `yarn lint`).
- `checkRuntimeParity.mts`: runs the CLI, repo scripts, and skill scripts under Node and Bun and
  fails on any difference (`yarn check:runtimes`, CI's `bun_parity` job). Commands that read a
  workspace by convention run from a fixture directory.

## Rules

- **`.mts`, camelCase, with a `<name>.test.mts` beside each.** Guard the entry point with
  `path.resolve(process.argv[1]) === import.meta.filename` so tests can import the module.
- **A user-facing capability belongs in a feature under `src/features/`**, not here.
