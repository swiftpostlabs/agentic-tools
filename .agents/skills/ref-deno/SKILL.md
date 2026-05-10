---
name: ref-deno
description: "Portable Deno guidance for modern runtime usage, deno.json configuration, permissions, Node interop, and hybrid Deno or Node repositories. Use when: writing Deno code, configuring deno tasks, or migrating older Deno patterns."
metadata:
  shareable-skills.visibility: "shareable"
---

# Deno

## Purpose

Provide portable defaults for modern Deno projects, especially when the codebase mixes Deno with Node-oriented tooling or needs a clean migration path from older Deno patterns.

## When to use this skill

- Writing Deno scripts, servers, or edge code.
- Configuring `deno.json`, tasks, and dependency sources.
- Mixing Deno code with Node or TypeScript code in one repository.
- Reviewing Deno permissions, testing, or runtime patterns.

## Defaults

- Use `deno.json` as the Deno source of truth.
- Prefer `deno task`, `deno fmt`, `deno lint`, and `deno test` over ad hoc wrappers when Deno owns the workflow.
- Prefer JSR packages, `npm:` specifiers, or explicit import-map entries over scattered legacy URL imports.
- Prefer Web-standard APIs and `Deno.serve` for servers.
- Treat permissions as a design decision, not an afterthought.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Configure `deno.json` | Define tasks, compiler options, and dependency conventions in Deno's config file. | Deno should own its own workflow rather than borrowing Node-centric config by accident. | When starting or restructuring a Deno project. | Deno commands and editor behavior are consistent. |
| Set hybrid boundaries | Separate Deno-owned paths from Node-owned paths in mixed repositories. | Tooling conflicts are one of the most common hybrid-repo failures. | When Deno code lives beside Node or TS tooling. | Editors and commands do not fight over the same files. |
| Review permissions | Choose explicit permissions and task wrappers for runtime access. | Deno's security model only helps when permissions are deliberate. | Before running new scripts or exposing a Deno CLI workflow. | Filesystem, network, and environment access are intentional and auditable. |

## Core Rules

### Configuration and dependencies

- Put Deno compiler and task settings in `deno.json` rather than in a separate `tsconfig.json`.
- In hybrid repositories, keep Node-specific `tsconfig.json` files for Node folders and let Deno own its own paths through `deno.json`.
- Wrap repeatable tooling commands in `deno task`, including trusted CLI flows like `deno run -A npm:supabase`.

### Hybrid repository interop

- Do not enable Deno tooling for an entire mixed workspace if only one subtree is Deno.
- Prefer path-based editor activation such as `deno.enablePaths` so Node and Deno tooling do not fight over the same files.
- Keep the Deno boundary explicit in folder structure and docs.

### Permissions and runtime

- Prefer least privilege for application code.
- Use `-A` only for trusted tooling or when the command genuinely needs full access.
- Keep environment, filesystem, and network access obvious in task definitions and command examples.

### Migration notes

- Workspace-wide Deno activation and complex shared `tsconfig` setups are legacy patterns in mixed repos.
- If older docs mention them, treat them as transition notes rather than the default recommendation.
- Prefer current Deno Deploy and runtime guidance over deprecated Deploy Classic patterns.

## Gotchas

- If Deno and Node tooling both claim the same files, editor diagnostics become noisy and misleading.
- `-A` is acceptable for trusted tooling, but it is the wrong default for ordinary application code.
- Old URL-import and whole-workspace-activation patterns are transition aids, not modern defaults.

## Validation

- `deno.json` owns Deno configuration and tasks.
- The Deno and Node parts of a hybrid repo do not fight over tooling.
- Dependency specifiers are modern and explicit.
- Permissions are intentional and documented where they matter.

## References

- Read `./references/checklist.md` for a quick Deno review pass.
- Read `./assets/trigger-eval-queries.example.json` when checking trigger quality for Deno and hybrid-repo prompts.
- Review `./evals/evals.json` when validating output quality for configuration or migration guidance.