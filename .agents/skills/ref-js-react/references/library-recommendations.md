# Library Recommendations

## Dependency rule

- Start with `react`, `react-dom`, and platform APIs.
- Add a dependency only when it deletes code, removes a recurring failure mode, or gives a capability the platform does not provide cleanly.
- Prefer one default library per concern rather than keeping multiple overlapping options open.
- For Node-based React projects, prefer Yarn for installs and scripts unless the repo is intentionally Deno-owned.

## UI and styling

- For component-heavy React apps that need a ready-made design system, default to `@mui/material` with `@emotion/react` and `@emotion/styled`.
- If the repo already has a design system or component library, stay inside that system instead of mixing multiple component stacks.
- When the stack is MUI, prefer `@mui/icons-material` for icons.
- Avoid mixing Tailwind with MUI unless the repo has already standardized on that combination.

## Validation and data boundaries

- Prefer `zod` when forms, search params, persisted data, or network payloads need runtime validation and inferred types.
- Keep schemas close to the feature that owns the trust boundary.

## Async server state

- Prefer `@tanstack/react-query` when the UI needs caching, invalidation, background refresh, optimistic updates, or request deduplication.
- Do not add it for one-off fetches that can stay inside a small feature without those lifecycle concerns.

## Dates

- Prefer native `Date` and `Intl` for basic formatting, trusted ISO parsing, and simple comparisons.
- Reach for `date-fns` only when date arithmetic, ranges, locale helpers, or formatting complexity starts to obscure the feature code.

## Non-defaults

- Avoid adding multiple overlapping state, form, or styling libraries to the same small feature.
- If the app is Next.js and the question is about i18n, routing, metadata, or framework integration, load `.agents/skills/ref-js-next/SKILL.md`.
- If a new dependency is not one of these defaults, document why the default did not fit.
