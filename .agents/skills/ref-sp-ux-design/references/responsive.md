# Responsive and mobile-first

Load when choosing breakpoints, adapting a layout across sizes, or arguing about the thumb zone.

## What mobile-first actually is

It is a **content-priority discipline**, not a media-query ordering convention. The narrow viewport
does not fit everything, so it forces the question you would otherwise avoid: what actually matters?

Designing wide-first and then removing things produces an amputated desktop layout. Designing
narrow-first and then adding produces a layout that has an explicit priority order at every size.

The min-width media query ordering follows from that. It is the consequence, not the point.

## Content-driven breakpoints

**Break where the content breaks, not where a device is.** Widen the browser slowly and watch: the
moment a line gets uncomfortably long, a card grid leaves an awkward gap, or a nav no longer fits —
that is a breakpoint. It belongs to your content and will not move when the device landscape does.

Device-width breakpoints rot. Content-driven ones do not.

```css
/* The breakpoint is where THIS layout stops working, not "tablet" */
@media (min-width: 52rem) { .layout { grid-template-columns: 1fr 18rem; } }
```

Modern CSS removes much of the need for breakpoints entirely:

```css
/* Wraps when items no longer fit — no media query, no magic number */
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1.5rem; }

/* Component adapts to its container, not the viewport */
.sidebar { container-type: inline-size; }
@container (min-width: 30rem) { .card { flex-direction: row; } }
```

Container queries are usually the right answer for components, because a component does not know
what viewport it is in and should not care.

## Size classes as a sanity check

Material 3's window size classes (tier 4 — a vendor convention, authoritative about Material):

| Class | Width | Typical |
| --- | --- | --- |
| Compact | < 600 dp | Phone portrait |
| Medium | 600–839 dp | Tablet portrait, unfolded foldable |
| Expanded | 840–1199 dp | Phone landscape, tablet landscape, desktop |
| Large | 1200–1599 dp | Desktop |
| Extra-large | 1600 dp+ | Desktop, ultra-wide |

M3's recommended pane counts: compact 1; medium 1 (recommended) or 2; expanded 1 or 2 (2
recommended); large 1 or 2 (2 recommended); extra-large 1 to 3.

Use these to ask "what class am I landing in and is that sensible", not as CSS constants.

**Height rarely needs adapting.** Material's own note: since most layouts scroll vertically, it is
rare that a layout needs to respond to available height.

## Touch, pointer, and reach

**Target size is normative and this skill does not own the number.** WCAG SC 2.5.8 (AA) and 2.5.5
(AAA) set it; read the values in `ref-sp-ux-accessibility` (its `references/thresholds.md`).
What belongs here is the design consequence: Apple's 44 pt and Material's 48 dp are vendor
conventions that happen to sit near the AAA criterion, and neither is independent evidence.

**Detect capability, not device:**

```css
@media (pointer: coarse) { .btn { min-block-size: 2.75rem; } }  /* finger */
@media (hover: none)     { .tooltip-only-affordance { display: none; } }
```

A touchscreen laptop has both. A phone with a stylus has fine pointing. Device-class sniffing gets
these wrong; capability queries do not.

**Hover is not available everywhere.** Any affordance that only appears on hover is invisible to
touch users. If information or an action is hover-only, it is missing on half your traffic — and
WCAG 1.4.13 governs how hover content must behave when it does exist.

## The thumb zone, honestly

The heat-map diagram showing a comfortable arc for the thumb is usually sourced to Steven Hoober's
2013 UXmatters observational study. What that study actually found, from **1,333 observations**
(780 of which involved touching the screen):

| Grip | Share |
| --- | --- |
| One-handed | **49%** |
| Cradled | **36%** |
| Two-handed | **15%** |

Within one-handed use: right thumb 67%, left thumb 33%. Two-handed use was 90% portrait.

**What this does and does not support.** One-handed thumb use is common — the single largest
category — but it is **not** what a majority of people are doing, and cradled and two-handed grips
put an index finger anywhere on the screen. The data is also from 2013, on phones far smaller than
today's.

So: putting primary actions within easy bottom-screen reach is a cheap, sensible default. It is not a
law, it does not justify contorting a layout, and "the thumb zone says so" is not an argument. Cite
the year and the n whenever you use this.

## Practical checks

The narrow-viewport and zoom checks are accessibility conformance tests, and the procedure — with
the exact widths, zoom levels, and `playwright-cli` commands — lives in
`ref-sp-ux-accessibility` (its `references/testing.md`). Run it from there rather than
keeping a second copy in sync here.

Two design checks that are *not* conformance tests, and so do belong here:

- **Landscape on a phone.** Short viewports break fixed headers, modals, and anything positioned
  against the bottom edge. No criterion covers this; it is just a layout that falls over.
- **Hover dependence.** Any affordance that only appears on hover is invisible to touch. This is a
  design defect before it is a conformance one.

## Fluid type, carefully

```css
/* Scales between bounds; the calc() keeps it zoomable */
h1 { font-size: clamp(1.75rem, 1.2rem + 2.5vw, 3rem); }
```

Use `rem` in the `clamp()` bounds. A purely `vw`-based size does not respond to the user's font-size
setting, which fails WCAG SC 1.4.4. Fluid type is a convenience, not a requirement — a few fixed steps
at breakpoints is perfectly good and easier to reason about.
