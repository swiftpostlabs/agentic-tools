# Review Checklist

## Configuration

- Native configuration lives in app config, or in a config plugin when it cannot.
- `ios/` and `android/` are gitignored, not committed, and not hand-edited.
- `app.config.ts` is used and typed when the config needs logic or environment input.
- Any decision to commit native directories is deliberate and documented, not accidental drift.

## Dependencies and versions

- Packages were added with `npx expo install`, not a raw package-manager add.
- The SDK compatibility check runs in CI and fails the pipeline on drift.
- The package manager matches the repo convention and `expo install` drives it.
- Native-code dependencies were weighed against the SDK-upgrade cost they impose.

## Development workflow

- A development build is used wherever native modules beyond the prebuilt client are involved.
- "Works in one client, not the other" was diagnosed as a client mismatch before deeper debugging.

## Routing

- Route files are thin; reusable UI and logic live in feature modules.
- Every route is treated as a possible deep-link entry point.
- No Next.js-specific semantics were assumed from the shared file-based convention.

## Delivery

- The change was classified as update-versus-build using what the native output would be.
- Runtime version changed if native code changed.
- Build profiles for development, preview, and production are distinct and explicit.
- Rollback path is known; production rollout is staged where available.
- Permission usage strings are declared for every permission requested.

## Secrets

- No credential is in app config, in the repo, or in a bundled client value.
- Build-time secrets live in the build service's encrypted environment.
- Public-prefixed environment values are treated as configuration, not as secrets.

## Freshness

- No SDK number, version pairing, or CLI flag was asserted from memory.
- Current facts came from the documentation index, or from a page fetched as markdown.
- No guidance was written in terms of "ejecting" or "managed versus bare workflow", which are
  deprecated concepts.
