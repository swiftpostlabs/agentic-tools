---
name: ref-js-userscript
description: "Portable guidance for browser userscripts on Tampermonkey, Violentmonkey, and similar managers. Use when: writing or reviewing .user.js or .user.ts scripts, metadata blocks, permissions, or DOM automation."
metadata:
  shareable-skills.visibility: "shareable"
---

# Userscript

## Purpose

Provide portable defaults for userscripts that are resilient to DOM changes, scoped safely, and explicit about permissions and page integration.

## When to use this skill

- Writing or reviewing a userscript.
- Designing the metadata block, grants, and match patterns.
- Injecting UI into third-party pages.
- Automating DOM interactions or page data extraction.

## Scope Boundaries

- Use this skill when the code runs as a userscript on third-party pages and the metadata block, grants, or page integration rules dominate the design.
- Use `.agents/skills/ref-app-web-standalone/SKILL.md` when the browser code lives in an app you control rather than in a userscript manager.
- Use `.agents/skills/ref-js-javascript/SKILL.md` for plain JavaScript structure and JSDoc concerns that are not userscript-specific.

## Defaults

- Keep the metadata block explicit and minimal.
- Prefer `.user.js` for plain JavaScript userscripts and `.user.ts` only when the repo has a deliberate TypeScript or build flow for userscripts.
- Use the narrowest `@match` or `@include` patterns that still fit the task.
- Declare grants deliberately; do not request APIs you do not use.
- Keep startup idempotent so re-runs do not duplicate UI or listeners.
- Isolate selectors, storage keys, and injected class names as constants.

## Core Rules

### Metadata and permissions

- Choose precise page scopes rather than broad wildcards where possible.
- Add `@grant` entries only for the userscript APIs the code actually uses.
- Keep version, name, and description clear enough that the installed script is recognizable.

### DOM behavior

- Wait for the necessary page state before acting.
- If the target page is highly dynamic, prefer a small targeted observer over polling loops.
- Namespace injected CSS classes, IDs, or data attributes to avoid clashing with the page.

### State and safety

- Make UI injection and event binding idempotent.
- Keep selectors and mutation rules centralized so page changes are easier to repair.
- Fail softly when the page no longer matches expectations.

### File and type support

- Use `.user.js` or `.user.ts` in the filename so the userscript role is obvious in code search and tooling.
- If TypeScript or strict linting checks the userscript, keep a small `userscript-globals.d.ts` or similar ambient declaration file beside it rather than scattering missing-global suppressions.
- Keep userscript-specific config separate from ordinary browser modules so grants and globals do not leak into unrelated code.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Define metadata scope | Choose `@match`, `@grant`, and startup metadata deliberately. | Over-broad scope and unused permissions make userscripts harder to trust and maintain. | Before writing the implementation. | The userscript runs only where intended and requests only the APIs it uses. |
| Inject UI safely | Add UI, listeners, and styles in an idempotent way. | Dynamic pages and repeated initialization are common failure modes. | When augmenting an existing page. | Re-runs do not duplicate UI or handlers. |
| Centralize selectors and storage | Keep selectors, storage keys, and injected identifiers in named constants. | Host pages change often, and scattered selectors make repairs expensive. | Whenever the script reads or mutates page state. | The DOM integration surface is easy to update and review. |

## Gotchas

- Broad `@match` patterns and unused grants create unnecessary risk.
- Polling loops are usually a smell; prefer targeted observers or state checks.
- Injected IDs and class names need namespacing or they will collide with host-page styles and scripts.

## Validation

- The metadata block requests only the permissions and pages actually needed.
- Re-running the script does not duplicate injected UI or listeners.
- Page selectors and injected identifiers are centralized and namespaced.
- The script degrades cleanly when the host page changes.

## References

- Tampermonkey Documentation: <https://www.tampermonkey.net/documentation.php>
- Violentmonkey Metadata Block: <https://violentmonkey.github.io/api/metadata-block/>
- Read `./references/checklist.md` for a quick userscript review pass.
- Read `./references/types-and-config.md` when you need naming, ambient global, or config examples for `.user.js` and `.user.ts` workflows.
- Read `./assets/trigger-eval-queries.example.json` when testing whether the description activates on userscript and DOM-automation prompts.
- Review `./evals/evals.json` when checking output quality for high-risk page automation work.
