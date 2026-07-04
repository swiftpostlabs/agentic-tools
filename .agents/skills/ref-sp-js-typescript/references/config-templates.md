# Config Templates

Use these when the task needs concrete TypeScript project configuration rather than only structural advice.

## When to load this file

- The user asks for a `tsconfig` example or starter template.
- The repo mixes Node scripts, browser modules, and userscripts and needs separate project files.
- The task is about `.ts` versus `.mts` placement or how config globs should follow those file extensions.

## Available templates

- `./assets/web-pages-tsconfig.base.template.json` — base options copied from `web-pages/tsconfig.base.json`. This is a mixed web-oriented base and includes `allowJs` plus `verbatimModuleSyntax`.
- `./assets/web-pages-tsconfig.node-scripts.template.json` — copied from `web-pages/tsconfig.json` for Node ESM scripts such as `scripts/*.mts` and `scripts/*.ts`.
- `./assets/web-pages-tsconfig.web.template.json` — copied from `web-pages/tsconfig.web.json` for browser modules such as `src/features/**/*.js` and `src/features/**/*.mjs`.
- `./assets/web-pages-tsconfig.userscripts.template.json` — copied from `web-pages/tsconfig.userscripts.json` for `*.user.js`, `*.user.ts`, and related declaration files.

## Adaptation rules

- Treat these as starting points, not drop-in defaults for every repo.
- Keep the file-extension globs aligned with the actual runtime surface. If the repo uses `.mts` for Node-run ESM scripts, include them explicitly. If it uses only `.ts`, remove the unused globs instead of keeping noise.
- If the repo does not mix Deno with the same TypeScript base settings, remove `deno.ns` or split that concern into a Deno-specific config.
- If userscripts are TypeScript-authored, keep a separate userscripts project file so browser modules and userscript globals do not leak into each other.
- Pair these templates with the ESLint flat-config template in `.agents/skills/ref-sp-js-javascript/` when the repo also needs linting slices for scripts, browser modules, and userscripts.
