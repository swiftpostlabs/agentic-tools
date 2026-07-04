# Review Checklist

- The app stays understandable with semantic HTML, clear CSS structure, and readable JavaScript.
- A single file remains single-file only when that still improves comprehension.
- `.mjs` is used only when an extracted browser module boundary is real, and colocated userscripts still keep `.user.js` or `.user.ts` naming.
- Repeated values, selectors, and DOM hooks are named rather than scattered inline.
- The app works on both desktop and mobile without hidden framework assumptions.
- Local assets are extracted only when that clearly reduces complexity.
- The app does not add a build pipeline or Node package manager unless that escalation is genuinely justified.
- If Node-based tooling becomes necessary, Yarn is the explicit package manager for the JS or TS workflow.
