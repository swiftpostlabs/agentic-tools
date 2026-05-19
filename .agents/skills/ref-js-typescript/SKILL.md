---
name: ref-js-typescript
description: "Portable TypeScript guidance for strict typing, runtime boundaries, and maintainable scripts or apps. Use when: writing or reviewing TypeScript code, types, or configuration decisions."
metadata:
  agentic-tools-category: "js"
  shareable-skills.visibility: "shareable"
---

# TypeScript

## Purpose

Provide portable TypeScript defaults that keep types honest, runtime boundaries explicit, and code readable under strict settings.

## When to use this skill

- Writing or refactoring TypeScript modules or scripts.
- Deciding how to model states, responses, and shared types.
- Reviewing TypeScript config and type-checking strictness.
- Handling unknown external data safely.

## Scope Boundaries

- Use this skill for strict TypeScript design, runtime boundaries, and package-level structure.
- Use `.agents/skills/ref-js-react/SKILL.md` when the main question is about React component structure, hooks, client-side state ownership, or React-specific dependency choices.
- Use `.agents/skills/ref-js-next/SKILL.md` when the main question is about Next.js framework structure, App Router, or Next-specific integrations.
- Use `.agents/skills/ref-js-javascript/SKILL.md` when the code intentionally stays in plain JavaScript with JSDoc rather than full TypeScript.
- Use `.agents/skills/ref-coding-patterns/SKILL.md` for language-agnostic naming, comments, CLI ergonomics, and testing defaults.
- Use `.agents/skills/ref-projects-architecture/SKILL.md` for generic feature-boundary or shared-utility decisions that are not TypeScript-specific.

## Defaults

- Prefer strict mode and keep it strict.
- Prefer `unknown` plus narrowing over `any`.
- Prefer discriminated unions for stateful variants.
- Prefer explicit runtime validation at trust boundaries.
- Prefer inference inside small local scopes and explicit annotations at exported or shared boundaries.
- Prefer `as const` for fixed literal maps and tuples when the exact keys or values matter; do not widen them to `Record<string, ...>` or `string[]` unless the surface is intentionally open-ended.
- Prefer const data as the source of truth for closed sets: derive key and value unions from `as const` objects or tuples instead of maintaining a parallel hand-written type that can drift.
- Prefer TypeScript over plain JavaScript in modern Node and Deno codebases because current runtimes can execute `.ts` and `.mts` directly.
- Modern Node can run TypeScript directly through built-in type stripping; do not add `ts-node`, `tsx`, or a build step just to execute ordinary Node-owned `.ts` or `.mts` scripts.
- Prefer `.ts` for ordinary TypeScript modules, colocated feature tests, and most feature code.
- Prefer `.mts` for Node ESM scripts that are executed directly by Node and need the extension to communicate module format clearly.
- Prefer `const` arrow functions for TypeScript helpers, callbacks, components, and script-local functions.
- Prefer Yarn for dependency management and script execution in Node-based TypeScript projects unless the repo is intentionally Deno-owned.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Model a runtime boundary | Decide where external data becomes validated domain data. | TypeScript is safest when compile-time certainty matches runtime reality. | When reading network, file, env, or parsed JSON input. | The code narrows or validates untrusted input before use. |
| Place types and features | Keep package-owned code and its local types under a readable `src/<feature>/` layout. | Deeply shared `types/` folders often grow faster than the actual features they serve. | When starting or reorganizing a package. | The feature and the types it owns are easy to find together. |
| Review strictness and readability | Check whether utility types, generics, and unions are helping or obscuring the model. | Strictness loses value when the types stop communicating intent. | When reviewing or refactoring a non-trivial TypeScript module. | Runtime safety stays strong without burying the domain in type tricks. |

## Core Rules

### Type design

- Model states and variants with unions instead of optional-property soup.
- Use utility types sparingly and only when they clarify intent.
- Keep literal lookup tables precise with `as const`, then narrow dynamic keys with `keyof typeof ...` or a guard instead of throwing away the literal information.
- When a fixed lookup object already defines the allowed states, labels, or variants, derive unions from it instead of duplicating the same domain in a separate alias or enum.
- Small helpers such as `type Keys<T extends object> = keyof T` and `type Values<T extends object> = T[Keys<T>]` are fine when they make those derived unions easier to read and reuse.
- Avoid deep type-level cleverness when a simple domain type would read better.

### Const-first modeling

- Prefer this pattern for closed maps and label sets:

```ts
export const statValueLabels = {
  1: 'Basso',
  2: 'Medio',
  3: 'Alto',
} as const;

export type Keys<T extends object> = keyof T;
export type Values<T extends object> = T[Keys<T>];

export type StatValue = Keys<typeof statValueLabels>;
export type StatValueLabel = Values<typeof statValueLabels>;
```

- Use an explicit `Record<...>` annotation only when the object is intentionally open-ended or must satisfy a broader external contract.

### Runtime boundaries

- Treat network data, filesystem data, environment variables, and parsed JSON as untrusted until validated.
- Narrow `unknown` with guards or validation helpers before use.
- Do not let compile-time confidence hide missing runtime checks.

### Direct Node execution

- Use direct Node TypeScript execution for Node-owned scripts when the supported Node version includes built-in type stripping; older Node 22 releases may need `--experimental-strip-types`.
- Keep directly executed TypeScript erasable: avoid syntax that requires transformation, such as enums, namespaces with runtime output, or parameter properties, unless the repo intentionally enables a transform path.
- Direct execution is not type checking. Keep `tsc --noEmit`, editor checks, or another explicit checker when correctness depends on TypeScript diagnostics.
- Do not ship directly executed `.ts` or `.mts` files as no-build package runtime from `node_modules`; Node rejects type stripping there, so publish JavaScript or use `.mjs` plus JSDoc/checkJs when no build exists.

### Code structure

- Keep types close to the feature or module that owns them.
- Extract shared types only when they are truly shared.
- Prefer readable named `const` arrow functions and objects over dense callback chains.
- Use function declarations only when the declaration form is materially useful, such as overload implementations, generators, intentional hoisting, or matching an existing framework/API convention.

### File and config conventions

- Use `.ts` for package code, browser-oriented modules, and most feature files.
- Use `.mts` for repo scripts or Node-run ESM entrypoints when the runtime or surrounding repo conventions rely on explicit module extensions.
- Use `.d.ts` for ambient declarations or globals that support the main code, such as userscript global definitions.
- Split `tsconfig` files by runtime surface when a repo mixes Node scripts, browser modules, and userscripts instead of forcing one project file to describe incompatible environments.
- Prefer Jest when a Node-managed package needs one test runner for colocated JavaScript and TypeScript feature tests.

## Example Layouts

### TypeScript package in a monorepo

```text
packages/package-name/
  src/
    invoice-import/
      index.ts
      parse-csv.ts
      parse-csv.test.ts
      types.ts
```

### Small feature with local validation

```text
src/
  session-state/
    index.ts
    validate-session.ts
    validate-session.test.ts
```

### Node ESM scripts with a dedicated TypeScript project

```text
scripts/
  generate-catalog.mts
  refresh-manifest.mts
tsconfig.json
```

## Gotchas

- Strict compile-time checks do not replace runtime validation for external data.
- `unknown` is only safer than `any` if the code actually narrows it before use.
- Large type-level abstractions can hide the domain model instead of clarifying it.
- Parallel literal types and literal objects drift unless one becomes the clear source of truth; prefer the const object and derive from it.
- Node's TypeScript execution strips types; it does not replace a checker or make non-erasable TypeScript syntax safe in every runtime mode.
- No-build package runtime under `node_modules` is the important exception: use emitted JavaScript or JSDoc-backed `.mjs` there.

## Validation

- No new `any` escapes or unchecked casts were introduced without strong justification.
- External input is validated before domain logic uses it.
- Shared types are easy to locate and easy to understand.
- Functions follow the local const-arrow default unless overloads, generators, intentional hoisting, or an API convention justify a declaration.
- The code does not stay on plain JavaScript merely to avoid `tsc`, `ts-node`, or a build step that modern Node and Deno runtimes no longer need.
- The resulting code remains readable to someone who did not write the types.

## References

- TypeScript Handbook: <https://www.typescriptlang.org/docs/>
- TSConfig Reference: <https://www.typescriptlang.org/tsconfig>
- Read `./references/checklist.md` for a quick strict-TypeScript review pass.
- Read `./references/config-templates.md` when you need ready-to-adapt `tsconfig` templates derived from the `web-pages` repository.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for TypeScript requests.
