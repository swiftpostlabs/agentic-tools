# src/features/export

`agentic-tools export build`: selects skills, bundles them into retrieval-sized files, and writes an
export for a chat assistant that cannot load skills itself. The generated assistant instructions
live under `chat-assistants/`.

## What it holds

- `export.command.ts`: the `build` sub-command. `--exclude` is repeatable.
- `build.ts`: the run, from options to written files or a dry-run plan.
- `config.ts`: presets and the optional export config file.
- `discovery.ts`: reads and flattens each skill with its `references/`.
- `planning.ts`: selection, bundling by domain, and enforcing the target's limits.
- `geminiGem.ts`: the Gemini Gem target's limits and rendering.
- `models.ts`: the shared types and word counts.

## Rules

- **A new target is a new `<target>.ts` file** with its limits and renderers, plus an entry in
  `exportTargets`; planning stays target-neutral.
- **Limits are data**, with their source noted beside them, so a product change is a one-line edit.
