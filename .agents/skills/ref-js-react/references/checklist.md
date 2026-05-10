# Review Checklist

- Components and hooks have clear ownership boundaries instead of mixing rendering, effects, mutations, and validation in one place.
- State lives at the narrowest level that actually needs to read or update it.
- Effects synchronize external systems rather than recomputing ordinary derived values.
- Library additions are justified and match the default recommendations for the actual problem.
- The UI and styling stack is coherent instead of mixing overlapping systems casually.
- Query or mutation abstractions are used only when caching, invalidation, retries, or background refresh genuinely matter.
- Date helpers and validation libraries appear only where native APIs or small local helpers stop being clear.
