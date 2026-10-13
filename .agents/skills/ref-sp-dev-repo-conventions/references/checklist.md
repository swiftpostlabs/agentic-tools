# Repo Conventions Review Checklist

Use before finalizing a placement, scaffold, or packaging change.

## Placement and layout

- Does each file have one clear owner: a feature under `src/features/`, or `src/core/`?
- Does a new command group live in `<feature>.command.ts`, mounted in `src/core/program.ts`?
- Is feature behaviour hiding in `core`, `utils`, or `helpers`?
- Are tests beside the code they exercise (`*.test.ts`), with fixtures from `src/core/testFixtures.ts`?
- Does the folder match responsibility: shipped CLI (`src/`), repo maintenance (`scripts/`), agent
  guidance (`.agents/`), Python packaging (`python/`)?
- Is `AGENTS.md` the only instruction file, with no `CLAUDE.md` or `GEMINI.md` beside it?

## TypeScript and runtime

- Is the code erasable-only, with `.ts` extensions on relative imports?
- Is every config or settings file parsed through a zod schema rather than cast?
- Do features take a `CommandContext` instead of reading `process.cwd()`, `os.homedir()`, or stdout?
- Are file and folder names camelCase?
- Is a skill script standalone, using only Node built-ins?

## Packaging

- Does a new runtime dependency appear in `dependencies` and nowhere else?
- Does `yarn run pack` list only `dist/`, `.agents/skills`, and the top-level docs?
- Does the shim wheel still build without `node_modules` (the CI `python_shim` job)?

## Validation

- `yarn lint` (ESLint and drift checks), `yarn typecheck`, and `yarn test` pass, and `yarn validate` when a skill changed.
