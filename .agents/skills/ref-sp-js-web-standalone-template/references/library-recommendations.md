# Library Recommendations

## UI defaults for no-build apps

- For richer no-build UI, prefer browser-loadable libraries instead of re-creating every control from scratch.
- Ask the user which of these two defaults they prefer when a UI library would help:
  - `Web Awesome` plus `Font Awesome`
  - `mdui` 2 plus the Google `Material Icons` font
- Fall back to fully vanilla HTML and CSS only when the app is intentionally minimal or the user explicitly wants no UI library.

## Utility libraries

- Prefer `zod` only when runtime schema validation adds clear value for imported, pasted, or persisted data.
- Prefer native `Date` and `Intl` first, and reach for `date-fns` only when date logic becomes genuinely complex.
- Do not pull in React or a full framework just to make a browser app feel more app-like; if the problem truly crossed that boundary, move to `.agents/skills/ref-sp-js-next-template/SKILL.md`.

## Delivery rule

- For no-build apps, prefer browser-loadable CDN or ESM CDN delivery over introducing a local package pipeline.
- If the app does cross into Node-based tooling, use Yarn as the explicit package manager.
