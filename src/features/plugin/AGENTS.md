# src/features/plugin

`agentic-tools plugin <sync|check>`: generates `.claude-plugin/plugin.json` and
`marketplace.json` from the skills catalog and the `plugin` section of `.agents/config.json`, and
fails when the committed files drift. Manifest formats and publishing are
`ref-sp-agents-plugin-marketplaces`.

## What it holds

- `plugin.command.ts`: `sync` writes the manifests, `check` reports drift and exits 1.
- `manifests.ts`: builds both manifests, enumerating only skills whose visibility is published.

## Rules

- **The manifests are generated, never hand-edited.** `yarn lint` runs `plugin check`.
- **The version stays out of the marketplace entry**, so it cannot mask `plugin.json`'s.
