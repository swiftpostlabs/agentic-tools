---
name: ref-sp-js-javascript
description: "Maintainable plain JavaScript with JSDoc typing: when to stay JS vs switch to TypeScript, .js vs .mjs, const-first literal maps, const-arrow helpers, CLI libraries, and ESLint by runtime. Use when writing or reviewing JavaScript."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
---

# JavaScript

For code that stays JavaScript. Strict type design is `ref-sp-js-typescript`; React and Next.js
are `ref-sp-js-react` and `ref-sp-js-next`; userscripts and standalone browser apps are
`ref-sp-js-userscript` and `ref-sp-js-web-standalone-template`; language-neutral defaults are
`ref-sp-dev-coding-patterns`, and feature boundaries `ref-sp-dev-projects-architecture`.

## Defaults

- Modern ESM. Simple data flow over mutation-heavy code; named constants and helpers over repeated
  inline logic; explicit input validation at I/O boundaries.
- Yarn for installs and scripts in Node-based projects, unless the repo is Deno-owned.
- JSDoc on exported helpers, shared objects, and non-obvious callbacks.

## JSDoc and typing

- Before choosing JSDoc-backed JavaScript for Node scripts, check whether the repo can use direct TypeScript execution in its supported Node version.
- Use `/** @import { SomeType } from './somewhere.js' */` for imported types instead of duplicating them with local `@typedef` blocks.
- Use local `@typedef` only for shapes owned by the file or for derived const-backed types that do not exist elsewhere.
- Use `@param` where it materially improves editor tooling and readability.
- Prefer inferred return types over `@returns` by default; add `@returns` for exported API contracts, complex callbacks, non-obvious unions, or cases where tooling would infer a misleading type.
- Document object shapes and callback contracts that would otherwise be implicit.
- For fixed literal lookup objects or tuples, prefer `/** @type {const} */` so TypeScript infers the specific keys and values from the literal.
- If checked JavaScript needs a derived union from a fixed lookup object, prefer a `typeof ...[keyof typeof ...]` style typedef over a duplicated string-literal union.
- If a dynamic string needs to index a const-typed lookup object, narrow the key first with a guard or a targeted cast instead of widening the whole object to `Record<string, ...>`.
- Keep JSDoc synchronized with the code; stale type comments are worse than no comments.

Example:

```js
/** @import { ReportRow } from './report-types.js' */

export const statValueLabels = /** @type {const} */ ({
  1: 'Basso',
  2: 'Medio',
  3: 'Alto',
});

/** @typedef {keyof typeof statValueLabels} StatValue */
/** @typedef {typeof statValueLabels[keyof typeof statValueLabels]} StatValueLabel */
```

## Structure

- Break repeated or mentally heavy logic into named helpers.
- Use `const name = (...) => { ... }` as the default function shape for helpers, callbacks, and script-local functions.
- Use a function declaration only when the declaration-specific behavior matters, such as intentional hoisting, generators, or compatibility with an existing API shape.
- Keep DOM access, state transitions, rendering, and event wiring conceptually separate in browser code.
- Avoid giant anonymous functions when a named local helper would clarify intent.
- Keep the module top level side-effect-free: importing should bind names, not open connections, read the environment, or build stateful clients. Export a factory and let the caller construct, so import order stays irrelevant. Wiring at an application entry point is the intended exception; see `ref-sp-dev-coding-patterns`.

## Scripts

- Use consistent flag names and help text when a JS file acts like a CLI.
- Keep script inputs explicit rather than reaching into ambient globals unless the platform requires it.
- Validate file, network, or user-provided input before acting on it.

## Library recommendations

- Prefer `citty` for Node-facing JavaScript CLIs that need argument parsing, subcommands, help text, and a maintainable command surface.
- Prefer `consola` for Node-facing JavaScript CLI logging so success, warning, and error output stay consistent without hand-rolled terminal formatting.
- Prefer Jest for Node-facing JavaScript or TypeScript package tests when one runner should cover colocated `*.test.js` and `*.test.ts` files.
- Keep CLI-specific dependencies narrow: if a local helper plus native APIs are enough, do not add a framework just because it is popular.

## File extensions and linting

- If modern Node or Deno can run the file directly, reconsider whether it should be TypeScript before defaulting to `.js`.
- For no-build npm packages or Git-installed CLIs that run from `node_modules`, ship `.mjs` with
  JSDoc and `checkJs` type checking enabled: Node refuses type stripping under `node_modules`. That
  is the reason to use JavaScript there, not a belief that Node needs `tsc` or `ts-node`.
- Use `.mjs` for explicit ESM entrypoints and runnable script shims when a file intentionally stays JavaScript and the extension clarifies runtime intent.
- Keep ordinary feature modules on `.js` only when the repo or delivery target actually wants
  JavaScript: browser-delivered code, JSDoc-first modules, or a repo that chose JS deliberately.
- When a repo mixes browser modules, repo scripts, and userscripts, split the ESLint flat config by file globs rather than diluting one config with many exceptions.

## Example Layouts

### Plain JavaScript package in a monorepo

```text
packages/package-name/
  src/
    csv-tools/
      index.js
      parse-report.js
      parse-report.test.js
```

### Browser script with local helpers

```text
src/features/example-browser-tool/
  example-browser-tool.html
  js/
    app.js
    storage.js
```

### Mixed repo with explicit ESM scripts

```text
scripts/
  generate-catalog.mts
src/features/example-data-transform/
  normalize-results.mjs
```

## Before finishing

- A Node or Deno file is JavaScript by deliberate choice, not inertia.

## References

- MDN JavaScript Guide: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide>
- MDN JavaScript Modules: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules>
- TypeScript JSDoc Reference: <https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html>
- Read `./references/checklist.md` for a quick JavaScript and JSDoc review pass.
- Read `./references/config-templates.md` when you need the `web-pages` flat ESLint template for scripts, browser modules, and userscript slices.
