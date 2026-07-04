# Review Checklist

- The workflow uses deliberate triggers rather than firing on every event by default.
- Required checks are not accidentally skipped by over-aggressive branch or path filters.
- Jobs and matrices reflect real validation or release boundaries.
- Workflow or job `concurrency` is present where stale runs would otherwise pile up.
- `permissions` are explicit and least-privileged.
- Third-party actions or reusable workflows are pinned and trusted intentionally.
- Fork, Dependabot, and untrusted PR execution paths do not assume secrets or write permissions.
- Runner choice matches the repository trust boundary and performance needs.
