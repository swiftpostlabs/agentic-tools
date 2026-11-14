---
name: ref-sp-js-typescript
description: "Strict TypeScript: unions over optional soup, unknown plus narrowing, const-first literal maps, branded types, TypeScript 6 tsconfig defaults, runtime validation at boundaries, direct Node execution, side-effect-free modules, and .ts vs .mts. Use when writing, reviewing, or configuring TypeScript."
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
- For CLI libraries and their configuration, see `ref-sp-js-javascript`; they apply to TypeScript too.

## Type design

- Model states and variants with unions instead of optional-property soup.
- Use utility types sparingly and only when they clarify intent.
- Keep literal lookup tables precise with `as const`, then narrow dynamic keys with `keyof typeof ...` or a guard instead of throwing away the literal information.
- When a fixed lookup object already defines the allowed states, labels, or variants, derive unions from it instead of duplicating the same domain in a separate alias or enum.
- Small helpers such as `type Keys<T extends object> = keyof T` and `type Values<T extends object> = T[Keys<T>]` are fine when they make those derived unions easier to read and reuse.
- Avoid deep type-level cleverness when a simple domain type would read better.
- Brand values that share a primitive but must never be swapped, such as two kinds of id or two
  currencies, and create them only through a constructor that validates at the boundary. The
  brand exists only for the checker; at runtime the value stays a plain string or number.
- Mark a generic parameter `const` (TypeScript 5.0+) when callers pass literal arrays or objects
  whose exact values matter, so they need not write `as const` at each call.
- When each call should infer its own type, put the type parameter on the call signature
  (`type Wrap = <F extends AnyFn = () => void>(fn: F) => ...`), not on the alias
  (`type Wrapped<F extends AnyFn = () => void> = ...`): an alias parameter is fixed once, and a
  bare `Wrapped` silently means `Wrapped<() => void>`.

```ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type UserId = Brand<string, 'UserId'>;
export const toUserId = (raw: string): UserId => {
  if (!/^u_[a-z0-9]+$/.test(raw)) throw new Error(`Not a user id: ${raw}`);
  return raw as UserId;
};

const pick = <const Keys extends readonly string[]>(keys: Keys) => keys;
const columns = pick(['id', 'name']); // readonly ['id', 'name'], not string[]

type AnyFn = (...args: never[]) => unknown;
type Wrap = <F extends AnyFn = () => void>(fn: F) => (...args: Parameters<F>) => ReturnType<F>;
```

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

For ready-to-adapt `tsconfig` templates, read `./references/config-templates.md`.

- Use `.ts` for package code, browser-oriented modules, and most feature files.
- Use `.mts` for repo scripts or Node-run ESM entrypoints when the runtime or surrounding repo conventions rely on explicit module extensions.
- Use `.d.ts` for ambient declarations or globals that support the main code, such as userscript global definitions.
- Split `tsconfig` files by runtime surface when a repo mixes Node scripts, browser modules, and userscripts instead of forcing one project file to describe incompatible environments.
- Prefer Jest when a Node-managed package needs one test runner for colocated JavaScript and TypeScript feature tests.
- Set `strict`, `types`, `target`, and `module` explicitly, in the project file or a base it
  extends. TypeScript 6 defaults: `strict` on; `types` `[]`, so `process` is unknown until
  `"types": ["node"]` lists it, even with `@types/node` installed; `target` `es2025`; and a
  `module` that is not `esnext`. When `tsc` emits files, also set `rootDir`: it defaults to the
  folder holding `tsconfig.json`, so output can land in `dist/src/`.
- Use no option TypeScript 6 deprecates. `tsc` reports each as an error (TS5101 or TS5107), and
  TypeScript 7, the native compiler, drops them. Among them: `baseUrl`, `moduleResolution`
  `node`, `node10`, or `classic`, `target` `es5`, `downlevelIteration` (even `false`),
  `outFile`, `module` `amd`, `umd`, or `system`, and `esModuleInterop: false`. Use `paths`
  without `baseUrl`, and `nodenext` or `bundler` for module resolution.
  `"ignoreDeprecations": "6.0"` is a short bridge during an upgrade, not a fix. The `module Foo {}`
  namespace keyword is a compile error too; write `namespace Foo {}`, or better, a module file.

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

- Run the quick strict-TypeScript review pass in `./references/checklist.md`.
- No new `any` or unchecked cast without a strong reason.
- The types read clearly to someone who didn't write them.

## Sources

- TypeScript Handbook: <https://www.typescriptlang.org/docs/>
- TSConfig Reference: <https://www.typescriptlang.org/tsconfig>
- TypeScript 6.0 release notes: <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html>
