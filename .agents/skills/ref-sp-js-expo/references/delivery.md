# Shipping an Expo App

Read this when planning a release, deciding between an over-the-air update and a store build, or
reasoning about runtime versions and rollout risk.

Mechanics change between SDK releases. This file covers the **decision model**, which is stable.
Fetch current commands and configuration from `https://docs.expo.dev/llms.txt`, appending `.md` to any
page URL.

## The central question: update or build?

Every change goes out one of two ways, and picking wrong is the most expensive mistake in this area.

| The change | Delivery |
| --- | --- |
| JavaScript logic, copy, translations, styling, layout | Over-the-air update |
| Images and other bundled assets | Over-the-air update |
| A new dependency containing native code | New build |
| A permission added or changed | New build |
| App icon, splash, name, bundle identifier | New build |
| SDK or React Native version change | New build |
| Anything requiring prebuild to produce different native output | New build |

The test is simple: **if the native project would come out different, it needs a build.** If only the
JavaScript bundle changes, it can go over the air.

## Runtime versions are the compatibility contract

An over-the-air update is a JavaScript bundle served to an already-installed binary. Nothing checks
at runtime whether that bundle's expectations match the binary's native capabilities — the runtime
version is what enforces it.

- A binary advertises a runtime version. An update is published against a runtime version. A build
  only receives updates matching its own.
- **Change the runtime version whenever native code changes.** Otherwise a new update reaches an old
  binary, calls a native module that binary does not contain, and crashes on launch.
- The failure mode is nasty: it appears after release, on users' devices, on the subset that had the
  older build. It does not reproduce for whoever shipped it.
- Version policies can derive the runtime version automatically from app config or the SDK version.
  Prefer a policy over a hand-maintained string — hand-maintained values get forgotten in exactly the
  commit where they mattered.

## Channels, branches, and profiles

Keep the environments distinct and named:

- **Development** — a development build with the dev client, used day to day.
- **Preview** — an internal distribution build for the team or QA, matching production configuration
  closely enough to be meaningful.
- **Production** — the store build.

Build profiles should differ only in ways you can state out loud. A preview profile that quietly
differs from production in signing, environment, or optimization produces a test that did not test
the thing you shipped.

Updates are published to a branch, and a channel maps a build to a branch. Keep that mapping explicit
so "which JavaScript is this binary running" always has an answer.

## Rollout risk

An update reaches users in minutes without review. That is the feature and the hazard.

- Prefer staged rollout for production updates where it is available, so a defect meets a fraction of
  the user base.
- Know the rollback path **before** shipping — republishing a previous update is the usual mechanism.
- Watch for crash-on-launch specifically. An update that crashes at startup can prevent the app from
  reaching the code that would fetch a fix, which is why runtime version discipline matters more than
  it seems.
- An update cannot rescue a broken native build. Only a new store submission can, and that waits on
  review.

## Store submission realities

- Permissions need declared usage strings in app config. A permission exercised without its
  declaration is a rejection, and the reviewer's message rarely names the missing string.
- Store metadata, screenshots, and privacy declarations are release work, not an afterthought.
- Review time is not under your control. Anything with a date attached needs the build submitted well
  ahead of it.
- Test on a **release** build before submitting. Debug builds differ in optimization, logging, and
  sometimes behaviour.

## Credentials

- Signing credentials and store API keys belong in the build service's encrypted storage, never in
  the repo or app config. The absolute secret-handling rules in `AGENTS.md` apply.
- Client-side environment values are compiled into the bundle and extractable. They are configuration,
  not secrets.
- Rotate anything that has been committed, printed to a log, or pasted into an issue, and follow the
  incident response in `AGENTS.md` rather than quietly replacing it.

## Pre-release checklist

- The change was classified update-versus-build deliberately, not by habit.
- Runtime version was changed if native output changed.
- Dependency versions pass the SDK compatibility check.
- The build under test is a release build, verified on both platforms.
- Permission usage strings match the permissions actually requested.
- Rollback path is known and the rollout is staged where possible.
- No credential is in the repo, in app config, or in a bundled value.
