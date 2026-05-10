# Review Checklist

- Shared helpers and non-trivial objects use JSDoc where it materially improves readability.
- Browser code, CLI code, and Node scripts each keep their responsibilities explicit.
- In multi-package repos, JavaScript code stays under the owning package's `src/` tree instead of drifting into shared buckets by default.
- DOM queries, selectors, and injected identifiers are named rather than repeated inline.
- External input is validated before business logic depends on it.
- The code stays readable without importing TypeScript-only habits that do not fit plain JavaScript.
