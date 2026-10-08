---
name: ref-sp-js-react-native
description: "React Native's native model: primitives instead of DOM, StyleSheet without cascade, virtualized lists, JS vs UI thread, animation and gestures, navigation, safe areas, keyboard, Android back. Use when building RN screens, fixing jank, or porting web React to mobile."
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

What makes React Native different from React on the web, so React knowledge transfers without
the parts that don't exist on native. React itself (component boundaries, state ownership, effects,
library discipline) is `ref-sp-js-react`, the base this skill extends. The Expo toolchain (app
config, prebuild, builds and updates, Expo Router, SDK versions) is `ref-sp-js-expo`; typing is
`ref-sp-js-typescript`, unchanged on native. **Every** accessibility threshold (tap targets,
contrast, text scaling) is `ref-sp-ux-accessibility`; this skill only covers expressing
accessibility in native props. What a screen should look like is `ref-sp-ux-design`.

## Check the docs first

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

## Primitives, not elements

- There is no DOM. `View` is the layout container, `Text` is the **only** thing that renders text,
  `Image` renders images, and `Pressable` handles touch. Text outside a `Text` element does not
  render and often throws.
- Style props do not cascade. `View` does not inherit font settings; only nested `Text` inherits from
  a parent `Text`, and only partially.
- `Pressable` is the default interactive primitive, over the older touchable components. Give it a
  hit area, a pressed state, and accessibility props — none of them come for free.

## Accessibility is expressed in props, not elements

This is where web React guidance inverts, and the inversion is easy to miss.

- `ref-sp-js-react` instructs you to preserve semantic HTML because native
  elements carry role, focusability, and keyboard behaviour. **On React Native there are no semantic
  elements to preserve.** Every primitive is semantically inert.
- The equivalent discipline is to declare semantics explicitly: `accessibilityRole`,
  `accessibilityLabel`, `accessibilityState`, `accessibilityHint`, and `accessible` to group a
  subtree into one screen-reader node.
- Applying the web rule literally on native produces nothing; skipping the native equivalent produces
  a screen that is unusable with VoiceOver and TalkBack. Treat the props as mandatory on every
  interactive element.
- All numeric thresholds — tap target size, contrast, text scaling — belong to
  `ref-sp-ux-accessibility`. Do not restate them here or guess them.

## Styling and layout

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

## Lists and scrolling performance

- `ScrollView` renders every child immediately. It is correct for a settings screen and wrong for a
  feed; the crash arrives in production with real data volumes.
- Use a virtualized or recycling list for unbounded collections. Give it a stable `keyExtractor` —
  index keys break recycling and produce visibly wrong rows.
- Keep row components cheap and stable. A row that allocates new callbacks, objects, or styles per
  render defeats the list's reuse strategy. This is the one place where memoizing rows genuinely
  earns its keep, which is a deliberate exception to the "no reflexive `useMemo`" default in
  `ref-sp-js-react`.
- Do not nest a virtualized list inside a `ScrollView` along the same axis. It defeats virtualization
  and warns at runtime; use the list's header and footer props instead.
- Recycling lists are the current default for large datasets, but which library leads changes.
  Read `./references/library-recommendations.md` before adding one.

## Threading and animation

- Two threads matter: the **JS thread** runs your React code, and the **UI thread** is the only one
  that can touch native views. Blocking JavaScript freezes animation, gestures, and touch together.
- Animations that run on the JS thread stutter whenever JavaScript is busy. Drive motion on the UI
  thread: Reanimated worklets, or `Animated` with `useNativeDriver: true`.
- `useNativeDriver` only supports transform and opacity. Animating layout properties such as `width`,
  `height`, or `top` cannot be native-driven (`useNativeDriver: true` throws at runtime there);
  restructure toward transforms instead. Keep heavy computation out of the render path.
- Use the gesture library's handlers rather than raw touch responders for anything beyond a simple
  tap, so the gesture is recognized on the UI thread.
- Performance claims need device evidence. A release build on a low-end Android device is the honest
  test; a debug build on a high-end simulator will hide the problem you are looking for.

## Navigation

- Navigation state is application state that lives outside your components, not a URL the browser
  owns. Route params are serialized — put identifiers in params and fetch the entity on the target
  screen rather than passing objects or functions through.
- Screens are not unmounted when you navigate away. A screen can stay mounted in the background, so
  effects that assume unmount-on-leave will not fire; use the navigation lifecycle events for
  focus-dependent work.
- Deep links and the Android hardware back button are real entry and exit paths that must be handled
  deliberately, not assumed.

## Platform and device concerns

- Use `.ios.tsx` and `.android.tsx` file extensions when implementations genuinely diverge, and
  `Platform.select` for small value-level differences, rather than scattering `Platform.OS` branches
  inline. The resolver picks the right file automatically.
- Respect safe areas with the safe-area insets rather than hardcoded padding; notches, dynamic
  islands, and gesture bars vary per device.
- The keyboard covers content by default. Handle avoidance explicitly, and expect iOS and Android to
  behave differently.
- Permissions are requested at runtime, can be denied permanently, and require declared usage strings
  in app config. Handle the denied path as a real state, not an error.

## Data, storage, and secrets

- There is no `localStorage`, no cookie jar, and no same-origin policy. Async key-value storage is
  unencrypted and readable on a rooted or jailbroken device.
- Store credentials and tokens in the platform keychain or keystore through a secure-storage module.
  Never place them in ordinary async storage.
- **Anything bundled into the app is public.** Client-side environment variables are compiled into
  the JavaScript bundle and extractable from the binary. An API key shipped in the app is a published
  API key; keep privileged secrets on a server. This repo's always-on secret-handling rules in
  `AGENTS.md` apply unchanged.
- TanStack Query and zod carry over from `ref-sp-js-react` and are the
  defaults for async server state and runtime validation. Offline and background behaviour is the
  native addition to think about.

## What carries over from web React

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

## Before finishing

- Checked on both iOS and Android, including safe areas, keyboard, and back navigation: they
  diverge, and one-platform testing hides half the bugs.
- Every interactive element declares an accessibility role and label.
- Version-specific claims came from current docs.

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
