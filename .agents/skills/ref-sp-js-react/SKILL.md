---
name: ref-sp-js-react
description: "React components and hooks that stay readable: one-pass render flow, the narrowest state owner, effects only for sync, and few deliberate libraries (MUI, zod, TanStack Query). Use when building, refactoring, or reviewing React, or choosing a React library."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "react"
---

# React

React itself. Next.js specifics are `ref-sp-js-next` and whole-app planning `ref-sp-js-next-template`;
type modeling is `ref-sp-js-typescript`; framework-free browser apps are
`ref-sp-js-web-standalone-template`. For native mobile, `ref-sp-js-react-native` builds on this skill,
but there is no DOM, MUI doesn't run, and styling and lists work differently; Expo tooling is `ref-sp-js-expo`.

## Defaults

- Native `Date` and `Intl` first; `date-fns` only when date logic gets genuinely complex.
- Infer return types for components, hooks, and helpers; annotate exported contracts, framework
  callbacks, reusable hooks with non-obvious contracts, or where inference widens wrongly.
- Yarn for installs and scripts in Node-based projects, unless the repo is Deno-owned.

## Component structure

- Keep render logic obvious from top to bottom.
- Split components when one file heavily mixes layout, data loading, mutations, and event choreography.
- Prefer composition and explicit props over deep wrapper stacks or implicit children contracts.
- Extract a hook or child component only when it makes the code easier to read; don't hide simple
  logic behind one.
- Preserve semantic HTML even when a component library provides generic wrappers. A native element
  carries role, focusability, and keyboard behaviour that a styled `<div>` does not, and every
  capability you drop has to be rebuilt in ARIA and kept correct (see `ref-sp-ux-accessibility`,
  its `references/semantic-structure.md`). This rule is web-only:
  React Native has no semantic elements, so the equivalent discipline there is declaring
  `accessibilityRole` and friends explicitly. See `ref-sp-js-react-native`.
- When a component relies on a closed set of variants or labels, keep the canonical list in a const object or tuple and derive the prop or state union from that value.
- In JSDoc-backed React files, import external types with `/** @import { SomeType } from './somewhere.js' */` instead of duplicating typedefs locally.

## Hooks and state

- Keep state local if one component owns it.
- Lift state only when multiple consumers truly need to coordinate on the same value.
- Use derived values during render instead of copying props or query results into extra state.
- Treat effects as synchronization with external systems, not as a fallback place for ordinary calculations.
- Extract a custom hook when effects, subscriptions, or async coordination repeat across
  components.
- Prefer `useEffectEvent`, `startTransition`, and `useDeferredValue` when they clarify event or effect boundaries or keep interactions responsive.
- Do not add `useMemo` or `useCallback` by default unless profiling or an established repo convention shows that they earn their keep.

## Library recommendations

- Keep library additions rare and intentional.
- For component-heavy React apps that need a ready-made system, prefer MUI with `@emotion/react` and `@emotion/styled`; if that stack needs icons, prefer `@mui/icons-material`.
- Prefer `zod` for runtime schema validation at form, URL, persistence, and network boundaries.
- Prefer `@tanstack/react-query` for async server state, caching, invalidation, and background refresh when that complexity is real.
- Instantiate an app-wide client such as a TanStack `QueryClient` at the composition root, not at the top of an imported module. In a purely client-side app a single module-level instance is acceptable; when the code can also run on the server, create it inside the component with `useState(() => new QueryClient())` so it is not shared across requests. See `ref-sp-dev-coding-patterns` for the general import-side-effect rule.
- Avoid mixing styling systems casually; if an app already uses a component and theme system such as MUI, do not add Tailwind or a second styling stack without a repo-wide reason.

## Before finishing

- Every piece of state has a clear owner (local, derived, or async server state), and input crossing a
  boundary is validated.

## References

- React Documentation: <https://react.dev/>
- MUI Documentation: <https://mui.com/material-ui/getting-started/>
- TanStack Query Documentation: <https://tanstack.com/query/latest/docs>
- Zod Documentation: <https://zod.dev/>
- date-fns Documentation: <https://date-fns.org/>
- Read `./references/checklist.md` for a quick React review pass.
- Read `./references/library-recommendations.md` when choosing React dependencies or checking whether a library addition is justified.
