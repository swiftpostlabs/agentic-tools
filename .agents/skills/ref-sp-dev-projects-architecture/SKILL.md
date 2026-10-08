---
name: ref-sp-dev-projects-architecture
description: "Where code should live: feature-first folders, when to share a utility, keeping product code out of scripts/, mixed Python and Node layouts, and numbered folder names. Use when placing new code, splitting a feature, or reviewing repo structure."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
---

# Projects Architecture

Portable structure defaults. A specific repo's top-level folders and wiring live in its conventions
skill (here, `ref-sp-dev-repo-conventions`); language-specific shapes in `ref-sp-py-python`,
`ref-sp-js-javascript`, `ref-sp-js-typescript`; browser-only tools in
`ref-sp-js-web-standalone-template`.

## Features

- Organize by feature, not by type. Keep code, tests, and assets that change together in one
  folder or slice, with tests next to the code they cover.
- Give each real feature folder a short `README.md`: what it owns, its entrypoints, how to validate
  it.
- A feature never reaches into another feature's internals.
- When a file gets hard to scan, split it by responsibility inside the feature first. Extract pure
  helpers before stateful orchestration.

## Shared code

- Extract a shared utility only once reuse is real and stable; duplicating tiny stable code beats a
  premature shared abstraction.
- No global `utils` or `helpers` bucket without clear internal categories.

## Product code vs scripts

- User-facing behaviour of the product or package lives under the main source tree.
- `scripts/` holds repo maintenance: migrations, scaffolding, dev automation, one-off jobs.
- An installed CLI keeps its implementation in its feature under `src/`; `scripts/` holds at most
  the smallest shim that calls it.
- Move product behaviour out of `scripts/` once it stops being a prototype.

## Mixed Python and Node repos

- Both languages share feature names and folder ownership: Python under
  `src/<package>/<feature>/`, the Node surface in the same feature slice, not a parallel tree.
- Colocate `main.py` and `main_test.py`, plus the matching Node files when both runtimes expose
  the feature.
- No-build npm packages or Git-installed CLIs that run from `node_modules` use `.mjs` with JSDoc
  (`main.mjs`, `main.test.mjs`), so nothing depends on TypeScript stripping at runtime. Use
  `main.ts` / `main.test.ts` only where TypeScript isn't executed directly as shipped code.
- Each language keeps its own packaging (`pyproject.toml`, `package.json`); split configs such as
  `tsconfig` by runtime surface. Keep cross-runtime helpers narrow and explicit.

```text
scripts/                    dev-only, not installed
  billing-cli.mjs           thin shim
src/package_name/
  billing/
    README.md
    main.py
    main_test.py
    main.mjs
    main.test.mjs
```

## Naming

- Folder and file names say what is inside; prefer a domain name over a generic one.
- When siblings form a **sequence**, prefix them with a fixed-width number so a plain sort matches
  the order: `10-new/`, `20-open/`, `90-closed/`.

The numbered-prefix pattern is Linux's `.d` directories (SysV init's `/etc/rc3.d/S20apache2`,
systemd drop-ins). `man 5 sysctl.d`: files are "sorted by their filename in lexicographic order",
and it "is recommended to prefix all filenames with a two-digit number and a dash." Nothing parses
the number; it only drives the sort. Hence: pad to fixed width (`9-` sorts after `10-`), leave gaps
of 10 so inserts never renumber, and keep the top of the range (`99-`) for overrides. Use it only
where order changes meaning (`/etc/cron.d` stays unnumbered). `.d` numbers encode *priority* among
simultaneous entries, while a lifecycle is a *sequence*, so don't import priority idioms like a
`50-` neutral centre.

## References

- `./references/checklist.md`: quick structure review pass.
