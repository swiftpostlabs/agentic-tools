# Native Library Recommendations

The native ecosystem churns faster than the web one, and leadership in several of these categories
has changed more than once. Treat this file as **categories and selection criteria**, not as a frozen
list of winners. Confirm the current state through the documentation indexes in `SKILL.md` before
committing to a package.

## Dependency rule

The rule from `.agents/skills/ref-sp-js-react/SKILL.md` applies unchanged: add a dependency only when
it deletes code, removes a recurring failure mode, or provides something the platform does not.

Native adds one more test. **A dependency with native code is heavier than a JavaScript-only one.**
It participates in the build, can block an SDK upgrade, may lack support for one platform, and cannot
ship in an over-the-air update. Prefer a JavaScript-only package when both would do.

## UI and styling

- **Default: no third-party UI kit.** Build the thin primitive layer described in
  `./component-primitives.md` from core components.
- **Why:** the native UI kit landscape turns over quickly, kits are opinionated about theming in ways
  that fight an existing design system, and a kit is very hard to remove once feature code depends on
  its props. A four-component seam you own costs a day and never breaks on upgrade.
- **When a kit is justified:** a large app with many form-heavy screens and no existing design
  language, or a team that needs platform-native look on both platforms without building it. Then
  pick one and let it own the whole app — never run two.
- **Cross-platform styling libraries** exist that offer a themed, `sx`-like authoring experience
  across web and native. Evaluate one explicitly if the codebase genuinely shares components across
  platforms; do not drift into reimplementing `sx` by hand.
- **If you do adopt one, the mechanism matters more than the API.** Build-time compiled and
  native-backed styling libraries carry low runtime cost; runtime `styled()` template interpolation
  recomputes styles on every render and is the one approach to avoid on native. Published benchmarks
  rank these differently and change between versions — check current numbers and profile your own
  screens rather than trusting a ranking. See
  `./component-primitives.md` for the evidence and the default position.

## Lists

- Core `FlatList` and `SectionList` are adequate up to a few hundred simple rows and cost nothing.
- For large datasets, complex rows, or measured scroll jank, a **recycling list** is the established
  answer. These reuse a pool of row components rather than mounting and unmounting.
- Verify the current recommended library and major version before adopting — the leading option was
  rewritten for the New Architecture and its API changed between major versions, so guidance written
  against the older version does not apply.
- Whatever you choose: stable identity keys, cheap memoized rows, never nested in a same-axis
  `ScrollView`.

## Navigation

- The established navigation library is the default for a bare React Native app; file-based routing
  is the default in an Expo app. See `.agents/skills/ref-sp-js-expo/SKILL.md`.
- Prefer native-backed stack navigators over JavaScript-reimplemented ones so transitions and
  gestures run on the UI thread.

## Animation and gestures

- Prefer the worklet-based animation library and its companion gesture handler. Together they keep
  animation and gesture recognition on the UI thread, which is the entire point.
- Core `Animated` with `useNativeDriver: true` is fine for simple transform and opacity transitions
  and adds no dependency.
- Avoid raw touch responders for anything beyond a simple tap.

## Async state and validation

Unchanged from the web skill: TanStack Query for async server state, zod for runtime validation at
trust boundaries. Both are JavaScript-only and work on native without native modules.

Native-specific considerations when configuring the query layer:

- Connectivity is intermittent. Decide retry, cache persistence, and offline behaviour deliberately.
- Refetch on app foreground, not only on window focus.
- Construct the client at the composition root, per the rule in the web React skill.

## Storage

Three distinct needs; do not collapse them:

| Need | Use |
| --- | --- |
| Credentials, tokens, anything secret | Platform keychain or keystore via a secure-storage module |
| Ordinary app data, preferences, cache | A fast key-value store, or async storage for small volumes |
| Relational or large structured data | An on-device database |

Async key-value storage is **unencrypted plaintext** on device. It is not a credential store.

## Dates and i18n

- Native `Date` and `Intl` first, matching the web skill. Confirm the `Intl` surface available in the
  current JavaScript engine rather than assuming full browser parity.
- Add a date library only when arithmetic or formatting complexity genuinely obscures the feature.

## Testing

- Unit and component tests: the React Native testing library with the appropriate Jest preset. Jest
  stays the runner, consistent with `.agents/skills/ref-sp-js-typescript/SKILL.md`.
- End-to-end: a native e2e runner driving a simulator or device. Playwright and
  `.agents/skills/ref-sp-dev-playwright-cli/SKILL.md` are browser tools and do not apply to a native
  build.
- Performance work must be validated on a **release build on a low-end physical device**. A debug
  build on a flagship simulator hides the regressions you are hunting.

## Non-defaults

- Do not add two styling systems, two navigation libraries, or two list libraries to one app.
- Do not add a native-code dependency for something a JavaScript-only package already does.
- Do not port a web-only package by assuming it works; check that it does not reach for `window`,
  `document`, or DOM APIs.
- If a choice departs from these defaults, record why the default did not fit.
