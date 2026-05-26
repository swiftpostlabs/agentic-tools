# Package Management Checklist

Use this when reviewing a repo's version-management workflow.

- Confirm the repo has exactly one version source of truth.
- Confirm contributors are not expected to hand-edit multiple version-bearing files.
- Confirm derived manifests and any lockfiles that store the root version can be synced in one command.
- Confirm there is a drift check that fails normal validation when versions diverge.
- Confirm `CHANGELOG.md` exists at the repo root and has an `Unreleased` section.
- Confirm changelog entries summarize user-visible changes rather than raw implementation diffs.
- Confirm bump semantics are documented separately from package-sync mechanics when both concerns exist.
- Confirm the release-intent model is deliberate: commit-derived changelogs for disciplined conventional commits, or explicit intent files when commit history is not the right release-note source.
- Confirm CI publishing uses trusted publishers and OIDC where supported instead of long-lived publish tokens.
- Confirm npm provenance is enabled or automatically provided when supported, and unavailable cases are documented.
- Confirm npm staged publishing is considered for high-security packages that already exist on npm and need 2FA approval before going live.
- Confirm Dependabot release automation does not publish dev-only dependency churn unless that is an intentional release policy.
