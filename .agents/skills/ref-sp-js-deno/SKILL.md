---
name: ref-sp-js-deno
description: "Deno 2 projects and hybrid Deno/Node repos: deno.json as config owner, migrating tsconfig and ESLint intent, deno add for npm CLIs, nodeModulesDir, least-privilege permissions, and troubleshooting. Use when writing Deno code or adopting Deno in a repo."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
---

# Deno

The Deno runtime and its tooling. Strict typing is `ref-sp-js-typescript`; plain JavaScript is
`ref-sp-js-javascript`; frameworks are `ref-sp-js-react` / `ref-sp-js-next`; version policy across
manifests is `ref-sp-dev-package-management`. For migrating `tsconfig.json` or ESLint, hybrid
boundaries, or troubleshooting, read `./references/adoption-playbook.md`.

## Defaults

- `deno.json` is the Deno source of truth. Use `deno check`, `task`, `fmt`, `lint`, and `test`
  rather than wrappers; Yarn only for Node-managed parts outside the Deno boundary.
- `.ts` by default in Deno-owned code.
- JSR packages, `npm:` specifiers, or import-map entries over scattered URL imports.
- Web-standard APIs and `Deno.serve` for servers. Permissions are a design decision.

## Config, lint, and permissions

- Compiler settings go in `deno.json` `compilerOptions`; keep `tsconfig.json` only for Node-owned
  folders, project references, or include/exclude needs Deno can't express.
- Before replacing `tsc` or ESLint, inventory what the old config does (strictness, module
  resolution, JSX, libs, scopes, globals, ignores, rule intent) and carry it into `deno.json`, or
  document what is dropped.
- `deno lint` and `deno fmt` own Deno files. Keep one lint owner per file set; add ESLint only as an
  explicit secondary tool run through `deno task` with `nodeModulesDir: "auto"`.
- Least privilege for application code: narrow `--allow-*` flags or named permission sets over `-A`,
  with environment, filesystem, network, and subprocess access visible in tasks and examples. Treat
  `--allow-run` and `--allow-ffi` as sandbox escape hatches.

## Node compatibility and hybrid repositories

- Deno 2 understands `package.json`, `node_modules`, npm workspaces, and Node built-ins; hybrid repos are a supported path, not a workaround.
- Modern Node can execute TypeScript directly too. In hybrid repos, decide Node versus Deno ownership by permissions, dependency model, task runner, and deployment target rather than by TypeScript execution alone.
- If a `package.json` exists and you want Deno to auto-create and refresh `node_modules`, set `nodeModulesDir: "auto"`. With `package.json`, Deno 2 otherwise defaults to `"manual"`.
- `nodeModulesDir` is a workspace-root setting; do not try to set it per workspace member.
- Use `deno install` or `deno add` when Deno owns the dependency update flow. Do not assume Deno 1 auto-install behavior.
- Use `deno add --dev npm:<package>` for dev-only npm CLIs in Deno-owned repositories. After the add, expose the binary through a `deno task` such as `"sample-tool": "sample-tool"` instead of `"sample-tool": "deno run -A npm:sample-tool"`.
- Check in the manifest and lockfile updates produced by `deno add`; a task alias alone is not a dependency installation.
- For an npm CLI whose install or postinstall step doesn't cooperate with one-off execution, set
  `nodeModulesDir: "auto"`, list it in `allowScripts`, add it with `deno add`, and run the installed
  binary from a `deno task`.
- Do not enable Deno tooling for an entire mixed workspace if only one subtree is Deno.
- Prefer path-based editor activation such as `deno.enablePaths` so Node and Deno tooling do not fight over the same files.
- Keep the Deno boundary explicit in folder structure, tasks, and docs.

## Gotchas

- If the VS Code ESLint extension is part of the workflow, it will not resolve packages from Deno's global cache alone; it needs a local `node_modules` directory.
- `deno run` skips type checking by default, so a passing run is not evidence that `deno check` will pass.
- Some npm CLIs, including Supabase in real mixed-runtime repos, rely on install-time behavior that can be less reliable through `deno run npm:...` than through an installed binary under `node_modules`.
- Old URL-import and whole-workspace-activation patterns are transition aids, not modern defaults.

## Before finishing

- Any retained `tsconfig.json` or ESLint has explicit, scoped ownership, and replacing either kept
  its useful behaviour or documents what was dropped.
- Debugging started with Deno-native checks before generic Node or TypeScript advice.

## References

- Deno LLM Summary: <https://docs.deno.com/llms-summary.txt>
- Deno Configuration Reference: <https://docs.deno.com/runtime/fundamentals/configuration/>
- Deno TypeScript Configuration Reference: <https://docs.deno.com/runtime/reference/ts_config_migration/>
- Deno Security Reference: <https://docs.deno.com/runtime/fundamentals/security/>
- Read `./references/checklist.md` for a quick Deno review pass.
