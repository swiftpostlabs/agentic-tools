---
name: ref-sp-js-react-native
description: "Portable React Native guidance for the native rendering model: core primitives instead of DOM elements, StyleSheet layout with no cascade, list virtualization, the JS and UI thread split, navigation as state, and platform differences. Use when: writing or reviewing React Native screens, components, or styles; deciding between View, Text, Pressable, ScrollView, and a virtualized list; diagnosing dropped frames, janky scrolling, or slow lists; writing animations or gestures on native; handling iOS and Android differences, safe areas, or the keyboard; choosing native storage; or porting React web code to a mobile app."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "react, react-native, mobile"
  shareable-skills.requires: "ref-sp-js-react"
  shareable-skills.suggests: "ref-sp-js-expo, ref-sp-js-typescript, ref-sp-ux-accessibility, ref-sp-dev-coding-patterns"
---

# React Native

## Purpose

Provide the mental model and defaults that make React Native different from React on the web, so
React knowledge transfers correctly instead of transferring the parts that do not exist on native.

## When to use this skill

- Writing or reviewing React Native screens, components, or styles.
- Choosing between `View`, `Text`, `Pressable`, `ScrollView`, and a virtualized list.
- Diagnosing dropped frames, janky scrolling, slow lists, or animation stutter.
- Handling iOS and Android differences, safe areas, keyboard behaviour, or the Android back button.
- Choosing native storage, or porting React web code into a mobile app.

## Scope Boundaries

- Use this skill for the **native platform model**: primitives, styling, layout, lists, threading,
  navigation shape, and device concerns.
- Use `.agents/skills/ref-sp-js-react/SKILL.md` for everything React that is not platform-specific —
  component boundaries, hook and state ownership, effects as synchronization, and library discipline.
  That skill is the base; this one is the delta.
- Use `.agents/skills/ref-sp-js-expo/SKILL.md` for the toolchain: app config, prebuild, config
  plugins, EAS build and update, Expo Router, and SDK version management.
- Use `.agents/skills/ref-sp-js-typescript/SKILL.md` for strict typing and runtime boundaries. It
  applies unchanged on native.
- Use `.agents/skills/ref-sp-ux-accessibility/SKILL.md` for **every** accessibility threshold — tap
  target sizes, contrast ratios, text scaling. This skill covers only how to express accessibility in
  native props, never what the passing value is.
- Use `.agents/skills/ref-sp-ux-design/SKILL.md` for what a screen should look like and why.

## Freshness Rule

React Native and Expo move faster than any model's training data, and stale guidance here is
actively harmful — it produces migration steps for migrations that already finished.

- **Do not state version-specific facts from memory.** SDK numbers, version pairings, default flags,
  and API stability all change on a fast cadence.
- **Fetch the current docs instead.** `https://reactnative.dev/llms.txt` and
  `https://docs.expo.dev/llms.txt` are documentation indexes built for agents. Expo serves markdown
  for any docs page: append `.md` to the URL, for example
  `https://docs.expo.dev/versions/latest/react-native/view.md`.
- **The New Architecture debate is over.** On current versions Fabric, TurboModules, and JSI are the
  only architecture; the legacy bridge and the toggle that disabled it have been removed. Do not
  write "migrate to the New Architecture" guidance or add architecture flags to app config. If a
  specific version's status matters, verify it in the docs.

## Defaults

- Prefer a small in-house primitive layer built from core components over adopting a third-party UI
  kit. Mirror the MUI API you already know — a `Stack` with `direction` and `spacing`, a `Box`, a
  text component — implemented from `View` and `Text`.
- Prefer CSS-in-JS with styles colocated in the component file over detached stylesheet modules, so
  authoring style stays consistent with the emotion-based web side.
- Prefer a virtualized list for any collection that can grow unbounded; reserve `ScrollView` for
  short, known-length content.
- Prefer `Pressable` over the older touchable components for new interactive elements.
- Prefer Reanimated worklets or `useNativeDriver` animations so motion runs off the JS thread.
- Prefer `Platform.select` and platform file extensions over branching on `Platform.OS` inline when
  the divergence is more than a single value.
- Prefer the platform's secure storage for credentials and a fast key-value store for ordinary
  persistence; never put secrets in plain async storage.
- Prefer TypeScript, Yarn, zod, and TanStack Query exactly as the web skills specify — those carry
  over unchanged.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Pick the rendering primitive | Map the UI need onto `View`, `Text`, `Pressable`, or a list component instead of reaching for a DOM-shaped element. | There is no DOM, no cascade, and no implicit semantics; a wrong primitive silently loses text rendering, touch handling, or accessibility. | When building any screen or component. | The tree uses primitives that carry the behaviour the UI actually needs. |
| Choose the list strategy | Decide between `ScrollView`, `FlatList`/`SectionList`, and a recycling list, and supply a stable `keyExtractor`. | Long lists are the dominant source of native jank and out-of-memory crashes, and the failure only appears on real devices with real data. | When rendering any collection, especially one fed by an API. | Scrolling stays smooth as the dataset grows. |
| Move work off the JS thread | Put animation and gesture work in worklets or native-driven animations, and keep heavy computation out of the render path. | The JS thread is single-threaded; blocking it freezes animation, gestures, and touch response at once. | When adding animation, gestures, or any non-trivial computation. | Interactions stay responsive while JavaScript is busy. |
| Verify on both platforms | Check the change on iOS and Android, including safe areas, keyboard, and back navigation. | iOS and Android diverge in layout insets, keyboard behaviour, navigation gestures, and permissions; one-platform testing hides half the bugs. | Before calling any UI change done. | The screen behaves correctly on both platforms, not just the simulator you happened to open. |

## Core Rules

### Primitives, not elements

- There is no DOM. `View` is the layout container, `Text` is the **only** thing that renders text,
  `Image` renders images, and `Pressable` handles touch. Text outside a `Text` element does not
  render and often throws.
- Style props do not cascade. `View` does not inherit font settings; only nested `Text` inherits from
  a parent `Text`, and only partially.
- `Pressable` is the default interactive primitive. Give it a hit area, a pressed state, and
  accessibility props — none of them come for free.

### Accessibility is expressed in props, not elements

This is where web React guidance inverts, and the inversion is easy to miss.

- `.agents/skills/ref-sp-js-react/SKILL.md` instructs you to preserve semantic HTML because native
  elements carry role, focusability, and keyboard behaviour. **On React Native there are no semantic
  elements to preserve.** Every primitive is semantically inert.
- The equivalent discipline is to declare semantics explicitly: `accessibilityRole`,
  `accessibilityLabel`, `accessibilityState`, `accessibilityHint`, and `accessible` to group a
  subtree into one screen-reader node.
- Applying the web rule literally on native produces nothing; skipping the native equivalent produces
  a screen that is unusable with VoiceOver and TalkBack. Treat the props as mandatory on every
  interactive element.
- All numeric thresholds — tap target size, contrast, text scaling — belong to
  `.agents/skills/ref-sp-ux-accessibility/SKILL.md`. Do not restate them here or guess them.

### Styling and layout

- Write styles in JavaScript, colocated with the component that uses them, rather than splitting them
  into a detached stylesheet module. `StyleSheet.create` is a type-checking and readability tool, not
  a performance obligation — the React Native docs claim static type checking as its main practical
  benefit, not speed. Use it where the validation helps.
- Express layout through the shared primitive layer (`Stack`, `Box`) rather than repeating raw flex
  objects at every call site. Fabric's view flattening merges layout-only wrappers into their parent,
  so this costs no native view depth. See `./references/component-primitives.md`.
- Avoid runtime `styled()` template interpolation on native; it recomputes styles per render. Plain
  colocated style objects behind the primitive seam are the default.
- Hoist or memoize style objects on hot paths — list rows above all — so they are not reallocated per
  render. Everywhere else, readability wins and the allocation does not matter.
- Flexbox is the layout system, with native defaults that differ from the web: `flexDirection`
  defaults to `column`, not `row`, and there is no `display: block` or float.
- Sizes are unitless density-independent pixels. There is no `px`, `em`, `rem`, or `%` except where a
  prop explicitly documents percentage strings.
- There are no media queries. Use `useWindowDimensions` for responsive layout so the value updates on
  rotation and split-screen; the static `Dimensions.get` snapshot goes stale.
- Shadows and elevation diverge by platform. Expect to set both the iOS shadow properties and the
  Android `elevation`, or use whatever the chosen styling layer normalizes.

### Lists and scrolling performance

- `ScrollView` renders every child immediately. It is correct for a settings screen and wrong for a
  feed; the crash arrives in production with real data volumes.
- Use a virtualized or recycling list for unbounded collections. Give it a stable `keyExtractor` —
  index keys break recycling and produce visibly wrong rows.
- Keep row components cheap and stable. A row that allocates new callbacks, objects, or styles per
  render defeats the list's reuse strategy. This is the one place where memoizing rows genuinely
  earns its keep, which is a deliberate exception to the "no reflexive `useMemo`" default in
  `.agents/skills/ref-sp-js-react/SKILL.md`.
- Do not nest a virtualized list inside a `ScrollView` along the same axis. It defeats virtualization
  and warns at runtime; use the list's header and footer props instead.
- Recycling lists are the current default for large datasets, but which library leads changes.
  Read `./references/library-recommendations.md` before adding one.

### Threading and animation

- Two threads matter: the **JS thread** runs your React code, and the **UI thread** is the only one
  that can touch native views. Blocking JavaScript freezes animation, gestures, and touch together.
- Animations that run on the JS thread stutter whenever JavaScript is busy. Drive motion on the UI
  thread: Reanimated worklets, or `Animated` with `useNativeDriver: true`.
- `useNativeDriver` only supports transform and opacity. Animating layout properties such as `width`,
  `height`, or `top` cannot be native-driven; restructure toward transforms instead.
- Use the gesture library's handlers rather than raw touch responders for anything beyond a simple
  tap, so the gesture is recognized on the UI thread.
- Performance claims need device evidence. A release build on a low-end Android device is the honest
  test; a debug build on a high-end simulator will hide the problem you are looking for.

### Navigation

- Navigation state is application state that lives outside your components, not a URL the browser
  owns. Route params are serialized — put identifiers in params and fetch the entity on the target
  screen rather than passing objects or functions through.
- Screens are not unmounted when you navigate away. A screen can stay mounted in the background, so
  effects that assume unmount-on-leave will not fire; use the navigation lifecycle events for
  focus-dependent work.
- Deep links and the Android hardware back button are real entry and exit paths that must be handled
  deliberately, not assumed.

### Platform and device concerns

- Use `.ios.tsx` and `.android.tsx` file extensions when implementations genuinely diverge, and
  `Platform.select` for small value-level differences. The resolver picks the right file
  automatically.
- Respect safe areas with the safe-area insets rather than hardcoded padding; notches, dynamic
  islands, and gesture bars vary per device.
- The keyboard covers content by default. Handle avoidance explicitly, and expect iOS and Android to
  behave differently.
- Permissions are requested at runtime, can be denied permanently, and require declared usage strings
  in app config. Handle the denied path as a real state, not an error.

### Data, storage, and secrets

- There is no `localStorage`, no cookie jar, and no same-origin policy. Async key-value storage is
  unencrypted and readable on a rooted or jailbroken device.
- Store credentials and tokens in the platform keychain or keystore through a secure-storage module.
  Never place them in ordinary async storage.
- **Anything bundled into the app is public.** Client-side environment variables are compiled into
  the JavaScript bundle and extractable from the binary. An API key shipped in the app is a published
  API key; keep privileged secrets on a server. This repo's always-on secret-handling rules in
  `AGENTS.md` apply unchanged.
- TanStack Query and zod carry over from `.agents/skills/ref-sp-js-react/SKILL.md` and are the
  defaults for async server state and runtime validation. Offline and background behaviour is the
  native addition to think about.

## What Carries Over, and What Does Not

| Web React guidance | On React Native |
| --- | --- |
| Component boundaries, hook and state ownership, effects as synchronization | Carries over unchanged |
| Strict TypeScript, runtime validation at boundaries, const-derived unions | Carries over unchanged |
| zod, TanStack Query, Yarn, composition-root client construction | Carries over unchanged |
| Preserve semantic HTML | **Does not exist.** Declare `accessibilityRole` and friends instead |
| MUI plus emotion as the component system | **MUI does not run on native.** Keep the API shape: build thin `Stack`/`Box` wrappers from RN primitives — `./references/component-primitives.md` |
| CSS-in-JS, styles colocated with the component | Carries over — prefer it over detached stylesheet modules |
| Browser verification via Playwright | **Not applicable.** Use a native e2e runner and real devices |
| CSS cascade, media queries, `px`/`rem` units | **Do not exist.** `StyleSheet`, `useWindowDimensions`, unitless DIPs |
| No reflexive `useMemo` or `useCallback` | Still true, **except** for list row components |

## Gotchas

- Text that is not wrapped in `Text` silently fails to render or throws — the single most common
  error when porting web markup.
- `flexDirection` defaults to `column`, so a layout copied from the web comes out stacked vertically.
- `ScrollView` with a long list looks fine in development and crashes with production data volumes.
- Index-based `keyExtractor` values corrupt row content once a recycling list starts reusing cells.
- `useNativeDriver: true` throws at runtime when applied to layout properties rather than transforms.
- A screen left mounted in the background keeps running its effects, intervals, and subscriptions.
- Debug builds and high-end simulators mask exactly the performance problems you are trying to find.
- Environment variables in the bundle are readable by anyone who downloads the app.

## Validation

- Every interactive element has an accessibility role and label, and thresholds were checked against
  `.agents/skills/ref-sp-ux-accessibility/SKILL.md` rather than guessed.
- Unbounded collections use a virtualized list with a stable key, not `ScrollView`.
- Animation and gesture work runs on the UI thread, and no layout property is native-driven.
- The change was verified on both iOS and Android, including safe area and keyboard behaviour.
- No credential or privileged key is stored in async storage or bundled into the app.
- Version-specific claims were fetched from current docs rather than recalled.
- React, TypeScript, and library guidance was sourced from the existing skills instead of restated.

## References

- React Native documentation index for agents: <https://reactnative.dev/llms.txt>
- React Native architecture and threading model: <https://reactnative.dev/architecture/threading-model>
- Expo documentation index for agents: <https://docs.expo.dev/llms.txt> (append `.md` to any page URL
  for markdown)
- Read `./references/platform-model.md` when you need the fuller explanation of primitives, styling,
  threading, and list behaviour behind the rules above.
- Read `./references/component-primitives.md` when building or reviewing the shared primitive layer,
  or when you are about to write raw flex styles at a call site.
- Read `./references/library-recommendations.md` when choosing native dependencies, especially
  styling, lists, navigation, storage, or animation.
- Read `./references/checklist.md` for a quick React Native review pass.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for native prompts.
- Review `./evals/evals.json` when validating output quality for React Native guidance.
