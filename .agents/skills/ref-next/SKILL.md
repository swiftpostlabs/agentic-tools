---
name: ref-next
description: "Portable Next.js guidance for App Router structure, client and server boundaries, framework integrations, and Next-friendly library choices. Use when: creating or reviewing Next routes and layouts, deciding where 'use client' belongs, configuring Next.js, or choosing framework-specific integrations like next-intl."
metadata:
  shareable-skills.visibility: "shareable"
---

# Next.js

## Purpose

Provide portable defaults for maintainable Next.js apps, especially around App Router structure, client and server boundaries, and framework-specific integrations that behave differently from plain React.

## When to use this skill

- Creating or reviewing App Router routes, layouts, and metadata.
- Deciding whether a component or feature belongs on the server or client side.
- Configuring Next.js or framework-sensitive integrations.
- Choosing Next-specific libraries such as internationalization solutions.

## Scope Boundaries

- Use this skill for Next.js framework rules, routing structure, rendering boundaries, and framework-specific integrations.
- Use `.agents/skills/ref-react/SKILL.md` for general React component structure, hooks, local UI state, and React dependency choices that are not specific to Next.js.
- Use `.agents/skills/ref-app-react-next/SKILL.md` when the user is planning or reviewing a whole React and Next app rather than one framework concern.
- Use `.agents/skills/ref-typescript/SKILL.md` when the question is primarily about strict type modeling or TypeScript configuration.
- Use `.agents/skills/ref-app-web-standalone/SKILL.md` when the requirement is a browser-only app that should stay framework-free and no-build by default.

## Defaults

- Prefer App Router for new Next.js work.
- Prefer Server Components by default and add `'use client'` only where interactivity or browser-only APIs require it.
- Prefer thin route files that delegate reusable UI and logic into feature code.
- Prefer strict TypeScript for Next apps unless the repo already made a different deliberate choice.
- Prefer Yarn for dependency management and script execution in Node-based Next projects.
- Prefer official framework integrations when a library needs special Next.js wiring.
- Prefer `next-intl` when a Next app genuinely needs internationalization.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Choose the rendering boundary | Decide whether the route, layout, or component stays on the server or crosses into `'use client'`. | Next.js stays simpler when client code is introduced deliberately instead of spreading everywhere. | When adding interactivity, browser APIs, or async data. | Server and client responsibilities are explicit. |
| Keep route files thin | Move reusable UI and feature logic out of route entry points. | Route files become hard to maintain when they own layout, data, and component orchestration at once. | When a route or layout starts growing. | App Router files stay readable and framework-focused. |
| Choose framework integrations | Use the official integration path for UI or i18n libraries that need framework wiring. | Next-specific integrations often fail in subtle ways when treated like plain React packages. | When adding MUI, i18n, or other framework-aware tooling. | The integration matches documented Next behavior. |

## Core Rules

### Routes and layouts

- Keep route entry points focused on routing, metadata, and high-level composition.
- Prefer colocating feature components outside the route file once the UI grows beyond a small route shell.
- Keep layout and page composition readable from top to bottom.

### Client and server boundaries

- Default to Server Components when the code does not need browser state, DOM APIs, or event handlers.
- Add `'use client'` at the narrowest practical boundary.
- Do not move entire route trees to the client just because one leaf needs interactivity.

### Integrations and libraries

- If the app uses MUI, prefer the official MUI and Next.js integration path instead of ad hoc SSR wiring.
- Prefer `next-intl` when localization is required in App Router projects.
- Keep package manager usage consistent; do not mix Yarn with another Node package manager without a repo-wide reason.

## Validation

- Route and layout files stay thin and framework-focused.
- Client boundaries are narrow and justified.
- Framework-specific libraries use the official Next integration path.
- Internationalization is added only when the app actually needs it.

## References

- Next.js Documentation: <https://nextjs.org/docs>
- Next.js App Router Documentation: <https://nextjs.org/docs/app>
- MUI Next.js Integration: <https://mui.com/material-ui/integrations/nextjs/>
- next-intl App Router Guide: <https://next-intl.dev/docs/getting-started/app-router>
- Read `./references/checklist.md` for a quick Next.js review pass.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for routes, rendering boundaries, and Next-specific library prompts.
- Review `./evals/evals.json` when validating output quality for Next framework guidance.
