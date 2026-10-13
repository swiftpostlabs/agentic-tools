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

- **Gemini Gem is the only target, and `build.ts` calls `geminiGem.ts` directly.** A second
  target needs a `<target>.ts` with its limits and renderers, an entry in `exportTargets`, and
  `build.ts` choosing limits and renderers by target instead of importing Gemini's; until then
  an entry in `exportTargets` alone would plan and render with Gemini's. Planning
  (`planning.ts`) takes limits as an argument and stays target-neutral.
- **Limits are data**, with their source noted beside them, so a product change is a one-line edit.
