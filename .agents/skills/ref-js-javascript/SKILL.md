---
name: ref-js-javascript
description: "Portable JavaScript guidance for scripts and browser code with JSDoc-based typing. Use when: writing plain JavaScript, adding JSDoc, or keeping JavaScript maintainable without TypeScript."
metadata:
  shareable-skills.visibility: "shareable"
---

# JavaScript

## Purpose

Provide portable defaults for maintainable JavaScript when full TypeScript is not the right tool, especially for scripts and browser-side code that still benefit from structure and JSDoc.

## When to use this skill

- Writing plain JavaScript for scripts, browser code, or small tools.
- Adding or improving JSDoc types.
- Refactoring dynamic JavaScript into clearer, more explicit code.
- Reviewing whether a JavaScript module should stay JS or move to TypeScript.

## Scope Boundaries

- Use this skill for portable JavaScript structure and JSDoc guidance.
- Use `.agents/skills/ref-js-react/SKILL.md` when the main question is about React component structure, hooks, or React-specific dependency choices, whether the file is JavaScript or TypeScript.
- Use `.agents/skills/ref-js-next/SKILL.md` when Next.js framework concerns dominate the design.
- Use `.agents/skills/ref-js-typescript/SKILL.md` when the main question is about strict type-system design rather than JSDoc-backed JavaScript.
- Use `.agents/skills/ref-coding-patterns/SKILL.md` for language-agnostic naming, comments, CLI ergonomics, and testing defaults.
- Use `.agents/skills/ref-projects-architecture/SKILL.md` for portable feature-boundary or shared-utility decisions.
- Use `.agents/skills/ref-js-userscript/SKILL.md` or `.agents/skills/ref-app-web-standalone/SKILL.md` when the JavaScript lives inside a userscript or standalone browser app and those constraints dominate the design.

## Defaults

- Prefer modern ESM syntax.
- Prefer TypeScript for modern Node and Deno code when the runtime can execute `.ts` or `.mts` directly and the files are not shipped as package runtime from `node_modules`.
- For no-build npm packages or Git-installed CLIs that execute from `node_modules`, use `.mjs` JavaScript with JSDoc and active `checkJs` type checking instead of shipping `.ts` or `.mts` runtime files.
- Use plain JavaScript intentionally for browser-delivered code, JSDoc-first modules, or repos that have already chosen JS as the local default.
- When code intentionally stays JavaScript, prefer `.js` for most modules and `.mjs` for executable ESM scripts or entrypoints where the runtime boundary should be unambiguous.
- Prefer JSDoc on exported helpers, shared objects, and non-obvious callbacks.
- Prefer named constants and helpers over repeated inline logic.
- Prefer `const` arrow functions for JavaScript helpers, callbacks, and script-local functions.
- Prefer explicit input validation at I/O boundaries.
- Prefer simple data flow over mutation-heavy code.
- Prefer Yarn for dependency management and script execution in Node-based JavaScript projects unless the repo is intentionally Deno-owned.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Add JSDoc where it earns its keep | Document exported shapes, callbacks, and shared objects without turning the file into comment soup. | JavaScript stays maintainable when the implicit contracts are surfaced selectively. | When editor help or object shapes are getting hard to follow. | The file is still plain JavaScript, but the important contracts are explicit. |
| Split browser or script responsibilities | Separate DOM access, state changes, parsing, and I/O into named helpers or modules. | JavaScript gets hard to debug quickly when everything is inline and anonymous. | When a script starts mixing too many concerns. | The code reads in layers instead of as one giant callback. |
| Choose a package-level layout | Keep feature code under a package-owned `src/` tree when the repo is multi-package or monorepo-style. | Package ownership is easy to lose when scripts, shared code, and app code sit at the same level. | When introducing a reusable JS package or tool in a monorepo. | The package has a clear root and feature slices stay local to it. |
| Split linting by runtime surface | Give scripts, browser modules, and userscripts their own ESLint file globs and language options. | One lint config rarely fits Node scripts, browser code, and userscript globals equally well. | When a repo mixes plain JS, `.mjs`, and userscript files. | The lint config matches the runtime instead of forcing false positives or broad exceptions. |

## Core Rules

### JSDoc and typing

- Use `@typedef`, `@param`, and `@returns` where they materially improve editor tooling and readability.
- Document object shapes and callback contracts that would otherwise be implicit.
- Keep JSDoc synchronized with the code; stale type comments are worse than no comments.

### Structure

- Break repeated or mentally heavy logic into named helpers.
- Use `const name = (...) => { ... }` as the default function shape for helpers, callbacks, and script-local functions.
- Use a function declaration only when the declaration-specific behavior matters, such as intentional hoisting, generators, or compatibility with an existing API shape.
- Keep DOM access, state transitions, rendering, and event wiring conceptually separate in browser code.
- Avoid giant anonymous functions when a named local helper would clarify intent.

### Scripts

- Use consistent flag names and help text when a JS file acts like a CLI.
- Keep script inputs explicit rather than reaching into ambient globals unless the platform requires it.
- Validate file, network, or user-provided input before acting on it.

### Library recommendations

- Prefer `citty` for Node-facing JavaScript CLIs that need argument parsing, subcommands, help text, and a maintainable command surface.
- Prefer `consola` for Node-facing JavaScript CLI logging so success, warning, and error output stay consistent without hand-rolled terminal formatting.
- Prefer Jest for Node-facing JavaScript or TypeScript package tests when one runner should cover colocated `*.test.js` and `*.test.ts` files.
- Keep CLI-specific dependencies narrow: if a local helper plus native APIs are enough, do not add a framework just because it is popular.

### File extensions and linting

- If modern Node or Deno can run the file directly, reconsider whether it should be TypeScript before defaulting to `.js`.
- Use `.mjs` for explicit ESM entrypoints and runnable script shims when a file intentionally stays JavaScript and the extension clarifies runtime intent.
- Keep ordinary feature modules on `.js` only when the surrounding repo or delivery target actually wants JavaScript.
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

## Validation

- Exported helpers and shared objects have useful JSDoc where needed.
- Repeated or complex logic has been named and isolated.
- Browser code keeps responsibilities readable.
- Script inputs and outputs are explicit and predictable.
- Functions follow the local const-arrow default unless a declaration-specific behavior is intentionally needed.
- Node and Deno files are still on JavaScript only when that choice is deliberate rather than inertia.
- Node-based package installs and CLI invocations stay on Yarn unless the repo is intentionally Deno-owned.

## References

- MDN JavaScript Guide: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide>
- MDN JavaScript Modules: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules>
- TypeScript JSDoc Reference: <https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html>
- Read `./references/checklist.md` for a quick JavaScript and JSDoc review pass.
- Read `./references/config-templates.md` when you need the `web-pages` flat ESLint template for scripts, browser modules, and userscript slices.
- Read `./assets/trigger-eval-queries.example.json` when testing the description against plain JavaScript and browser-script requests.
- Review `./evals/evals.json` when validating output quality for JS structure, JSDoc, or mixed-runtime config guidance.
