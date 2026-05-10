# Review Checklist

- The metadata block uses the narrowest `@match`, `@grant`, and startup settings that satisfy the task.
- The userscript filename clearly signals `.user.js` or `.user.ts`, and TypeScript-authored userscripts have the ambient globals support they need.
- UI injection, styles, and event listeners are idempotent.
- Selectors, storage keys, and injected identifiers are centralized and namespaced.
- Dynamic-page handling prefers observers or targeted state checks over blind polling loops.
- Failures degrade cleanly when the host page structure changes.
