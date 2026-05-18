---
name: ref-js-deno
description: "Portable Deno guidance for modern runtime usage, deno.json configuration, tsconfig and ESLint adoption, permissions, Node interop, and hybrid Deno or Node repositories. Use when: writing Deno code, configuring deno tasks, or adopting Deno into an existing TypeScript or Node repo."
metadata:
  shareable-skills.visibility: "shareable"
---

# Deno

## Purpose

Provide portable defaults for modern Deno projects, especially when the codebase mixes Deno with Node-oriented tooling, needs a clean migration path from older Deno patterns, or is adopting Deno into an existing TypeScript or Node repository.

## When to use this skill

- Writing Deno scripts, servers, or edge code.
- Configuring `deno.json`, tasks, and dependency sources.
- Adapting existing `tsconfig.json` or `eslint.config.*` files to coexist with Deno.
- Mixing Deno code with Node or TypeScript code in one repository.
- Reviewing Deno permissions, testing, or runtime patterns.

## Defaults

- Use `deno.json` as the Deno source of truth.
- Prefer `deno check`, `deno task`, `deno fmt`, `deno lint`, and `deno test` over ad hoc wrappers when Deno owns the workflow.
- Deno's native tooling is sufficient for Deno-owned code; use Yarn only when the repository also has Node-managed packages or scripts outside the Deno boundary.
- Keep `tsconfig.json` only for Node-owned paths or for TypeScript project-graph cases that Deno workspaces and directory scopes cannot express cleanly.
- Remember that modern Node also runs TypeScript directly through built-in type stripping; choose Deno for its runtime, permissions, dependency, and tooling model, not merely to avoid `tsc` or `ts-node`.
- Prefer `deno lint` and `deno fmt` for Deno-owned files; add ESLint only when the repo or editor truly needs the ESLint ecosystem.
- When npm-backed editor tooling such as ESLint must run inside a Deno repo, set `nodeModulesDir: "auto"` and wrap the command in `deno task`.
- Prefer `.ts` modules by default in Deno-owned code; do not drop to JavaScript just to avoid a build step that Deno does not require.
- Prefer JSR packages, `npm:` specifiers, or explicit import-map entries over scattered legacy URL imports.
- When an npm-backed CLI has install or postinstall behavior that does not cooperate cleanly with `deno run npm:...`, prefer `nodeModulesDir: "auto"`, allow the package in `allowScripts`, and invoke the installed binary from a `deno task`.
- Deno 2 is intentionally compatible with `package.json`, npm packages, and Node built-ins; keep Deno-specific configuration in `deno.json` instead of trying to make `tsconfig.json` carry both worlds.
- Prefer Web-standard APIs and `Deno.serve` for servers.
- Treat permissions as a design decision, not an afterthought.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Adopt `tsconfig.json` and ESLint carefully | Decide what stays in Node-owned config and what moves into `deno.json`. | Hybrid repos get noisy fast when both toolchains try to own the same files. | When introducing Deno into an existing TypeScript or Node codebase. | Deno and Node tooling each have explicit ownership boundaries. |
| Configure `deno.json` | Define tasks, compiler options, and dependency conventions in Deno's config file. | Deno should own its own workflow rather than borrowing Node-centric config by accident. | When starting or restructuring a Deno project. | Deno commands and editor behavior are consistent. |
| Set hybrid boundaries | Separate Deno-owned paths from Node-owned paths in mixed repositories. | Tooling conflicts are one of the most common hybrid-repo failures. | When Deno code lives beside Node or TS tooling. | Editors and commands do not fight over the same files. |
| Review permissions | Choose explicit permissions and task wrappers for runtime access. | Deno's security model only helps when permissions are deliberate. | Before running new scripts or exposing a Deno CLI workflow. | Filesystem, network, and environment access are intentional and auditable. |
| Troubleshoot Deno workflows | Use Deno-native checks, debugger flags, and module-graph tooling before guessing. | Many Deno problems are configuration, permission, or ownership issues rather than code bugs. | When a hybrid repo or migrated toolchain behaves unexpectedly. | The root cause is narrowed to config, permissions, or runtime behavior. |

## Core Rules

### TypeScript, `tsconfig.json`, and libraries

- Put Deno compiler settings in `deno.json` under `compilerOptions`; do not copy a full Node `tsconfig.json` just to make `deno check` run.
- Existing Node plus TypeScript workspaces can keep `tsconfig.json`; Deno probes it when a directory also contains `deno.json` or `package.json`.
- If a parent `deno.json` defines `compilerOptions`, those take precedence over overlapping `tsconfig.json` options.
- Use `compilerOptions.lib` in `deno.json` to model the real runtime surface. For SSR or browser plus Deno code, prefer combinations like `["dom", "dom.iterable", "dom.asynciterable", "deno.ns"]`; for Deno workers, prefer `["deno.worker"]`.
- Use `compilerOptions.checkJs`, `// @ts-check`, `@ts-types`, `@ts-self-types`, or `compilerOptions.types` when JavaScript modules need explicit type checking or declarations.
- Keep `tsconfig.json` only when Node-owned folders, TS project references, or include or exclude granularity still require it.

### Linting, formatting, and ESLint

- Use `deno lint` and the `lint` section in `deno.json` as the default linting owner for Deno-owned code.
- Use `deno fmt` and the `fmt` section in `deno.json` as the default formatter for Deno-owned code.
- `deno lint` already covers a recommended ruleset inspired by ESLint; do not keep ESLint just out of habit.
- If custom Deno-only rules are required, consider `lint.plugins`; note that the lint-plugin API is experimental and requires Deno 2.2 or newer.
- If the repo or editor still needs ESLint, make it an explicit secondary tool: set `nodeModulesDir: "auto"`, create `eslint.config.js`, and wrap the invocation in `deno task`, for example `deno task eslint`.
- Keep one lint owner per file set wherever possible. If both `deno lint` and ESLint run on the same files, document why or expect duplicate and conflicting diagnostics.

### Node compatibility and hybrid repositories

- Deno 2 understands `package.json`, `node_modules`, npm workspaces, and Node built-ins; hybrid repos are a supported path, not a workaround.
- Modern Node can execute TypeScript directly too. In hybrid repos, decide Node versus Deno ownership by permissions, dependency model, task runner, and deployment target rather than by TypeScript execution alone.
- If a `package.json` exists and you want Deno to auto-create and refresh `node_modules`, set `nodeModulesDir: "auto"`. With `package.json`, Deno 2 otherwise defaults to `"manual"`.
- `nodeModulesDir` is a workspace-root setting; do not try to set it per workspace member.
- Use `deno install` or `deno add` when Deno owns the dependency update flow. Do not assume Deno 1 auto-install behavior.
- Do not enable Deno tooling for an entire mixed workspace if only one subtree is Deno.
- Prefer path-based editor activation such as `deno.enablePaths` so Node and Deno tooling do not fight over the same files.
- Keep the Deno boundary explicit in folder structure, tasks, and docs.

### Permissions, environment, and security

- Prefer narrow `--allow-*` flags or named permission sets in `deno.json` over `-A`.
- Use `-P` or `--permission-set=<name>` when the repo defines permission sets in `deno.json`.
- Use `--env-file` when the CLI should load `.env` files, or `@std/dotenv` when the program itself needs to load them; both still need explicit environment and file permissions.
- Prefer least privilege for application code and keep environment, filesystem, network, and subprocess access obvious in tasks and examples.
- Treat `--allow-run` and `--allow-ffi` as sandbox escape hatches. Avoid `--allow-run=deno` unless full trust is explicitly intended.
- For permission debugging or auditing, use `DENO_TRACE_PERMISSIONS=1` and `DENO_AUDIT_PERMISSIONS=<path>`.

### Troubleshooting and migration

- Reach for `deno check`, `deno check --all`, or `deno run --check` when runtime success and type-check behavior diverge.
- Use `deno info <entrypoint>` to inspect the module graph and understand import, cache, and permission behavior.
- Use `deno lint --fix` for common migration cleanup before hand-editing every lint issue.
- For debugger setup, use `--inspect-brk` when the process is short-lived, `--log-level=debug` when inspector or module resolution is confusing, and `--strace-ops` when the runtime is hanging or unexpectedly slow.
- Use CPU profiling flags such as `--cpu-prof`, `--cpu-prof-md`, or `--cpu-prof-flamegraph` when the troubleshooting question is really about performance.
- Migration advice should reflect Deno 2 defaults: `nodeModulesDir` now uses `"none" | "auto" | "manual"`, `deno cache` became `deno install --entrypoint`, `deno vendor` became `"vendor": true`, `Deno.run()` should become `new Deno.Command()`, and `Deno.serveHttp()` should become `Deno.serve()`.
- Use import attributes such as `with { type: "json" }` instead of deprecated import assertions.

## Gotchas

- If Deno and Node tooling both claim the same files, editor diagnostics become noisy and misleading.
- If `package.json` exists, Deno 2 defaults `nodeModulesDir` to `"manual"`; forgetting this is a common reason npm-backed tools look half-installed.
- If the VS Code ESLint extension is part of the workflow, it will not resolve packages from Deno's global cache alone; it needs a local `node_modules` directory.
- `deno run` skips type checking by default, so a passing run is not evidence that `deno check` will pass.
- `-A` is acceptable for trusted tooling, but it is the wrong default for ordinary application code.
- Some npm CLIs, including Supabase in real mixed-runtime repos, rely on install-time behavior that can be less reliable through `deno run npm:...` than through an installed binary under `node_modules`.
- Old URL-import and whole-workspace-activation patterns are transition aids, not modern defaults.

## Validation

- `deno.json` owns Deno configuration and tasks.
- Any retained `tsconfig.json` or ESLint ownership is explicit and scoped to the right files.
- The Deno and Node parts of a hybrid repo do not fight over tooling.
- Dependency specifiers are modern and explicit.
- `nodeModulesDir`, editor activation, and any npm-backed Deno tooling are configured intentionally.
- If an npm CLI is driven from Deno tasks, the repo intentionally configures `nodeModulesDir` and `allowScripts` rather than relying on accidental install side effects.
- Permissions are intentional and documented where they matter.
- Troubleshooting guidance starts with Deno-native checks before falling back to generic Node or TypeScript debugging advice.

## References

- Read `./references/adoption-playbook.md` when the task is about `tsconfig.json`, ESLint, hybrid Deno or Node migration, or troubleshooting a Deno boundary.
- Deno LLM Summary: <https://docs.deno.com/llms-summary.txt>
- Deno Configuration Reference: <https://docs.deno.com/runtime/fundamentals/configuration/>
- Deno TypeScript Configuration Reference: <https://docs.deno.com/runtime/reference/ts_config_migration/>
- Deno Security Reference: <https://docs.deno.com/runtime/fundamentals/security/>
- Read `./references/checklist.md` for a quick Deno review pass.
- Read `./assets/trigger-eval-queries.example.json` when checking trigger quality for Deno and hybrid-repo prompts.
- Review `./evals/evals.json` when validating output quality for configuration or migration guidance.
