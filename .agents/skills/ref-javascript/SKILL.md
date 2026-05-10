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

## Defaults

- Prefer modern ESM syntax.
- Prefer JSDoc on exported helpers, shared objects, and non-obvious callbacks.
- Prefer named constants and helpers over repeated inline logic.
- Prefer explicit input validation at I/O boundaries.
- Prefer simple data flow over mutation-heavy code.

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

## Validation

- Exported helpers and shared objects have useful JSDoc where needed.
- Repeated or complex logic has been named and isolated.
- Browser code keeps responsibilities readable.
- Script inputs and outputs are explicit and predictable.

## References

- Read `./references/checklist.md` for a quick JavaScript and JSDoc review pass.
- Read `./assets/trigger-eval-queries.example.json` when testing the description against plain JavaScript and browser-script requests.