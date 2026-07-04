---
name: ref-sp-dev-semantic-versioning
description: "Portable semantic-versioning guidance for release numbering, prerelease handling, dependency range selection, and package.json dependency fields. Use when: choosing a version bump, reviewing semver compliance, setting npm version ranges, or deciding between dependencies, devDependencies, peerDependencies, optionalDependencies, and overrides."
license: MIT
metadata:
  owner-prefix: "sp"
  owner: "swiftpostlab/agentic-tools"
  scope: "dev"
  visibility: "public"
  tags: "release"
---

# Semantic Versioning

## Purpose

Provide portable defaults for assigning semantic versions and choosing dependency specifiers without drifting into version lock, version promiscuity, or misleading release numbers.

## When to use this skill

- Choosing whether a change is a major, minor, patch, or prerelease bump.
- Reviewing whether a release or dependency range is actually semver-compatible.
- Deciding how to express npm or package.json dependency constraints.
- Choosing between `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`, and `overrides`.
- Explaining why a `^`, `~`, `x`, or exact range behaves differently than expected.

## Scope Boundaries

- This skill owns version *numbering* meaning and dependency-range and dependency-field selection.
- Use `.agents/skills/ref-sp-dev-package-management/SKILL.md` for the release workflow: version source of truth, multi-manifest sync, changelog policy, and registry publishing.
- Use `.agents/skills/ref-sp-py-commitizen/SKILL.md` when the release is driven by the Python `commitizen` tool (`cz bump`, version providers, generated changelogs).

## Defaults

- Use strict `MAJOR.MINOR.PATCH` versions with no leading zeroes.
- Start from the public API, not from implementation churn, when deciding the bump level.
- Treat `0.y.z` as unstable initial development where the public API is not yet stable.
- Use prerelease identifiers such as `-alpha.1`, `-beta.1`, or `-rc.1` for releases that are intentionally not final.
- Prefer ranges that match the actual compatibility promise instead of pinning or widening by habit.
- Keep runtime packages in `dependencies`, build and test tooling in `devDependencies`, host compatibility in `peerDependencies`, optional integrations in `optionalDependencies`, and dependency-tree surgery in root `overrides`.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Choose a version bump | Map the change to major, minor, patch, or prerelease. | SemVer is meaningful only when the version reflects the compatibility impact on users. | When preparing a release, changelog entry, or version proposal. | The next version communicates the real compatibility change. |
| Select a range specifier | Pick `^`, `~`, exact, `x`, comparator, or compound ranges intentionally. | Range syntax changes how much future surface consumers accept. | When editing dependency specs or reviewing update policy. | The dependency policy matches the project’s compatibility expectations. |
| Place a dependency in the right field | Choose `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`, or `overrides`. | A correct range in the wrong field still produces the wrong install behavior. | When adding or refactoring package metadata. | Consumers and contributors install the right packages for the right reasons. |

## Core Rules

### Version meaning

- Increment `MAJOR` for backward-incompatible public API changes.
- Increment `MINOR` for backward-compatible functionality additions and for deprecations that users need to see before removal.
- Increment `PATCH` for backward-compatible bug fixes.
- Reset lower-order parts when bumping a higher-order part: `1.4.9 -> 1.5.0`, `1.4.9 -> 2.0.0`.
- Once a version is released, do not mutate its contents. Publish a new version instead.

### Public API first

- Decide the bump based on the public contract, not on how large the internal diff feels.
- If the package has no declared public surface, define that before claiming semver discipline.
- If users rely on behavior that is being removed or changed incompatibly, it is a major change even when the code diff is small.

### Major zero and 1.0.0

- Treat `0.y.z` as unstable initial development; anything may change and consumers should not assume a stable API.
- Do not use `0.x` as an excuse for sloppy release semantics. The version should still communicate change magnitude as honestly as possible.
- Move to `1.0.0` once the public API is intended to be stable and compatibility matters.

### Prerelease and build metadata

- Use prerelease identifiers after a hyphen, such as `1.4.0-beta.2`, for unstable release candidates.
- Prerelease versions sort lower than the corresponding final release: `1.4.0-beta.2 < 1.4.0`.
- Build metadata after `+` does not affect precedence: `1.4.0+build.7` and `1.4.0+build.8` compare equal for ordering.
- Do not assume prereleases satisfy ordinary ranges; most semver tooling excludes them unless the range opts in or the tool explicitly includes prereleases.

### Range selection

- Use an exact version when compatibility must be identical, not merely similar.
- Use `~` when patch-level updates are acceptable but automatic minor updates are not.
- Use `^` when changes are allowed up to the next incompatible release boundary.
- Remember that caret behavior is narrower below `1.0.0`:
  - `^1.2.3` means `>=1.2.3 <2.0.0`
  - `^0.2.3` means `>=0.2.3 <0.3.0`
  - `^0.0.3` means `>=0.0.3 <0.0.4`
- Remember that tilde allows patch movement within the current minor line:
  - `~1.2.3` means `>=1.2.3 <1.3.0`
  - `~1.2` means `>=1.2.0 <1.3.0`
- Use `x` or `*` ranges only when the larger compatibility window is intentional rather than convenient.
- Use comparator sets or `||` only when a simpler contiguous range cannot express the real compatibility policy.

### package.json dependency fields

- Put runtime requirements in `dependencies`.
- Put lint, test, build, and local development tooling in `devDependencies`.
- Put host-package compatibility in `peerDependencies`, especially for plugins or adapters.
- Keep `peerDependencies` as broad as the supported host API allows; over-narrow peer ranges cause unnecessary install conflicts.
- Put optional runtime integrations in `optionalDependencies` only if the code works when they are absent.
- Use `overrides` at the project root when you must force or replace transitive dependency versions.

### Portable dependency policy

- Libraries should usually declare the broadest range they have actually validated, because dependents need upgrade headroom.
- Applications can keep direct dependency specs tighter because the app owner controls the whole deployed artifact, typically with a lockfile enforcing the concrete install.
- Do not put build-only tools in `dependencies` just because they run in CI.
- Do not use local-path specs as a publishing strategy for public packages.

## Gotchas

- `v1.2.3` is a common tag name, but the semantic version itself is `1.2.3`.
- A tiny code change can still be a major release if it breaks the public contract.
- `^0.x` ranges are much narrower than many people assume.
- Prerelease versions do not automatically satisfy normal stable ranges.
- An exact dependency spec does not replace a lockfile; it only constrains the declared acceptable version.
- `optionalDependencies` do not make missing-code paths safe by themselves; the application must handle absence explicitly.

## Validation

- The proposed bump matches the user-visible compatibility impact on the declared public API.
- Lower-order version parts are reset correctly after minor or major bumps.
- Prerelease versus final-release behavior is intentional and documented.
- Dependency ranges reflect the real compatibility policy, especially for `0.x` packages.
- Every package entry is in the correct package.json field for its runtime role.

## References

- Semantic Versioning 2.0.0: <https://semver.org/>
- npm semver reference: <https://docs.npmjs.com/cli/v6/using-npm/semver>
- npm package.json dependency fields: <https://docs.npmjs.com/cli/v10/configuring-npm/package-json?v=true#dependencies>
- Read `./references/checklist.md` for a quick semver review pass.
