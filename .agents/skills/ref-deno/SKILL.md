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

## Validation

- `deno.json` owns Deno configuration and tasks.
- The Deno and Node parts of a hybrid repo do not fight over tooling.
- Dependency specifiers are modern and explicit.
- Permissions are intentional and documented where they matter.