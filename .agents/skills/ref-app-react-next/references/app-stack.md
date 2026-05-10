# App Stack Baseline

## Baseline choices

- For a full React and Next app, default to `next`, `react`, `react-dom`, and `typescript`.
- Use Yarn as the default package manager and script runner for the Node-based app workflow.
- Keep framework-sensitive dependency choices delegated to the framework reference skills:
  - `.agents/skills/ref-react/SKILL.md` for UI system, validation, async server state, and date-library choices.
  - `.agents/skills/ref-next/SKILL.md` for App Router integrations such as `next-intl` and MUI's Next wiring.

## Structure rule

- Start with a small app shell and add folders only when they earn their keep.
- Keep route entry files thin and put reusable feature logic outside the route tree.
- Keep maintenance scripts, migrations, and scaffolding outside the main app source tree.

## Escalation rule

- If the requirement is a browser-only tool that can stay no-build, use `.agents/skills/ref-app-web-standalone/SKILL.md` instead of creating a full app.
- If the requirement already needs routing, app-wide navigation, SSR or RSC boundaries, or full app deployment concerns, the full React and Next baseline is justified.
