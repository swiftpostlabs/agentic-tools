# Semantic Versioning Checklist

Use this when you need a fast pass on a version bump or dependency spec.

- Confirm the public API or compatibility promise that the version is supposed to represent.
- Confirm the chosen bump matches the real impact: breaking change, backward-compatible feature, or backward-compatible fix.
- Confirm lower-order parts reset correctly after minor or major bumps.
- Confirm prerelease identifiers are used only for intentionally unstable releases.
- Confirm dependency ranges reflect real support boundaries, especially for `0.x` packages.
- Confirm prerelease handling is intentional if ranges or tooling need to include prerelease versions.
- Confirm each package entry is in the right field: `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`, or `overrides`.
- Confirm exact pins, broad ranges, or comparator unions are justified instead of inherited by habit.
