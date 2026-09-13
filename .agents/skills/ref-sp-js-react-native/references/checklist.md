# Review Checklist

## Primitives and structure

- All text is inside a `Text` element; no bare strings in a `View`.
- Interactive elements use `Pressable` with a pressed state and an adequate hit area.
- Feature code imports layout and text from the shared `ui/base` seam rather than reaching for
  `react-native` primitives or raw flex objects at each call site.
- Wrappers stay thin and pass through accessibility props and `testID`.

## Accessibility

- Every interactive element declares `accessibilityRole` and `accessibilityLabel`; state-bearing
  controls declare `accessibilityState`.
- Related content is grouped into one screen-reader node where that is the sensible unit.
- Numeric thresholds were checked against `.agents/skills/ref-sp-ux-accessibility/SKILL.md` rather
  than guessed or restated from memory.

## Styling

- Styles are JavaScript, colocated with the component, not in a detached stylesheet module.
- Spacing and colour come from theme tokens instead of literals.
- Style objects on hot paths — list rows especially — are hoisted or memoized.
- Layout accounts for `flexDirection` defaulting to `column`.
- Responsive sizing uses `useWindowDimensions`, not a stale `Dimensions.get` snapshot.
- Shadow styling covers both iOS shadow properties and Android `elevation`.

## Lists and performance

- Unbounded collections use a virtualized or recycling list, never `ScrollView`.
- `keyExtractor` returns a stable identity, not an array index.
- No virtualized list is nested inside a same-axis `ScrollView`.
- Row components are cheap and stable across renders.
- Any performance claim is backed by a release build on a low-end physical device.

## Threading and animation

- Animation runs on the UI thread via worklets or `useNativeDriver: true`.
- No layout property is passed to a native-driven animation.
- Gestures use the gesture library's handlers rather than raw touch responders.
- No heavy synchronous work sits in render or in a frequently fired callback.

## Navigation

- Route params are serializable; entities are fetched on the target screen rather than passed through.
- Focus-dependent work uses navigation focus events, not mount and unmount assumptions.
- Deep links and the Android hardware back button are handled deliberately.

## Platform and device

- Verified on both iOS and Android, not one simulator.
- Safe-area insets are respected instead of hardcoded padding.
- Keyboard avoidance is handled explicitly on both platforms.
- Permission denial is treated as a real state with a designed path.

## Data and secrets

- No credential or token is in async key-value storage.
- Nothing privileged is bundled into the app or exposed through a client-side environment variable.
- Offline and foreground-refetch behaviour was decided rather than defaulted into.

## Freshness

- No version-specific claim was asserted from memory; current facts came from the documentation
  indexes named in `SKILL.md`.
- No guidance was written for migrating to the New Architecture, which is already the only one.
