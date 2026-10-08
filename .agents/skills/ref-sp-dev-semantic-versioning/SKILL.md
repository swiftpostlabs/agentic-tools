---
name: ref-sp-dev-semantic-versioning
description: "What a version number means and which dependency range to write: major/minor/patch from the public API, 0.x and prereleases, ^ ~ and exact ranges, and the right package.json dependency field. Use when choosing a bump or a dependency spec."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "release"
---

# Semantic Versioning

Semver meaning and dependency specs. The release workflow itself (version source, manifest sync,
changelog, publishing) is `ref-sp-dev-package-management`; Commitizen-driven releases are
`ref-sp-py-commitizen`.

## Version meaning

- Versions are strict `MAJOR.MINOR.PATCH` with no leading zeroes.
- Increment `MAJOR` for backward-incompatible public API changes.
- Increment `MINOR` for backward-compatible functionality additions and for deprecations that users need to see before removal.
- Increment `PATCH` for backward-compatible bug fixes.
- Reset lower-order parts when bumping a higher-order part: `1.4.9 -> 1.5.0`, `1.4.9 -> 2.0.0`.
- Once a version is released, do not mutate its contents. Publish a new version instead.

## Public API first

- Decide the bump based on the public contract, not on how large the internal diff feels.
- If the package has no declared public surface, define that before claiming semver discipline.
- If users rely on behavior that is being removed or changed incompatibly, it is a major change even when the code diff is small.

## Major zero and 1.0.0

- Treat `0.y.z` as unstable initial development; anything may change and consumers should not assume a stable API.
- Do not use `0.x` as an excuse for sloppy release semantics. The version should still communicate change magnitude as honestly as possible.
- Move to `1.0.0` once the public API is intended to be stable and compatibility matters.

## Prerelease and build metadata

- Use prerelease identifiers after a hyphen, such as `1.4.0-beta.2`, for unstable release candidates.
- Prerelease versions sort lower than the corresponding final release: `1.4.0-beta.2 < 1.4.0`.
- Build metadata after `+` does not affect precedence: `1.4.0+build.7` and `1.4.0+build.8` compare equal for ordering.
- Do not assume prereleases satisfy ordinary ranges; most semver tooling excludes them unless the range opts in or the tool explicitly includes prereleases.

## Range selection

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

## package.json dependency fields

- Put runtime requirements in `dependencies`.
- Put lint, test, build, and local development tooling in `devDependencies`.
- Put host-package compatibility in `peerDependencies`, especially for plugins or adapters.
- Keep `peerDependencies` as broad as the supported host API allows; over-narrow peer ranges cause unnecessary install conflicts.
- Put optional runtime integrations in `optionalDependencies` only if the code works when they are absent.
- Use `overrides` at the project root when you must force or replace transitive dependency versions.

## Portable dependency policy

- Libraries should usually declare the broadest range they have actually validated, because dependents need upgrade headroom.
- Applications can keep direct dependency specs tighter because the app owner controls the whole deployed artifact, typically with a lockfile enforcing the concrete install.
- Do not put build-only tools in `dependencies` just because they run in CI.
- Do not use local-path specs as a publishing strategy for public packages.

## Gotchas

- `v1.2.3` is a common tag name, but the semantic version itself is `1.2.3`.
- An exact dependency spec does not replace a lockfile; it only constrains the declared acceptable version.
- `optionalDependencies` do not make missing-code paths safe by themselves; the application must handle absence explicitly.

## Before finishing

- Prerelease vs final behaviour is intentional and stated.

## References

- Semantic Versioning 2.0.0: <https://semver.org/>
- npm semver reference: <https://docs.npmjs.com/cli/v6/using-npm/semver>
- npm package.json dependency fields: <https://docs.npmjs.com/cli/v10/configuring-npm/package-json?v=true#dependencies>
- Read `./references/checklist.md` for a quick semver review pass.
