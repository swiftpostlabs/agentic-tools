---
name: ref-sp-js-web-standalone-template
description: "Self-contained browser apps and local web tools with no framework or build step: one HTML file first, semantic markup, local sibling assets, browser-loadable libraries, and when to escalate to React/Next. Use when creating or reviewing a browser-only app."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
---

# Standalone Web App

Whole browser-only apps you control. A full React and Next app is `ref-sp-js-next-template` (use
`ref-sp-js-react` / `ref-sp-js-next` only once the app deliberately crosses into them); userscripts on
others' pages are `ref-sp-js-userscript`; module and JSDoc detail is `ref-sp-js-javascript`;
repo-wide structure is `ref-sp-dev-projects-architecture`.

## Defaults

- Start with one self-contained HTML file for small and medium apps. No package manager, build
  pipeline, or React by default; if Node tooling becomes necessary, use Yarn.
- For richer UI, prefer browser-loadable libraries over hand-building every control
  (`./references/library-recommendations.md`).
- Choose HTML elements for the behaviour they carry, not their looks (element table, landmarks,
  headings: `ref-sp-ux-accessibility`, its `references/semantic-structure.md`).
- Escalate to a full app only when state, routing, or deployment needs have really outgrown a
  local tool.

## Structure

- Use semantic sections such as `header`, `main`, `section`, `form`, and `dialog` where they fit.
- Keep the app layout obvious from the markup alone.
- Initialize app state and construct any singletons from one entry script rather than as a side effect of an imported helper module; keep extracted JS siblings inert on import. See `ref-sp-js-javascript` for the general import-side-effect rule.

## Local asset boundaries

- Keep the main page on `.html`. Extract CSS, JS, or assets into sibling files in the same app
  folder only when the single-file version has become hard to scan.
- If the app also ships with a userscript, keep that handoff explicit and route the userscript-specific details to `ref-sp-js-userscript`.

## Independence

- Assume one standalone browser app should not need another app's runtime files.
- Only create shared runtime layers when the user explicitly wants repository-wide reuse.

## Example layouts

### Single-file local app

```text
src/features/example-mini-lab/
  example-mini-lab.html
```

### Standalone app with local sibling assets

```text
src/features/example-dashboard-kit/
  index.html
  css/styles.css
  js/app.js
  assets/empty-state.svg
```

## Before finishing

- Repeated values and DOM hooks are named rather than repeated inline.

## References

- MDN HTML Element Reference: <https://developer.mozilla.org/en-US/docs/Web/HTML/Element>
- MDN JavaScript Modules: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules>
- Read `./references/checklist.md` for a quick standalone-app review pass.
- Read `./references/library-recommendations.md` when choosing browser-loadable UI or utility libraries for a no-build app.
