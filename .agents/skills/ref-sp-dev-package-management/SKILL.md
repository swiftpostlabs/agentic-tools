---
name: ref-sp-dev-package-management
description: "Keeping a multi-manifest repo's version, changelog, and release in step: one version source, a sync and drift check, changelog workflow, Changesets vs commit-derived releases, and trusted registry publishing. Use when designing or fixing a release workflow."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "release"
  shareable-skills.requires: "ref-sp-dev-semantic-versioning"
---

# Package Management

How release metadata stays consistent across `pyproject.toml`, `package.json`, lockfiles, and the
changelog. What a bump *means* is `ref-sp-dev-semantic-versioning`; Commitizen specifics are
`ref-sp-py-commitizen`; release-job permissions and runners are `ref-sp-dev-github-actions-ci`;
Dependabot PR automation is `ref-sp-dev-github-dependabot`.

## Source of truth

- Choose exactly one authoritative version source, or one release tool that deterministically
  updates every version-bearing file.
- If the repo publishes through one ecosystem only, that manifest can usually be the source of truth.
- If the repo spans multiple ecosystems equally, a dedicated `VERSION` file is often simpler and more neutral.
- Do not ask contributors to hand-edit multiple version fields and trust memory to keep them aligned.

## Automation

- Provide one contributor-facing command for version changes.
- Support both exact version setting and routine stable bumps when the release workflow needs both.
- Prefer one release-prep command that updates the version and changelog together when the toolchain can do so reliably.
- Add a check command that fails when derived metadata drifts from the source of truth.
- Keep the sync logic deterministic and file-local; version management should not require network access.
- If conventional commits are enforced and one release tool can update every version-bearing
  surface, use it instead of a custom bump script; keep custom scripts only for its gaps.
- Do not switch from a working Commitizen, release-please, semantic-release, or custom release-prep flow to Changesets solely because Changesets is popular; switch when explicit per-change intent fixes a real release-note, monorepo, or contributor-workflow problem.
- If using Changesets outside a normal npm package or workspace, add a small deterministic version script that calls `changeset version` and then updates non-npm metadata such as `pyproject.toml`, `VERSION`, or lockfile data.

## Manifest and lockfile alignment

- Sync every manifest that exposes the project version, not just the most visible one.
- If the repo commits lockfiles and they record the root package version, keep them aligned too.
- Remember that drift can hide in generated metadata, not only in top-level manifests.
- Keep package names and versions coherent across ecosystems when the repo is presenting one shared project.

## Changelog workflow

- Keep the changelog at the repo root as `CHANGELOG.md`.
- Start with an `Unreleased` section so pending changes have a stable place to accumulate.
- When cutting a release, move the relevant entries from `Unreleased` into a versioned section.
- Update the changelog in the same change as the version bump or release prep; one updated after
  the release is already stale.
- Prefer generated entries when the repository enforces conventional commits or an equivalent
  structured history; manual curation is the exception.
- Prefer explicit release-intent files such as Changesets when:
  - the repo is a monorepo, or contributors should declare the bump and summary before merge;
  - commit messages are too implementation-focused, or squash commits flatten context;
  - dependency-update automation needs a predictable user-facing note.
- Prefer concise user-facing summaries over internal implementation noise.

## Registry publishing

- Configure trusted publishers in the registry UI or API with the exact repository, workflow filename, and optional deployment environment expected by the release workflow.
- Grant `id-token: write` only to jobs that actually publish or stage packages.
- Keep release workflows on GitHub-hosted or otherwise registry-supported runners when the registry's OIDC implementation requires that trust boundary.
- For PyPI, prefer PyPI Trusted Publishing over stored API tokens; build distributions in CI and publish through a trusted workflow or an OIDC-capable publish command.
- For npm, prefer trusted publishing over automation tokens and ensure `package.json` repository metadata exactly matches the GitHub repository used by the trusted publisher.
- For npm direct publishing, rely on trusted-publishing provenance when available or explicitly enable provenance for supported CI providers.
- For npm staged publishing, use `npm stage publish` from CI and require a maintainer to inspect and approve the staged package with 2FA through the CLI or npmjs.com.

## Gotchas

- A single bump command without a matching drift check still allows silent regressions later.
- Lockfiles may record the root package version even when dependencies did not change.
- Multi-ecosystem repos become confusing when one manifest version changes and another stays behind.
- Changesets is primarily npm-oriented. It can coordinate non-npm packages through custom scripts, but that is an integration choice, not automatic Python package support.
- npm staged publishing cannot publish a brand-new package for the first time; the package must already exist on the registry.
- npm trusted publishing currently requires a supported CI provider and runner setup, and provenance is limited by repository and package visibility constraints.
- A workflow that can mint an OIDC token can publish if the registry trust rule matches; keep workflow filenames, environments, and job permissions reviewed like release infrastructure.

## Before finishing

- The workflow says where semver decisions come from, separately from the file-sync mechanics.
- Long-lived publish tokens are absent, or documented as a deliberate fallback.
- If npm staged publishing is used, the human 2FA approval path is written down.

## References

- Read `./references/checklist.md` for a quick package-management review pass.
