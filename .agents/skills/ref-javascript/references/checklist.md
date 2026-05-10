# Review Checklist

- Shared helpers and non-trivial objects use JSDoc where it materially improves readability.
- Browser code, CLI code, and Node scripts each keep their responsibilities explicit.
- DOM queries, selectors, and injected identifiers are named rather than repeated inline.
- External input is validated before business logic depends on it.
- The code stays readable without importing TypeScript-only habits that do not fit plain JavaScript.