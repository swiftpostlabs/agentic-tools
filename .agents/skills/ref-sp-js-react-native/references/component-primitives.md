# The Shared Primitive Layer

How to get MUI-shaped component code on React Native without MUI. Read this before writing raw flex
styles at a call site, or when setting up a new native app's UI foundation.

## The seam

On the web, a mature React codebase often puts a thin indirection layer between features and the
component library — a `ui/base/` folder whose modules re-export the library's components, sometimes
renamed to house vocabulary:

```ts
// ui/base/Stack.ts — web: a straight alias
export * from '@mui/material/Stack';
export { default } from '@mui/material/Stack';
```

```ts
// ui/base/Text.ts — web: a renamed alias
import Typography from '@mui/material/Typography';

export type TextProps = TypographyProps;
const Text = Typography;
export default Text;
```

The layer looks redundant while it is a pure alias. Its value is that it is a **seam**: feature code
imports `ui/base/Stack`, never `@mui/material/Stack`, so the implementation behind the name can
change without touching call sites.

React Native is exactly the case that seam was built for. MUI does not run on native, but the
*import surface* can stay identical — `ui/base/Stack` simply resolves to an implementation written
from `View` instead of an alias to MUI. Feature code that reads:

```tsx
<Stack direction="row" spacing={2} alignItems="center">
```

can compile on both platforms. That is the goal: **keep the API, replace the implementation.**

## What to build

Keep the set small. These four cover the large majority of layout and text:

| Component | Built from | Carries |
| --- | --- | --- |
| `Box` | `View` | Style passthrough, padding and margin shorthands |
| `Stack` | `View` | `direction`, `spacing`, `alignItems`, `justifyContent` |
| `Text` | `Text` | `variant` mapped to a type scale, `color` from tokens |
| `Pressable`/`Button` | `Pressable` | Pressed state, hit slop, accessibility props by default |

Add more only when a real pattern repeats. A wrapper per MUI component is not the goal — the goal is
a vocabulary the feature code can speak.

## A worked `Stack`

```tsx
import { View, type ViewProps } from 'react-native';
import { useTheme } from '../theme';

type StackProps = ViewProps & {
  direction?: 'row' | 'column';
  spacing?: number;
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
};

const Stack = ({
  direction = 'column',
  spacing = 0,
  alignItems,
  justifyContent,
  style,
  ...rest
}: StackProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: direction,
          alignItems,
          justifyContent,
          gap: spacing * theme.spacingUnit,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export default Stack;
```

Points worth copying:

- **`spacing` is a multiplier, not a pixel count.** MUI's `spacing={2}` means two spacing units.
  Resolving it against a theme unit keeps native and web visually consistent and keeps magic numbers
  out of feature code.
- **`gap` does the work.** Native flexbox supports `gap`, so there is no need for the margin-injection
  tricks older `Stack` implementations used on the web.
- **`style` comes last in the array** so call sites can always override.
- **Spread the rest.** Accessibility props, `testID`, and pointer events must pass through or every
  consumer will need an escape hatch.

## About `sx`

MUI's `sx` is a large surface: theme resolution, responsive array values, nested selectors,
shorthand property aliases. Reimplementing it faithfully on native is a project, not a helper.

Recommended position:

- **Do not rebuild `sx`.** Accept React Native's `style` prop, which already takes objects and arrays.
- **Keep the shorthand props that carry the most weight** — `spacing` on `Stack`, padding and margin
  shorthands on `Box` — because those are what make call sites read like MUI.
- **Put tokens in a theme context**, and read colours and spacing from it rather than hardcoding. That
  is where `sx`'s real value lived; the selector syntax is not portable anyway, since native has no
  pseudo-classes.
- If a shared cross-platform styling library is on the table, evaluate it explicitly rather than
  drifting into a half-built `sx` clone. See `./library-recommendations.md`.

## Styles stay in JavaScript, next to the component

Write styles as JavaScript objects colocated with the component, consistent with the emotion-based
web side. Do not split them into a detached stylesheet module — the indirection costs a file jump and
buys nothing on native.

## Does this cost performance?

Two objections get raised against this pattern. Both are weaker than they sound, but each has a real
residue worth respecting.

### "You should use `StyleSheet.create` because it is faster"

Not according to the documentation. React Native's own `StyleSheet` page states that *"the main
practical benefit of creating styles inside `StyleSheet.create()` is static type checking against
native style properties,"* and lists its remaining advantages under **code quality** — organization,
meaningful names, IDE autocomplete. It does not claim a runtime performance benefit.

The historical justification — sending a style ID across the bridge instead of an object — belongs to
an architecture that no longer exists. Use `StyleSheet.create` when you want the type checking; do
not treat it as a performance obligation, and do not let it push styles out of the component file.

**The residue that is real:** a style object literal written inline in JSX is reallocated on every
render and defeats prop-identity comparison on the child. On an ordinary screen this is
unmeasurable. Inside a list row rendered hundreds of times it is measurable. Hoist static style
objects out of the component body or memoize the dynamic ones **on hot paths**; elsewhere, prefer the
readable form.

### "Wrapper components add view nesting"

Largely handled by the renderer. Fabric performs **view flattening**: layout-only nodes — those whose
props only affect layout, such as margin, padding, opacity, and background colour — are merged into
their parent and removed from the native view hierarchy. It runs during the diffing stage, so it
costs no extra CPU cycles.

A `Stack` that only sets `flexDirection`, `gap`, and alignment is exactly the layout-only node this
optimization targets. The JSX nesting does not become native view nesting.

**The residue that is real:** flattening applies only to layout-only nodes. A wrapper stops being
flattenable once it carries touch handling, accessibility props, `testID`, transforms, or clipping.
That is a fair trade — those wrappers exist because you need that behaviour — but it means "wrappers
are always free" is false. Keep wrappers layout-only when their job is layout.

### The one choice that does carry a cost

"CSS-in-JS" spans mechanisms with very different runtime profiles, and this is the distinction that
actually matters:

| Mechanism | Runtime cost |
| --- | --- |
| Plain JS style objects passed to `style` | None beyond allocation. **This is the default here.** |
| Build-time compiled utility styles | Near zero for static styles; cost returns with dynamic class generation |
| Native-backed styling libraries | Low; some measure close to plain stylesheets |
| Runtime `styled()` template interpolation | **The expensive one** — style recomputation per render plus context subscription |

Published comparisons put plain stylesheets fastest, native-backed libraries near them, and
compiled-utility approaches measurably behind on some benchmarks. Treat specific numbers as
directional — they come from third-party benchmark suites, vary by version, and are not a substitute
for profiling your own screens.

The practical rule: **the seam is what matters, not the library.** Plain colocated objects behind
`ui/base` give you the MUI-shaped authoring experience at zero runtime cost. If a shared
cross-platform styling layer later proves necessary, the seam is what lets you adopt one without
rewriting call sites. What to avoid is reaching for runtime `styled()` interpolation on native out of
web habit.

## Review points

- Feature code imports from the `ui/base` seam, not from a component library or `react-native`
  directly.
- Wrappers stay thin: props in, primitive out, no data fetching or business logic.
- The same prop vocabulary works on both platforms where the codebase targets both.
- Spacing and colour come from theme tokens rather than literals.
- Accessibility props and `testID` pass through the wrapper instead of being swallowed.
