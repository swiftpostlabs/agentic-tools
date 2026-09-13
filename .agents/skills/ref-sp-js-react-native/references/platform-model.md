# The Native Platform Model

Background for the rules in `SKILL.md`. Read this when a rule needs justification, when a bug does
not make sense under web assumptions, or when deciding how far a web pattern can be carried over.

## Why React transfers but the web does not

React Native runs the same React. Reconciliation, hooks, context, suspense, and component
composition behave as they do on the web, which is why
`.agents/skills/ref-sp-js-react/SKILL.md` remains the base guidance.

What does not transfer is everything below React: the host elements, the style system, the layout
engine, the event model, and the threading model. React Native does not render to a DOM — it renders
to real platform views (`UIView` on iOS, `android.view.View` on Android). Every web behaviour that
came from the browser rather than from React is absent.

The practical failure mode is not "React does not work." It is importing browser assumptions that
have no counterpart and getting silence instead of an error.

## Primitives

| Need | Native primitive | Note |
| --- | --- | --- |
| Layout container | `View` | Flex container; renders no text and inherits no typography |
| Any text | `Text` | The only text renderer; also the only element with partial style inheritance |
| Touch target | `Pressable` | Current default; exposes pressed state and hit slop |
| Image | `Image` | Remote images need explicit dimensions; caching behaviour varies by library |
| Short scrollable content | `ScrollView` | Renders all children eagerly |
| Unbounded collection | Virtualized or recycling list | See the list section below |
| Text input | `TextInput` | Keyboard type, return key, and autofill all need explicit configuration |

There is no equivalent of `div`, `span`, `button`, `a`, `ul`, or the heading elements. There is no
generic element that quietly does the right thing — the correct behaviour is whatever you declare.

## Styling and layout

Styles are plain JavaScript objects — there is no stylesheet language, only values. They are named
collections of properties, not a cascade. `StyleSheet.create` exists and registers a style object,
but it is one mechanism among several; what matters is that styles are JavaScript, colocated with the
component, and composed by passing arrays to the `style` prop. See `./component-primitives.md` for
the authoring style this repo prefers.

Differences that bite when porting web code:

- **No inheritance across `View`.** Setting a font on a container does not affect descendants. Only
  nested `Text` inherits from a parent `Text`, and only some properties.
- **No cascade, no selectors, no pseudo-classes.** Hover, focus, and active states are component
  state you manage, not selectors. `Pressable` gives you pressed state as a function of its children.
- **Flex defaults differ.** `flexDirection` is `column`; `alignItems` is `stretch`. A row layout must
  say so explicitly.
- **Unitless numbers.** Values are density-independent pixels. `PixelRatio` exposes the device scale
  when you genuinely need physical pixels.
- **Percentages are limited.** Some props accept percentage strings; most expect numbers. Flex is the
  intended mechanism for proportional layout.
- **No media queries.** `useWindowDimensions` is the hook-based, rotation-aware source of screen
  size. The static `Dimensions.get` snapshot does not update.
- **Shadows diverge.** iOS uses shadow colour, offset, opacity, and radius; Android uses `elevation`.
  Expect to specify both.
- **`overflow: hidden` is unreliable on Android** for some clipping cases, particularly combined with
  elevation.

## Threading

Two threads carry the load:

- **JS thread** — runs your React code, effects, callbacks, and the render phase. Single-threaded.
- **UI thread (main thread)** — the only thread permitted to manipulate host views. Also handles
  high-priority events.

Under the New Architecture the renderer uses immutable data structures so it can expose thread-safe
synchronous APIs; high-priority discrete events can execute the render pipeline synchronously on the
UI thread, while continuous low-priority events can be interrupted without blocking JavaScript.

What this means in practice:

- Blocking the JS thread blocks animation, gestures, and touch response simultaneously. A long
  synchronous parse or a heavy render freezes the whole interface, not just one component.
- Animation driven from JavaScript must round-trip per frame, so it stutters whenever the JS thread
  is busy. Native-driven animation and Reanimated worklets execute on the UI thread and keep running
  through JS work.
- `useNativeDriver` is limited to properties the UI thread can change without consulting layout —
  transform and opacity. Layout properties require the layout pass and cannot be native-driven.
- Worklets are functions marked to run on the UI thread. They cannot freely close over arbitrary JS
  state; values must cross the boundary through shared values.

## Lists

`ScrollView` mounts every child at once. Cost grows linearly with item count, and memory does too.

Virtualized lists (`FlatList`, `SectionList`) mount and unmount rows as they scroll. This bounds
memory, but mounting a complex row costs time — if a row cannot mount within a frame budget on a
low-end device, scrolling drops frames.

Recycling lists keep a fixed pool of mounted row components and swap data into them instead of
destroying and recreating. This avoids the mount cost that hurts virtualized lists on complex rows,
at the cost of rows needing to tolerate reuse — state held inside a recycled row belongs to the
previous item unless it is keyed or reset properly.

Consequences:

- A stable, identity-based `keyExtractor` is required. Index keys break reuse and display wrong data.
- Row components should be cheap, stable, and memoized. This is the deliberate exception to the
  general "do not add `useMemo` by default" rule.
- Nesting a virtualized list inside a `ScrollView` on the same axis gives the list unbounded height,
  which disables virtualization entirely. Use the list's header and footer props.
- Measure on a release build on a low-end device. Debug builds and flagship simulators hide the
  problem.

## Navigation

Web routing is a URL owned by the browser, with history, back and forward, and unmount on leave.
Native navigation is a stack of screens held in application state.

- Screens persist. Navigating away does not unmount, so cleanup and refetch logic tied to unmount
  will not run. Focus and blur events from the navigation library are the correct hooks.
- Params are serialized for persistence and deep linking. Passing non-serializable values — class
  instances, functions, dates as objects — breaks state persistence and warns.
- Back is a first-class platform concern: an Android hardware button and an iOS edge-swipe gesture,
  both of which can leave a screen without a button press.
- Deep links can enter the app at any screen, so a screen cannot assume its predecessor ran.

## Device realities with no web counterpart

- **App lifecycle.** Apps are backgrounded and resumed, not just loaded and unloaded. Timers throttle
  or stop; sockets drop. `AppState` exposes the transitions.
- **Safe areas.** Notches, dynamic islands, status bars, and gesture bars consume screen edges by
  device. Use insets rather than constants.
- **Keyboard.** It overlays content and behaves differently per platform.
- **Permissions.** Runtime requests, permanent denial, and declared usage strings in app config. The
  denied path is a state to design for.
- **Offline.** Mobile connectivity is intermittent by default. Cache and retry policy is a product
  decision, not an edge case.
- **Storage is not secure.** Async key-value storage is plaintext on device. Credentials belong in
  the keychain or keystore, and anything shipped in the bundle is public.
