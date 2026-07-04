---
name: ref-sp-js-react
description: "Portable React guidance for components, hooks, client-side state, and React-friendly library choices. Use when: creating or reviewing React components, choosing React libraries, deciding where UI or async state should live, or refactoring a React feature that is getting hard to read."
license: MIT
metadata:
  owner-prefix: "sp"
  owner: "swiftpostlab/agentic-tools"
  scope: "js"
  visibility: "public"
  tags: "react"
---

# React

## Purpose

Provide portable defaults for readable React code, disciplined hook boundaries, and dependency choices that solve real UI complexity without growing a stack by accident.

## When to use this skill

- Creating or refactoring React components or hooks.
- Deciding where local UI state, derived state, and async server state should live.
- Choosing React libraries for UI, validation, caching, or date handling.
- Reviewing whether a React feature is too coupled, too stateful, or carrying unnecessary dependencies.

## Scope Boundaries

- Use this skill for React component design, hook conventions, and React-focused library choices.
- Use `.agents/skills/ref-sp-js-next/SKILL.md` when the main question is about App Router, routing, client or server component boundaries, metadata, or other Next.js-specific integrations.
- Use `.agents/skills/ref-sp-js-typescript/SKILL.md` when the main question is about strict type modeling, runtime trust boundaries, or `tsconfig` design rather than React behavior.
- Use `.agents/skills/ref-sp-js-javascript/SKILL.md` when the code intentionally stays plain JavaScript with JSDoc and the main question is not React-specific.
- Use `.agents/skills/ref-sp-js-react-next/SKILL.md` when the user is planning or reviewing a whole React and Next app rather than one React feature.
- Use `.agents/skills/ref-sp-js-web-standalone/SKILL.md` for no-build browser apps that should stay framework-free by default.

## Defaults

- Keep components focused enough that the render flow is easy to scan in one pass.
- Prefer local state for local UI concerns and derive values during render instead of mirroring props into state.
- Prefer extracted custom hooks when effects, subscriptions, or async coordination repeat across components.
- Prefer one coherent UI system when a component library is justified.
- Prefer runtime validation and async caching libraries only when the feature actually crosses those boundaries.
- Prefer native `Date` and `Intl` first, and use `date-fns` only when date logic becomes genuinely complex.
- For closed component variant maps, label tables, and route or status dictionaries, prefer const literals as the source of truth and derive unions from them instead of maintaining a second parallel type.
- Prefer inferred return types for components, hooks, and local helpers; annotate returns only for exported API contracts, framework callbacks, reusable hooks with non-obvious contracts, or cases where inference would widen the type incorrectly.
- For Node-based React projects, prefer Yarn for dependency management and script execution unless the repo is intentionally Deno-owned.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Review component boundaries | Separate rendering, async work, and state orchestration into components or hooks that can be read in one pass. | React becomes fragile when one file owns layout, effects, mutations, and validation all at once. | When a component is growing or mixing concerns. | The feature is easier to reason about and test. |
| Choose the state owner | Decide whether state stays local, becomes derived, moves into context, or becomes query-managed. | React code stays simpler when each state value lives at the narrowest level that actually needs it. | When adding filters, forms, dialogs, or remote data. | State placement matches who reads and updates it. |
| Choose dependencies deliberately | Add a library only if it removes real complexity, with one default per problem type. | React stacks bloat quickly when every concern gets a new helper package. | When evaluating UI, validation, async caching, or date handling. | The feature uses the smallest justified dependency set. |

## Core Rules

### Component structure

- Keep render logic obvious from top to bottom.
- Split components when one file heavily mixes layout, data loading, mutations, and event choreography.
- Prefer composition and explicit props over deep wrapper stacks or implicit children contracts.
- Preserve semantic HTML even when a component library provides generic wrappers.
- When a component relies on a closed set of variants or labels, keep the canonical list in a const object or tuple and derive the prop or state union from that value.
- In JSDoc-backed React files, import external types with `/** @import { SomeType } from './somewhere.js' */` instead of duplicating typedefs locally.

### Hooks and state

- Keep state local if one component owns it.
- Lift state only when multiple consumers truly need to coordinate on the same value.
- Use derived values during render instead of copying props or query results into extra state.
- Treat effects as synchronization with external systems, not as a fallback place for ordinary calculations.
- Prefer `useEffectEvent`, `startTransition`, and `useDeferredValue` when they clarify event or effect boundaries or keep interactions responsive.
- Do not add `useMemo` or `useCallback` by default unless profiling or an established repo convention shows that they earn their keep.
- Avoid hand-maintained variant unions that duplicate a const dictionary used for rendering badges, tabs, labels, or route metadata; derive those types from the value instead.

### Library recommendations

- Keep library additions rare and intentional.
- For component-heavy React apps that need a ready-made system, prefer MUI with `@emotion/react` and `@emotion/styled`; if that stack needs icons, prefer `@mui/icons-material`.
- Prefer `zod` for runtime schema validation at form, URL, persistence, and network boundaries.
- Prefer `@tanstack/react-query` for async server state, caching, invalidation, and background refresh when that complexity is real.
- Avoid mixing styling systems casually; if an app already uses a component and theme system such as MUI, do not add Tailwind or a second styling stack without a repo-wide reason.

## Validation

- Components have a clear owner for local UI state, derived values, async state, and validation.
- Effects synchronize with external systems rather than duplicating render-time derivations.
- Library choices match concrete needs and avoid mixed-stack sprawl.
- Extracted hooks or child components improve readability instead of hiding simple logic.

## References

- React Documentation: <https://react.dev/>
- MUI Documentation: <https://mui.com/material-ui/getting-started/>
- TanStack Query Documentation: <https://tanstack.com/query/latest/docs>
- Zod Documentation: <https://zod.dev/>
- date-fns Documentation: <https://date-fns.org/>
- Read `./references/checklist.md` for a quick React review pass.
- Read `./references/library-recommendations.md` when choosing React dependencies or checking whether a library addition is justified.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for component, hooks, and React-library prompts.
- Review `./evals/evals.json` when validating output quality for React conventions and dependency guidance.
