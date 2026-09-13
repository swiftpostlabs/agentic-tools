---
name: ref-sp-js-expo
description: "Portable Expo guidance for the toolchain around a React Native app: app config as the source of truth, continuous native generation and prebuild, config plugins, development builds, Expo Router, EAS Build, Submit and Update, and SDK version discipline. Use when: scaffolding or configuring an Expo app, adding a library that needs native setup, deciding why ios and android folders should not be hand-edited, setting up file-based routing, shipping a build to TestFlight or Play, sending an over-the-air update, upgrading the SDK, or debugging why something works in Expo Go but not in a real build."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "react-native, expo, mobile"
  shareable-skills.suggests: "ref-sp-js-react-native, ref-sp-js-react, ref-sp-js-typescript, ref-sp-dev-package-management"
---

# Expo

## Purpose

Provide the durable mental model for Expo's toolchain — config-driven native projects, build and
update delivery, and version discipline — while deliberately refusing to restate the version-specific
mechanics that go stale between SDK releases.

## When to use this skill

- Scaffolding or configuring an Expo app, or adding a library that needs native setup.
- Deciding how a native change should be made when `ios/` and `android/` are generated.
- Setting up or reviewing file-based routing.
- Building for TestFlight or Play, or shipping an over-the-air update.
- Upgrading the SDK, or resolving dependency version conflicts.
- Debugging why something works in one client but not in a real build.

## Scope Boundaries

- Use this skill for the **toolchain**: app config, prebuild, config plugins, builds, updates,
  routing setup, and version management.
- Use `.agents/skills/ref-sp-js-react-native/SKILL.md` for the **platform**: primitives, styling,
  lists, threading, and device behaviour. That is where screen and component work belongs.
- Use `.agents/skills/ref-sp-js-react/SKILL.md` for React component and hook design, which is
  unchanged here.
- Use `.agents/skills/ref-sp-js-typescript/SKILL.md` for strict typing, including typing
  `app.config.ts`.
- Use `.agents/skills/ref-sp-js-next/SKILL.md` for Next.js App Router questions. Expo Router is
  file-based like Next but is a different framework — do not transfer Next-specific rules to it.
- Use `.agents/skills/ref-sp-dev-github-actions-ci/SKILL.md` for generic CI concerns that are not
  Expo-specific.

## Doc-First Rule

**This is the most important rule in this skill.** Expo ships on a fast cadence, and version-specific
detail recalled from training data is routinely wrong in ways that look plausible.

- **Never assert an SDK number, version pairing, default flag, or CLI flag from memory.** Look it up.
- **Fetch the docs directly.** `https://docs.expo.dev/llms.txt` is a documentation index built for
  agents. Every docs page is available as markdown by appending `.md` to its URL, for example
  `https://docs.expo.dev/workflow/continuous-native-generation.md`.
- **Prefer fetching over guessing even when you feel confident.** The cost of one fetch is far below
  the cost of a confidently wrong migration instruction.
- **Terminology retires too.** "Ejecting", and "managed versus bare workflow", are deprecated
  concepts — every Expo project now uses continuous native generation. If you find yourself about to
  explain the difference between managed and bare, you are working from stale knowledge.

State plainly when a claim came from the docs versus when it is an assumption, per the verification
discipline in `AGENTS.md`.

## Defaults

- Prefer Expo for new React Native work. It is the recommended framework for production React Native
  apps, and bare React Native is the escape hatch rather than the starting point.
- Treat the app config as the source of truth for native configuration; treat `ios/` and `android/`
  as build artifacts.
- Prefer a **development build** over the prebuilt sandbox client for anything beyond a first look.
- Prefer `npx expo install` over a raw package-manager add for any package, so versions stay aligned
  with the installed SDK.
- Prefer a config plugin over a manual native edit, and prefer a library's official plugin over a
  hand-written one.
- Prefer Expo Router for new apps, and keep route files thin.
- Prefer over-the-air updates for JavaScript-only fixes and a new build for anything native.
- Keep the package manager consistent with the repo — Yarn in this organization's Node projects —
  and let `expo install` drive it rather than bypassing it.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| `npx expo install <package>` | Install a package at a version compatible with the current SDK, using the project's package manager. | React Native is not backwards compatible, so an arbitrary latest version frequently breaks at runtime rather than at install. | Every time a dependency is added. | The dependency matches the SDK's known-good version set. |
| `npx expo install --check` | Verify installed packages are at SDK-compatible versions; exits non-zero in CI. | Version drift accumulates silently and surfaces as an inscrutable native crash later. | In CI, and before an upgrade or a release build. | Incompatible versions are caught before they reach a build. |
| `npx expo prebuild` | Regenerate the native projects from app config, config plugins, and autolinking. | The native directories are derived artifacts; regenerating proves the config actually produces them. | After changing native configuration, or when debugging a native issue. | Native projects reflect the committed configuration exactly. |
| Add a config plugin | Express a native modification as a function applied during prebuild. | A hand-edit to generated native code is destroyed on the next regeneration and is invisible to teammates. | Whenever a library or feature needs native project changes. | The native change is reproducible and survives regeneration. |
| Ship an update versus a build | Decide whether a change can go over the air or requires a store build. | Shipping a native change as an update produces a mismatched binary and crashes on launch. | Before every release. | The delivery mechanism matches what actually changed. |

## Core Rules

### App config is the source of truth

- Native configuration lives in the app config (`app.json`, or `app.config.ts` when it needs logic or
  environment input). Prefer the TypeScript form when the config is dynamic, and type it.
- `ios/` and `android/` are **generated output**. Prebuild regenerates them from the template for your
  SDK version, applies config plugins, and autolinks native modules found in dependencies.
- **Do not hand-edit generated native directories, and do not commit them.** Regeneration discards the
  edits, and a hand-edit is invisible to everyone reading the config. Gitignore them.
- If a native change cannot be expressed in app config, write or adopt a config plugin. That is the
  supported extension point.
- Committing the native directories is a deliberate, costly choice that opts out of this model. Do not
  drift into it by accident — if it happens, say so explicitly and record why.

### Development builds versus the prebuilt client

This is the single most common source of confusion; recognize it early.

- The prebuilt sandbox client contains a **fixed set** of native modules. Any library with native code
  that is not in that set cannot work there, no matter how correct your JavaScript is.
- The failure looks like a JavaScript bug — a missing export, an undefined module, a native module
  null error — which sends people debugging the wrong layer.
- **If a native dependency is involved, use a development build.** A development build is your own
  binary containing your own native modules, with the same fast refresh workflow.
- "It works in the sandbox client but not in the build" and its inverse are both symptoms of this
  mismatch. Check which client is running before debugging anything else.

### Dependency and SDK version discipline

- Always add packages through `npx expo install`. It resolves the version known to work with the
  installed SDK and delegates to the project's package manager, so the Yarn preference is preserved.
- Run the compatibility check in CI so drift fails the pipeline rather than a release build.
- Upgrade the SDK as a deliberate task, following the current upgrade guide from the docs — not from
  recalled steps. Upgrades move React Native, React, and many packages together.
- A dependency carrying native code can block an SDK upgrade. Weigh that before adopting one, per
  `.agents/skills/ref-sp-js-react-native/references/library-recommendations.md`.

### Routing

- Expo Router is file-based: the filesystem defines routes, with layout files composing shared shell
  and navigation structure.
- Keep route files thin. Delegate reusable UI and logic to feature modules, exactly as
  `.agents/skills/ref-sp-js-next/SKILL.md` requires of App Router files. The reasoning transfers even
  though the framework does not.
- File-based routing gives deep links by construction. Treat every route as a possible entry point —
  a screen cannot assume a predecessor ran.
- Navigation state and screen persistence behave as described in
  `.agents/skills/ref-sp-js-react-native/SKILL.md`; Expo Router builds on the same navigation model.
- **Do not transfer Next.js specifics.** Server Components, `'use client'`, and Next's metadata and
  data-fetching APIs are Next concepts. Similar file conventions do not imply identical semantics.

### Builds, submissions, and updates

- Build profiles are configuration. Keep development, preview, and production profiles distinct and
  explicit rather than overloading one.
- **Over-the-air updates ship JavaScript, styling, images, and copy. They cannot ship native
  changes** — new native dependencies, permission changes, or an SDK upgrade all require a new build.
- Runtime versions are the compatibility contract between an update and a binary. An update only
  reaches builds with a matching runtime version. Change the runtime version whenever native code
  changes, or you will serve JavaScript to a binary that cannot run it.
- Treat a store build and an update as different risk classes: an update reaches users quickly, which
  also means a bad one reaches them quickly. Use staged rollout where it is available.
- Store submission needs declared permission usage strings and metadata in app config. A permission
  used without its declared string is a review rejection.

### Secrets and environment values

- The repo's absolute secret-handling rules in `AGENTS.md` apply without modification.
- **Client-side environment values are compiled into the bundle and are public.** Prefixed public
  variables are not a security mechanism; they are a convenience. Anyone can extract them from the
  binary.
- Build-time secrets — signing credentials, store API keys, private tokens — belong in the build
  service's encrypted environment, never in app config, never in the repo, never in a bundled value.
- A privileged API key belongs behind a server you control. If a third-party SDK demands a client key,
  scope and restrict it and treat it as published.

### The web target

- Expo can target web through React Native for web, which is useful for sharing components but is not
  a substitute for a web-first app.
- If the product's primary surface is the web, `.agents/skills/ref-sp-js-next-template/SKILL.md`
  remains the right baseline. Do not adopt Expo web to avoid choosing.
- Components shared across native and web must not assume DOM APIs. The primitive-layer seam in
  `.agents/skills/ref-sp-js-react-native/references/component-primitives.md` is what makes sharing
  practical.

## Gotchas

- Editing `ios/` or `android/` by hand: the change disappears on the next regeneration.
- Installing with a raw package-manager add: versions drift from the SDK and fail at runtime, not at
  install time.
- Debugging a native-module error in the sandbox client that only a development build can resolve.
- Shipping a native change as an over-the-air update: the update reaches a binary that cannot run it.
- Forgetting to change the runtime version after a native change, which silently breaks the update
  compatibility contract.
- Assuming Expo Router works like the Next.js App Router because both are file-based.
- Treating a public-prefixed environment variable as a secret.
- Writing SDK-version guidance from memory. Fetch it.

## Validation

- Native configuration lives in app config or a config plugin; generated directories are neither
  hand-edited nor committed.
- Dependencies were added through `expo install`, and a compatibility check runs in CI.
- The delivery mechanism matches the change: JavaScript-only over the air, native through a build.
- Runtime version was updated if native code changed.
- No secret is in app config, in the repo, or in a bundled client value.
- Route files are thin, and no Next.js-specific semantics were assumed.
- Every version-specific claim was fetched from the documentation rather than recalled, and
  assumptions are labelled as such.

## References

- Expo documentation index for agents: <https://docs.expo.dev/llms.txt>
- Any Expo docs page as markdown: append `.md` to the URL, for example
  <https://docs.expo.dev/workflow/continuous-native-generation.md>
- React Native documentation index for agents: <https://reactnative.dev/llms.txt>
- Read `./references/checklist.md` for a quick Expo review pass.
- Read `./references/delivery.md` when planning a release, choosing between an update and a build, or
  reasoning about runtime versions and rollout risk.
- Read `.agents/skills/ref-sp-js-react-native/SKILL.md` when the question turns from toolchain to
  screens, styling, lists, or performance.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for Expo prompts.
- Review `./evals/evals.json` when validating output quality for Expo toolchain guidance.
