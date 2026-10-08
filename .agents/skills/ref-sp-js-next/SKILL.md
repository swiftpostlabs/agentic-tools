---
name: ref-sp-js-next
description: "Next.js App Router apps: thin route files, Server Components by default with narrow 'use client', per-request clients, and official integrations such as MUI and next-intl. Use when building or reviewing Next routes, layouts, rendering boundaries, or config."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "next"
---

# Next.js

Next.js framework rules. React itself is `ref-sp-js-react`; planning a whole app is
`ref-sp-js-next-template`; strict types are `ref-sp-js-typescript`; framework-free apps are
`ref-sp-js-web-standalone-template`. Expo Router is also file-based, but Server Components,
`'use client'`, and Next's metadata and data APIs don't transfer to it (`ref-sp-js-expo`).

## Defaults

- App Router for new work; strict TypeScript unless the repo chose otherwise; Yarn by default.
- Prefer official framework integrations when a library needs Next wiring; treating it like a
  plain React package often fails in subtle ways.

## Routes and layouts

- Keep route entry points focused on routing, metadata, and high-level composition.
- Prefer colocating feature components outside the route file once the UI grows beyond a small route shell.
- Keep layout and page composition readable from top to bottom.

## Client and server boundaries

- Default to Server Components when the code does not need browser state, DOM APIs, or event handlers.
- Add `'use client'` at the narrowest practical boundary.
- Do not move entire route trees to the client just because one leaf needs interactivity.
- Do not construct request-scoped state at module scope: a module-level `new QueryClient()` (or a similar client) is shared across requests on the server and can leak data between users. Create such clients per request inside a client component with `useState(() => new QueryClient())` instead. See `ref-sp-dev-coding-patterns` for the general import-side-effect rule.

## Integrations and libraries

- If the app uses MUI, prefer the official MUI and Next.js integration path instead of ad hoc SSR wiring.
- Prefer `next-intl` when localization is required in App Router projects.
- Keep package manager usage consistent; do not mix Yarn with another Node package manager without a repo-wide reason.

## Before finishing

- Internationalization is added only when the app actually needs it.

## References

- Next.js Documentation: <https://nextjs.org/docs>
- Next.js App Router Documentation: <https://nextjs.org/docs/app>
- MUI Next.js Integration: <https://mui.com/material-ui/integrations/nextjs/>
- next-intl App Router Guide: <https://next-intl.dev/docs/getting-started/app-router>
- Read `./references/checklist.md` for a quick Next.js review pass.
