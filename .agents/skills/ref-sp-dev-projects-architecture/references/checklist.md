# Review Checklist

- Product code lives in feature-owned paths instead of maintenance folders.
- Shared utilities exist because of real reuse, not speculative abstraction.
- Feature boundaries are easy to identify and avoid circular dependencies.
- In multi-package repos, each package owns its own `src/` tree instead of reaching through peer-package internals.
- Scripts, migrations, and repo automation stay separate from shipped product code.
- Tests sit close enough to the owning feature that maintenance cost stays low.
