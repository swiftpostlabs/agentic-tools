---
name: ref-sp-js-typescript
description: "Strict TypeScript: unions over optional soup, unknown plus narrowing, const-first literal maps, runtime validation at boundaries, direct Node execution, side-effect-free modules, and .ts vs .mts. Use when writing, reviewing, or configuring TypeScript."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
---

# TypeScript

Strict TypeScript defaults. Plain JavaScript with JSDoc is `ref-sp-js-javascript`; React and
Next.js are `ref-sp-js-react` and `ref-sp-js-next`. React Native and Expo (`ref-sp-js-react-native`,
`ref-sp-js-expo`) use these typing rules, but Metro bundles their app code, so the Node-execution and
per-runtime `tsconfig` rules don't apply there. Language-neutral defaults are
`ref-sp-dev-coding-patterns`.

## Defaults

- Strict mode, and keep it strict. `unknown` plus narrowing over `any`; discriminated unions for
  stateful variants.
- Prefer TypeScript to JavaScript in modern Node and Deno, which run `.ts` and `.mts` directly;
  don't add `ts-node`, `tsx`, or a build step just to execute them.
- `const` arrow functions for helpers, callbacks, components, and script-local functions.
- Infer return types by default; annotate public API contracts, interface or overload
  implementations, recursive or poorly inferred generics, deliberately narrow unions, and
  framework or library boundaries.
- Yarn for installs and scripts in Node-based projects, unless the repo is Deno-owned.

## Type design

- Model states and variants with unions instead of optional-property soup.
- Use utility types sparingly and only when they clarify intent.
- Keep literal lookup tables precise with `as const`, then narrow dynamic keys with `keyof typeof ...` or a guard instead of throwing away the literal information.
- When a fixed lookup object already defines the allowed states, labels, or variants, derive unions from it instead of duplicating the same domain in a separate alias or enum.
- Small helpers such as `type Keys<T extends object> = keyof T` and `type Values<T extends object> = T[Keys<T>]` are fine when they make those derived unions easier to read and reuse.
- Avoid deep type-level cleverness when a simple domain type would read better.

## Const-first modeling

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

## Runtime boundaries

- Treat network data, filesystem data, environment variables, and parsed JSON as untrusted until validated.
- Narrow `unknown` with guards or validation helpers before use.
- Do not let compile-time confidence hide missing runtime checks.

## Direct Node execution

- Use direct Node TypeScript execution for Node-owned scripts when the supported Node version includes built-in type stripping; older Node 22 releases may need `--experimental-strip-types`.
- Keep directly executed TypeScript erasable: avoid syntax that requires transformation, such as enums, namespaces with runtime output, or parameter properties, unless the repo intentionally enables a transform path.
- Direct execution is not type checking. Keep `tsc --noEmit`, editor checks, or another explicit checker when correctness depends on TypeScript diagnostics.
- Do not ship directly executed `.ts` or `.mts` files as no-build package runtime from `node_modules`; Node rejects type stripping there, so publish JavaScript or use `.mjs` plus JSDoc/checkJs when no build exists.

## Code structure

- Keep module top level free of side effects: importing a module should bind names, not open connections, read environment, or construct stateful clients. Export a factory such as `export const createDb = () => connect(env.databaseUrl)` instead of a ready-made instance, so imports stay order-independent and tree-shaking and test isolation keep working.
- Construction at an application entry point or composition root is the intended exception; the rule targets work triggered by *importing* an ordinary module. See `ref-sp-dev-coding-patterns` for the portable rule.
- Keep types close to the feature or module that owns them.
- Extract shared types only when they are truly shared; a deep shared `types/` folder tends to grow
  faster than the features it serves.
- Use function declarations only when the declaration form is materially useful, such as overload implementations, generators, intentional hoisting, or matching an existing framework/API convention.

## File and config conventions

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

- Node's TypeScript execution strips types; it does not replace a checker or make non-erasable TypeScript syntax safe in every runtime mode.
- A side effect at module top level — a `connect(...)` or `new Client(...)` bound at import — breaks `sideEffects: false` tree-shaking and makes import order significant; defer it to an exported factory.

## Before finishing

- No new `any` or unchecked cast without a strong reason.
- The types read clearly to someone who didn't write them.

## References

- TypeScript Handbook: <https://www.typescriptlang.org/docs/>
- TSConfig Reference: <https://www.typescriptlang.org/tsconfig>
- Read `./references/checklist.md` for a quick strict-TypeScript review pass.
- Read `./references/config-templates.md` when you need ready-to-adapt `tsconfig` templates derived from the `web-pages` repository.
