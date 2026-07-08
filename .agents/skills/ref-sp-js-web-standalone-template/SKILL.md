---
name: ref-sp-js-web-standalone-template
description: "App-level guidance for standalone HTML, CSS, and JavaScript tools that should run without framework or build-system overhead. Use when: creating or reviewing a whole browser-only app, deciding whether it can stay no-build, or choosing local assets and browser-loadable libraries."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
---

# Standalone Web App

## Purpose

Provide app-level defaults for self-contained browser apps and local web tools that should stay simple, readable, and maintainable without unnecessary framework or build-system overhead.

## When to use this skill

- Creating a standalone browser app or local web tool.
- Refactoring a no-build web app that is getting too large.
- Deciding whether the app can stay framework-free or should escalate to a full React and Next app.
- Choosing local assets and browser-loadable libraries for a whole standalone app.

## Scope Boundaries

- Use this skill for whole browser-only apps and local web tools you control directly.
- Use `ref-sp-js-next-template` when the user explicitly wants a full React and Next app rather than a no-build browser app.
- Use `ref-sp-js-react` or `ref-sp-js-next` only after the app has deliberately crossed into those frameworks.
- Use `ref-sp-js-userscript` when the code runs inside a userscript manager on someone else's page.
- Use `ref-sp-js-javascript` for detailed JavaScript module, JSDoc, and runtime-surface questions once the standalone app model itself is chosen.
- Use `ref-sp-dev-projects-architecture` when the question is about repo-wide structure rather than one browser app.

## Defaults

- Start with one self-contained HTML file for small and medium apps.
- Use semantic HTML before reaching for generic containers.
- Prefer no package manager or build pipeline by default.
- If Node-based tooling becomes necessary, prefer Yarn for dependency management and scripts.
- For richer no-build UI, prefer browser-loadable UI libraries over re-creating every control from scratch.
- Do not introduce React or a build pipeline by default.
- Keep styles and scripts local unless extraction clearly improves readability.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Start with the smallest viable app | Keep HTML, CSS, and JS local until complexity proves extraction is needed. | Standalone tools become harder to move and maintain once they inherit premature infrastructure. | When creating a new browser-only app. | The app is easy to open, reason about, and iterate on. |
| Split a growing app locally | Extract sibling CSS or JS files inside the same folder when the inline version gets hard to scan. | Local extraction improves readability without creating cross-app coupling. | When one file is becoming mentally heavy. | Structure is clearer but the app still ships as an independent unit. |
| Compare no-build versus framework escalation | Decide whether the requirement still fits a no-build browser app or has crossed into full-app territory. | Framework escalation is expensive when the app could stay local and simple. | When state, routing, or deployment expectations start growing. | The chosen app model matches the real complexity. |

## Core Rules

### Structure

- Use semantic sections such as `header`, `main`, `section`, `form`, and `dialog` where they fit.
- Keep the app layout obvious from the markup alone.
- Extract CSS or JS into local sibling files only when the inline version becomes hard to scan.

### Local asset boundaries

- Keep the main page on `.html` and colocate any extracted CSS, JS, and assets inside the same app folder.
- Extract local assets only when the single-file version has become hard to scan.
- If the app also ships with a userscript, keep that handoff explicit and route the userscript-specific details to `ref-sp-js-userscript`.

### Independence

- Assume one standalone browser app should not need another app's runtime files.
- If local assets or helpers exist, keep them inside the same app folder.
- Only create shared runtime layers when the user explicitly wants repository-wide reuse.

## Example Layouts

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

## Validation

- The app remains understandable without framework knowledge.
- HTML is semantic, JS responsibilities are clear, and repeated values are named.
- Local extraction improved readability instead of adding ceremony.
- The app does not introduce hidden coupling, unnecessary framework assumptions, or avoidable build machinery.
- Lower-level JavaScript module and JSDoc choices are delegated to `ref-sp-js-javascript` instead of being duplicated here.

## References

- MDN HTML Element Reference: <https://developer.mozilla.org/en-US/docs/Web/HTML/Element>
- MDN JavaScript Modules: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules>
- Read `ref-sp-js-javascript` for detailed JS module, JSDoc, and runtime-surface guidance inside the chosen standalone app model.
- Read `./references/checklist.md` for a quick standalone-app review pass.
- Read `./references/library-recommendations.md` when choosing browser-loadable UI or utility libraries for a no-build app.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for standalone app and browser-tool prompts.
- Review `./evals/evals.json` when validating output quality for structure or extraction guidance.
