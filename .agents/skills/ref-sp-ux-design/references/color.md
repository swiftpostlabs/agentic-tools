# Colour: spaces, ramps, roles, themes

Load when building or repairing a palette. **Contrast thresholds are not here** — they live in
`ref-sp-ux-accessibility`, which owns every normative number.

## Work in a perceptually uniform space

The problem with HSL: equal `L` values do not look equally light across hues. `hsl(60 100% 50%)`
(yellow) and `hsl(240 100% 50%)` (blue) are nominally the same lightness and are nothing alike. Build
a ramp in HSL and it will bulge and dip unpredictably as hue changes — this is why hand-tuned
palettes never quite generalise.

**OKLCH fixes the axis you actually care about.** CSS Color 4 (W3C **Candidate Recommendation
Draft**, 28 July 2026) defines:

- `oklab(L a b)` — rectangular: lightness, red/green axis, yellow/blue axis.
- `oklch(L C H)` — cylindrical: **L**ightness, **C**hroma, **H**ue angle. This is the one to author in.

```css
--brand-500: oklch(0.55 0.18 265);
--brand-600: oklch(0.48 0.18 265);  /* same hue and chroma, lower lightness */
```

Because L tracks perceived lightness, stepping L generates a ramp whose steps *look* even. That is
the whole argument for OKLCH in palette work.

**Verification note:** the specification excerpt captured during sourcing did not itself state the
lightness-uniformity property; it is the design intent of the Oklab space rather than a quote from
CSS Color 4. Treat "equal L looks equally light across hues" as the space's design goal, and check a
generated ramp with your eyes rather than assuming perfection — Oklab is *more* uniform than HSL, not
perfect.

Browser support for `oklch()` is broad in current browsers; if you need a fallback, ship an sRGB
value first and let the OKLCH declaration override it.

## Build ramps, not colours

A palette is a set of **ramps** — one per hue family — each with consistent lightness steps.

| Step | Typical use |
| --- | --- |
| 50–100 | Page and surface backgrounds (light theme) |
| 200–300 | Borders, dividers, disabled surfaces |
| 400–600 | The colour itself: fills, primary actions |
| 700–900 | Text on light surfaces, hover/pressed states |

Generate by stepping L at fixed hue, then adjust chroma: **chroma must fall at the extremes**,
because very light and very dark colours cannot hold high chroma without leaving the gamut. A ramp
that keeps chroma constant will clip at both ends.

## Name by role, not by hue

The single most common palette failure is naming colours after what they look like. `blue-500` tells
you nothing about where it may be used, and it becomes a lie the moment you add a dark theme where
the "blue" surface is nearly black.

Define **semantic roles** and map them to ramp steps:

```text
surface            on-surface
surface-variant    on-surface-variant
primary            on-primary
secondary          on-secondary
border / outline
success / warning / danger  (+ their on- pairs)
```

The `on-x` convention (from Material) is worth stealing: every background role carries the
foreground role guaranteed to be legible on it. It makes contrast a property of the token pair rather
than something each engineer re-derives.

State variants — hover, pressed, focused, disabled, selected — belong in the token set too. If they
are not tokens, they will be invented inconsistently at each call site.

## Dark theme is not an inversion

- **Do not simply flip the ramp.** Pure white on pure black causes halation — the text appears to
  glow and smear. Use an off-black surface (around `oklch(0.2 …)`) and an off-white foreground.
- **Reduce chroma in dark themes.** Saturated colours read as far more intense against a dark
  surface. Same hue, less chroma.
- **Elevation is expressed differently.** In light themes, elevation is shadow. On a dark surface,
  shadow is nearly invisible, so elevation becomes *lighter* surfaces — a raised card is a lighter
  grey, not a darker one with a shadow.
- **Re-check contrast in both themes separately.** A pair that passes in light routinely fails in
  dark. Apple's HIG says exactly this.

## Never encode meaning in hue alone

Red–green colour vision deficiency affects roughly **8% of males** in Northern European populations
and about **0.5% of females**. Pooled global estimates are nearer **4.5% / 0.4%** — the 8% figure is
population-specific and is quoted globally far more often than it should be. State the population
when you cite it.

The design rule does not change either way: **pair hue with a second channel** — text, icon, shape,
position, or pattern.

Repeat offenders: chart series distinguished only by colour; required fields marked only in red;
status badges (green/amber/red) with no label; links distinguished from body text only by hue; diff
views with no +/− markers.

The normative form is **WCAG 1.4.1 Use of Color, Level A**.

## Elevation and depth

Depth cues are a grouping mechanism (common region, mostly), and they are expensive. In order of
subtlety:

1. **Background change** — cheapest, works in both themes.
2. **Border** — explicit, works everywhere, adds visual noise.
3. **Shadow** — reads as physical elevation; nearly useless on dark surfaces.
4. **Blur / translucency** — expensive to render, hard to keep legible, platform-flavoured.

Use one consistently. Interfaces that mix all four look accidental. Vendor materials (Apple's Liquid
Glass, Material's tonal elevation) are tier 4 conventions specific to those platforms — do not port
them into a web product and call it a principle.

## Folklore to refuse

- **60-30-10.** An interior-decorating heuristic. Harmless as a starting sketch, indefensible as a
  rule; there is no perceptual research behind it.
- **"Colour psychology"** — blue = trust, red = urgency, green = calm. Culturally contingent and not
  replicated at the strength design writing claims. Do not put it in a deliverable as fact.
- **"Never use pure black."** Reasonable advice about halation, stated as a taboo. `#000` is fine as
  a foreground on a light surface.
