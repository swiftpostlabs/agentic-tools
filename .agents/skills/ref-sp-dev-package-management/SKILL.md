---
name: ref-sp-dev-package-management
description: "Portable package-management guidance for coordinating versions across multiple manifests, keeping changelogs current, and choosing one source of truth for release metadata. Use when: syncing package versions across pyproject.toml and package.json, defining a changelog workflow, or designing a release-management command for a multi-ecosystem repo."
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

## Purpose

Provide portable defaults for keeping package metadata, version sources, changelogs, and release commands aligned when a repository spans more than one package-management surface.

## When to use this skill

- Designing or revising a repo's version-management workflow.
- Keeping `pyproject.toml`, `package.json`, lockfiles, and related metadata in sync.
- Choosing whether one manifest or a dedicated `VERSION` file should own the release version.
- Adding or reviewing changelog conventions.
- Defining a contributor-facing command for version bumps or release prep.
- Choosing between commit-derived release automation and explicit release-intent files such as Changesets.
- Designing secure registry publishing with trusted publishers, OIDC, npm provenance, or npm staged publishing.

## Scope Boundaries

- Use `ref-sp-dev-semantic-versioning` when deciding the meaning of a bump level or a dependency range.
- Use `ref-sp-py-commitizen` when the release workflow specifically uses the Python `commitizen` package, `cz bump`, Commitizen version providers, or Commitizen-generated changelogs.
- Use `ref-sp-dev-github-actions-ci` for GitHub workflow triggers, `id-token: write`, release job permissions, runner trust, and action pinning.
- Use `ref-sp-dev-github-dependabot` for Dependabot grouping, metadata, automerge, and safe PR automation.
- Use this skill for workflow, source-of-truth, manifest-alignment, and changelog policy.

## Defaults

- Keep one version source of truth.
- In multi-manifest repos, prefer a dedicated `VERSION` file when neither ecosystem should dominate the other.
- If the repo already enforces conventional commits and one release tool can update every version-bearing surface consistently, prefer that tool over maintaining a second custom bump script.
- Prefer explicit release-intent files, such as Changesets, when commit history is too noisy to be the release-note source, when the repo is a monorepo, or when contributors need to declare the bump and summary before merge.
- Sync derived manifests from that source of truth with one explicit command instead of hand-editing several files.
- Add a validation command so version drift fails fast in normal repo checks.
- Keep a root `CHANGELOG.md` with an `Unreleased` section and versioned release sections.
- Prefer generated changelog entries from commit history when commit discipline is enforced and the output quality is acceptable; treat manual curation as the exception, not the default.
- Update the changelog in the same change as the version bump or release-prep work.
- Prefer registry trusted publishing with short-lived OIDC credentials over long-lived publish tokens whenever PyPI, npm, or the active registry supports it.
- For public npm packages published from supported CI, keep provenance enabled; with npm trusted publishing this is generated automatically for supported public package/public repository cases.
- Consider `npm stage publish` instead of direct `npm publish` when the package already exists and maintainers want a 2FA-backed approval step before the version goes live.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Choose a version authority | Pick the one file or manifest that owns the project version. | Multiple editable version sources inevitably drift without a clear owner. | When the repo has more than one publishable or package-managed surface. | Every other version-bearing file is derived from one canonical value. |
| Choose a release-intent model | Decide whether releases are inferred from commits or declared through intent files. | Changelogs and bumps should reflect user-facing intent, not accidental commit shape. | When adopting or revising release automation. | The release tool matches the team's contribution and review workflow. |
| Sync derived metadata | Rewrite secondary manifests and lockfile metadata from the source of truth. | Manual multi-file edits create avoidable release errors. | When bumping, setting, or validating the repo version. | Version-bearing files agree across ecosystems. |
| Maintain the changelog | Keep `Unreleased` and released version sections current. | Version numbers alone do not explain what changed or why users should care. | When preparing a release or landing user-visible behavior changes. | The changelog explains the version history instead of merely recording numbers. |
| Configure trusted publishing | Register the release workflow with the registry and grant OIDC token permissions only to publish jobs. | Long-lived publish tokens are hard to rotate and easy to leak. | When publishing from CI to PyPI, npm, or another OIDC-capable registry. | CI can publish with short-lived credentials and no stored write token. |

## Core Rules

### Source of truth

- Choose exactly one authoritative version source.
- If the repo publishes through one ecosystem only, that manifest can usually be the source of truth.
- If the repo spans multiple ecosystems equally, a dedicated `VERSION` file is often simpler and more neutral.
- Do not ask contributors to hand-edit multiple version fields and trust memory to keep them aligned.

### Automation

- Provide one contributor-facing command for version changes.
- Support both exact version setting and routine stable bumps when the release workflow needs both.
- Prefer one release-prep command that updates the version and changelog together when the toolchain can do so reliably.
- Add a check command that fails when derived metadata drifts from the source of truth.
- Keep the sync logic deterministic and file-local; version management should not require network access.
- Keep fallback custom scripts only for the gaps the main release tool cannot cover.
- Do not switch from a working Commitizen, release-please, semantic-release, or custom release-prep flow to Changesets solely because Changesets is popular; switch when explicit per-change intent fixes a real release-note, monorepo, or contributor-workflow problem.
- If using Changesets outside a normal npm package or workspace, add a small deterministic version script that calls `changeset version` and then updates non-npm metadata such as `pyproject.toml`, `VERSION`, or lockfile data.

### Manifest and lockfile alignment

- Sync every manifest that exposes the project version, not just the most visible one.
- If the repo commits lockfiles and they record the root package version, keep them aligned too.
- Remember that drift can hide in generated metadata, not only in top-level manifests.
- Keep package names and versions coherent across ecosystems when the repo is presenting one shared project.

### Changelog workflow

- Keep the changelog at the repo root as `CHANGELOG.md`.
- Start with an `Unreleased` section so pending changes have a stable place to accumulate.
- When cutting a release, move the relevant entries from `Unreleased` into a versioned section.
- Prefer generated release entries when the repository enforces conventional commits or an equivalent structured history.
- Prefer explicit release-intent summaries when commit messages are too implementation-focused, when squash commits flatten important context, or when dependency-update automation needs a predictable user-facing note.
- Prefer concise user-facing summaries over internal implementation noise.

### Registry publishing

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
- A changelog that is updated only after release is usually already stale.
- Multi-ecosystem repos become confusing when one manifest version changes and another stays behind.
- Changesets is primarily npm-oriented. It can coordinate non-npm packages through custom scripts, but that is an integration choice, not automatic Python package support.
- npm staged publishing cannot publish a brand-new package for the first time; the package must already exist on the registry.
- npm trusted publishing currently requires a supported CI provider and runner setup, and provenance is limited by repository and package visibility constraints.
- A workflow that can mint an OIDC token can publish if the registry trust rule matches; keep workflow filenames, environments, and job permissions reviewed like release infrastructure.

## Validation

- There is exactly one version source of truth or one unambiguous release tool that deterministically updates every version-bearing file.
- Contributors have one explicit command for version changes.
- Derived manifests and any relevant lockfiles stay synchronized.
- `CHANGELOG.md` exists, includes `Unreleased`, and reflects user-visible changes.
- The workflow states where semver decisions come from instead of mixing bump meaning with file-sync mechanics.
- Release automation uses short-lived registry credentials where available, and long-lived publish tokens are absent or documented as a deliberate fallback.
- npm publishing either uses provenance-capable trusted publishing or documents why provenance is unavailable.
- If npm staged publishing is used, the plan includes the human approval path and 2FA requirement.

## References

- Read `ref-sp-dev-semantic-versioning` for bump semantics and dependency-range guidance.
- Read `ref-sp-py-commitizen` for Commitizen-specific release command and configuration guidance.
- Read `ref-sp-dev-github-actions-ci` for workflow permissions, OIDC, runner, and release job hardening.
- Read `ref-sp-dev-github-dependabot` for dependency-update PR automation and automerge guardrails.
- Read `./references/checklist.md` for a quick package-management review pass.
