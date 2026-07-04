# Config Templates

Use this file when the task needs concrete linting or mixed-extension examples rather than only structural guidance.

## When to load this file

- The user asks for an ESLint flat-config example.
- The repo mixes browser modules, Node-run scripts, and userscripts.
- The task is about `.js` versus `.mjs` placement or how lint globs should follow those extensions.

## Template provided

- `./assets/web-pages-eslint.config.template.mjs` — copied from the `web-pages` repository root and split into distinct config slices for browser modules, repo scripts, JavaScript userscripts, and TypeScript userscripts.

## Adaptation rules

- Keep separate file globs for browser modules, Node-run scripts, and userscripts when their globals or parser needs differ.
- Pair the script slice with `.mts` or `.ts` globs only if the repo actually executes or type-checks those script extensions.
- If the repo has only JavaScript userscripts, remove the TypeScript userscript slice instead of leaving dead config.
- Pair this template with `.agents/skills/ref-sp-js-typescript/references/config-templates.md` when the same repo also needs split `tsconfig` projects.
