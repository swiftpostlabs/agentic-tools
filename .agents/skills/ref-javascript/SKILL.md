---
name: ref-javascript
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
- Use `.agents/skills/ref-typescript/SKILL.md` when the main question is about strict type-system design rather than JSDoc-backed JavaScript.
- Use `.agents/skills/ref-coding-patterns/SKILL.md` for language-agnostic naming, comments, CLI ergonomics, and testing defaults.
- Use `.agents/skills/ref-architecture/SKILL.md` for portable feature-boundary or shared-utility decisions.
- Use `.agents/skills/ref-userscript/SKILL.md` or `.agents/skills/ref-standalone-web-pages/SKILL.md` when the JavaScript lives inside a userscript or standalone page and those constraints dominate the design.

## Defaults

- Prefer modern ESM syntax.
- Prefer JSDoc on exported helpers, shared objects, and non-obvious callbacks.
- Prefer named constants and helpers over repeated inline logic.
- Prefer explicit input validation at I/O boundaries.
- Prefer simple data flow over mutation-heavy code.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Add JSDoc where it earns its keep | Document exported shapes, callbacks, and shared objects without turning the file into comment soup. | JavaScript stays maintainable when the implicit contracts are surfaced selectively. | When editor help or object shapes are getting hard to follow. | The file is still plain JavaScript, but the important contracts are explicit. |
| Split browser or script responsibilities | Separate DOM access, state changes, parsing, and I/O into named helpers or modules. | JavaScript gets hard to debug quickly when everything is inline and anonymous. | When a script starts mixing too many concerns. | The code reads in layers instead of as one giant callback. |
| Choose a package-level layout | Keep feature code under a package-owned `src/` tree when the repo is multi-package or monorepo-style. | Package ownership is easy to lose when scripts, shared code, and app code sit at the same level. | When introducing a reusable JS package or tool in a monorepo. | The package has a clear root and feature slices stay local to it. |

## Core Rules

### JSDoc and typing

- Use `@typedef`, `@param`, and `@returns` where they materially improve editor tooling and readability.
- Document object shapes and callback contracts that would otherwise be implicit.
- Keep JSDoc synchronized with the code; stale type comments are worse than no comments.

### Structure

- Break repeated or mentally heavy logic into named helpers.
- Keep DOM access, state transitions, rendering, and event wiring conceptually separate in browser code.
- Avoid giant anonymous functions when a named local helper would clarify intent.

### Scripts

- Use consistent flag names and help text when a JS file acts like a CLI.
- Keep script inputs explicit rather than reaching into ambient globals unless the platform requires it.
- Validate file, network, or user-provided input before acting on it.

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
src/features/report-viewer/
  report-viewer.html
  js/
    app.js
    storage.js
```

## Validation

- Exported helpers and shared objects have useful JSDoc where needed.
- Repeated or complex logic has been named and isolated.
- Browser code keeps responsibilities readable.
- Script inputs and outputs are explicit and predictable.

## References

- Read `./references/checklist.md` for a quick JavaScript and JSDoc review pass.
- Read `./assets/trigger-eval-queries.example.json` when testing the description against plain JavaScript and browser-script requests.
