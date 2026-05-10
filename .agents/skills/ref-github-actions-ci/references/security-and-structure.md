# Security And Structure Notes

## Recommended workflow shape

- Keep validation, packaging, and deployment in separate jobs or workflows when their trust boundaries differ.
- Use reusable workflows only when the same job graph is needed in more than one repository or entry point.
- Prefer repository-local scripts over long inline shell when the logic is non-trivial.

## High-risk patterns to review carefully

- `pull_request_target` workflows that also check out or execute code from the pull request branch.
- Workflows with broad `write-all` permissions when only one job needs one write scope.
- Third-party actions pinned only to floating branches like `main`.
- Self-hosted runners exposed to public or fork-triggered workflows.
- Inline shell that injects raw PR titles, branch names, issue text, or other event fields into the script source.

## Safe defaults

- Prefer `pull_request` for CI validation.
- Prefer `permissions: read-all` or a minimal explicit map, then elevate single jobs if necessary.
- Prefer full commit SHA pins for third-party actions.
- Prefer GitHub-hosted runners unless there is a strong operational reason not to.
- Prefer OIDC over stored cloud credentials where supported.
