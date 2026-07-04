# Types And Config

Use this file when the task is about userscript file naming, ambient globals, or how userscript code should interact with linting and TypeScript config.

## When to load this file

- The user asks whether the file should be `.user.js` or `.user.ts`.
- The repo needs userscript global declarations for `GM_*` APIs.
- The task needs a concrete example of how userscript files stay separate from ordinary browser modules.

## Conventions

- Use `.user.js` for ordinary userscripts.
- Use `.user.ts` only when the repo deliberately type-checks or builds userscripts.
- Keep a small ambient declaration file such as `userscript-globals.d.ts` near the userscript if the code needs typed `GM_*` globals.
- Pair userscript config with a dedicated userscripts `tsconfig` project and a dedicated ESLint slice when the repo also contains browser modules or Node scripts.

## Templates and nearby examples

- `./assets/web-pages-userscript-globals.template.d.ts` — copied from the `web-pages` repo as a minimal ambient globals template.
- `.agents/skills/ref-sp-js-typescript/assets/web-pages-tsconfig.userscripts.template.json` — `tsconfig` template for `.user.js`, `.user.ts`, and nearby declaration files.
- `.agents/skills/ref-sp-js-javascript/assets/web-pages-eslint.config.template.mjs` — flat ESLint template with dedicated JavaScript and TypeScript userscript slices.
