# Adoption Playbook

Use this reference when the task is about bringing Deno into an existing TypeScript or Node repo, keeping `tsconfig.json` and `eslint.config.*` from fighting with `deno.json`, or troubleshooting a hybrid Deno boundary.

## 1. Decide ownership first

- Deno-owned code should be configured through `deno.json`, `deno task`, `deno check`, `deno lint`, and `deno fmt`.
- Node-owned code should keep `package.json`, Node-focused `tsconfig.json`, and ESLint or Prettier if those tools still own that subtree.
- In mixed repos, prefer a dedicated Deno subtree or Deno entrypoints instead of enabling Deno for the whole workspace.
- Prefer path-based editor activation such as `deno.enablePaths` over whole-workspace Deno activation.

## 2. Keep `deno.json` as the Deno source of truth

Put Deno-specific behavior here:

- `tasks`
- `imports`
- `compilerOptions`
- `lint`, `fmt`, `test`, and `bench`
- `permissions`
- `nodeModulesDir`

Example:

```json
{
  "nodeModulesDir": "auto",
  "tasks": {
    "check": "deno check --all src/mod.ts",
    "lint": "deno lint src/",
    "fmt:check": "deno fmt --check src/"
  },
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.ns", "dom"]
  },
  "lint": {
    "include": ["src/"],
    "exclude": ["dist/"]
  }
}
```

## 3. Keep `tsconfig.json` only when it still has a real owner

- Keep `tsconfig.json` for Node-owned folders, Node build tools, TS project references, or include or exclude granularity that Deno workspaces cannot express cleanly.
- Deno can probe nearby `tsconfig.json` files when a directory also contains `deno.json` or `package.json`.
- If a parent `deno.json` defines `compilerOptions`, those win over overlapping `tsconfig.json` compiler settings.
- Do not clone a whole Node `tsconfig.json` into Deno just to make `deno check` happy.
- If the problem is runtime libraries, prefer `compilerOptions.lib` in `deno.json`.

Useful `lib` examples:

- Deno main runtime: use Deno defaults unless there is a real mismatch.
- Browser plus Deno SSR: `["dom", "dom.iterable", "dom.asynciterable", "deno.ns"]`
- Deno worker: `["deno.worker"]`

If JavaScript files need stronger typing:

- Enable `compilerOptions.checkJs` or add `// @ts-check`.
- Use `@ts-types` or `@ts-self-types` for `.d.ts` wiring.
- Use `compilerOptions.types` for shared ambient declarations only when module-based typing is not practical.

## 4. Prefer `deno lint` first, then add ESLint deliberately

- Default to `deno lint` and `deno fmt` for Deno-owned files.
- Use `lint.rules`, `lint.include`, and `lint.exclude` in `deno.json` before reaching for ESLint.
- If you need custom Deno lint rules, use `lint.plugins`; note that the plugin API is experimental in Deno 2.2+.
- Only add ESLint when you need rules, plugins, or editor workflows that Deno's built-in linter cannot cover.

If the repo still needs ESLint in a Deno boundary:

1. Set `nodeModulesDir: "auto"` in `deno.json` so editor extensions can resolve packages.
1. Materialize packages with `deno install` or a warm-up command such as `deno run -A npm:eslint --version`.
1. Add `eslint.config.js` or `eslint.config.mjs`.
1. Wrap the invocation in `deno task`, for example:

```json
{
  "tasks": {
    "eslint": "eslint . --ext .ts,.js"
  }
}
```

1. Run it with `deno task eslint`.

Avoid making `deno lint` and ESLint both act as full style owners for the same files unless the split is documented and intentional.

## 5. Hybrid Node compatibility caveats

- Deno 2 supports `package.json`, npm packages, Node built-ins, and npm workspaces.
- With `package.json`, Deno 2 defaults `nodeModulesDir` to `"manual"`; set it to `"auto"` if you want Deno to manage `node_modules` automatically.
- `nodeModulesDir` can only be configured at the workspace root.
- Keep Deno-specific commands in `deno task` and Node-specific commands in the Node task runner rather than mixing them blindly.
- Use `deno.enablePaths` in editor settings so diagnostics stay scoped to the Deno-owned subtree.

## 6. Install npm-backed CLI tooling through Deno

When Deno owns the dependency graph, installation and task exposure are separate steps:

1. Add the package with Deno, using `--dev` for development-only CLIs.

```powershell
deno add --dev npm:sample-tool
```

1. Add a `deno.json` task with the same name as the tool that invokes the installed binary.

```json
{
  "tasks": {
    "sample-tool": "sample-tool"
  }
}
```

1. Verify through the task, for example `deno task sample-tool --version`.

Do not replace the installation step with a task such as `"sample-tool": "deno run -A npm:sample-tool"`. That is a one-off execution shortcut, not a manifest-managed dev dependency.

## 7. Permissions and environment strategy

- Prefer named permission sets in `deno.json` over repeating long flag lists.
- Use `-P` or `--permission-set=<name>` when the repo defines them.
- Use `--env-file` when the CLI should load environment files before startup.
- Use `@std/dotenv` when the program itself should read `.env` content.
- Use `DENO_TRACE_PERMISSIONS=1` to capture permission stack traces and `DENO_AUDIT_PERMISSIONS=<path>` to write a JSONL audit log.
- Avoid broad `--allow-run` and `--allow-ffi`; both weaken the sandbox substantially.

## 8. Troubleshooting checklist

- `deno check --all <entrypoint>` when runtime success and type-check behavior diverge.
- `deno run --check=all <entrypoint>` when the command should fail before execution on type errors.
- `deno info <entrypoint>` when module resolution, cached dependencies, or permission expectations are unclear.
- `deno lint --fix` when migration churn is mostly lintable cleanup.
- `deno run --inspect-brk ...` when you need a debugger before short-lived code executes.
- `deno run --inspect-brk --log-level=debug ...` when inspector or module-resolution setup is failing.
- `deno run --strace-ops ...` when the process hangs or stalls in runtime operations.
- `deno run --cpu-prof --cpu-prof-flamegraph ...` when the real problem is performance.
- `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` when dependency fetches or network calls behave differently across environments.

## 9. Deno 2 migration notes worth remembering

- `nodeModulesDir` uses `"none" | "auto" | "manual"`.
- `deno cache` became `deno install --entrypoint`.
- `deno vendor` became `"vendor": true` in `deno.json`.
- `Deno.run()` should become `new Deno.Command()`.
- `Deno.serveHttp()` should become `Deno.serve()`.
- Import assertions should become import attributes such as `with { type: "json" }`.
