---
name: ref-sp-js-userscript
description: "Writing Tampermonkey or Violentmonkey userscripts: minimal metadata and grants, narrow @match, idempotent UI injection, centralized namespaced selectors, and soft failure when the page changes. Use when writing or reviewing a .user.js or .user.ts script."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
---

# Userscript

Userscripts running on pages you don't control. Browser apps you own are
`ref-sp-js-web-standalone-template`; plain JavaScript and JSDoc are `ref-sp-js-javascript`.

## Metadata and permissions

- Use the narrowest `@match` or `@include` patterns that fit; avoid broad wildcards.
- Add `@grant` entries only for the userscript APIs the code actually uses.
- Keep version, name, and description clear enough that the installed script is recognizable.

## DOM behavior

- Wait for the necessary page state before acting.
- If the target page is highly dynamic, prefer a small targeted observer; polling loops are usually
  a smell.
- Namespace injected CSS classes, IDs, or data attributes to avoid clashing with the page.

## State and safety

- Make startup, UI injection, and event binding idempotent, so a re-run doesn't duplicate UI or
  listeners.
- Keep selectors, storage keys, injected class names, and mutation rules in named constants in
  one place, so a page change is a one-line repair.
- Use `const` arrow helpers, and an arrow IIFE `(() => { ... })();` if a wrapper helps, unless a
  manager constraint or the file's existing wrapper says otherwise.
- In JSDoc-checked userscripts, keep closed lookup objects on `/** @type {const} */` and derive `keyof typeof` or value unions from the literal instead of widening them to generic records.
- In JSDoc-checked userscripts, import external types with `/** @import { SomeType } from './somewhere.js' */` instead of duplicating upstream typedefs locally.
- Let helper return types be inferred unless the userscript exposes a public API, callback contract, or non-obvious union that needs an explicit annotation.
- Keep fixed mode names, labels, and state tags as const literals and derive any needed unions from
  them instead of a separate type declaration.
- Fail softly when the page no longer matches expectations.

## File and type support

- Name files `.user.js`, or `.user.ts` only when the repo has a deliberate TypeScript or build flow
  for userscripts, so the role is obvious in search and tooling.
- If TypeScript or strict linting checks the userscript, keep a small `userscript-globals.d.ts` or similar ambient declaration file beside it rather than scattering missing-global suppressions.
- Keep userscript-specific config separate from ordinary browser modules so grants and globals do not leak into unrelated code.

## Before finishing

- Re-running the script doesn't duplicate injected UI or listeners.

## References

- Tampermonkey Documentation: <https://www.tampermonkey.net/documentation.php>
- Violentmonkey Metadata Block: <https://violentmonkey.github.io/api/metadata-block/>
- Read `./references/checklist.md` for a quick userscript review pass.
- Read `./references/types-and-config.md` when you need naming, ambient global, or config examples for `.user.js` and `.user.ts` workflows.
