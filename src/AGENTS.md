# src

The `agentic-tools` CLI. Before writing or reviewing code here, load `ref-sp-js-typescript` and
`ref-sp-dev-repo-conventions`; their rules apply in full. The nested `AGENTS.md` files add to them and
never relax them.

## The rules most easily missed

- **Functions are `const` arrow functions.** A function declaration only for an overload, a generator,
  or intentional hoisting.
- **Return types are inferred**, except on exported API contracts and where inference falls short
  (recursion, a deliberately narrow union, a value that would otherwise be `any`).
- **No `any`, no unchecked casts.** Files, environment, and `JSON.parse` output are `unknown` until a
  zod schema or a guard narrows them. The one sanctioned `any` is citty's sub-command type in
  `core/program.ts`.
- **Importing a module has no side effects.** Reading files, the environment, or `process.cwd()`
  happens inside a function the caller runs. Start-up work belongs only in `core/cli.mts`.
- **`.ts` for anything imported, `.mts` only for a file that is only ever run.** Relative imports name
  the file with its extension (`./skills.ts`).
- **Erasable syntax only:** no `enum`, namespaces, or parameter properties. Node runs this source
  directly through the Python shim and Jest.
- **Names are camelCase** for files and folders, and say what the file holds. No `utils/` or
  `helpers/`.
- **Tests sit beside the code** as `<name>.test.ts`, with fixtures from `core/testFixtures.ts`.

## Layout

| Folder | What it holds |
| --- | --- |
| `core/` | The front controller and the plumbing every feature shares |
| `features/` | One folder per command group |
