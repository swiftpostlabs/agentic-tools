# Testing accessibility for real

Load when actually checking a page rather than reading a threshold.

## The order that finds the most for the least effort

1. **Keyboard pass.** Unplug the mouse. `Tab` through the whole page. You are checking four things:
   can you reach every control, can you see where you are, is the order logical, and can you get out
   of everything you get into (modals, menus, date pickers). Most real barriers surface here, and no
   automated tool finds them.
2. **Zoom pass.** 400% browser zoom on a 1280 px viewport — that is the 320 px reflow condition
   (1.4.10). Look for horizontal scrollbars, clipped text, and controls that have moved off-screen.
3. **Text-spacing pass.** Apply the 1.4.12 values as a user stylesheet and look for clipping and
   overlap. This catches fixed-height containers instantly.
4. **Automated scan.** axe, Lighthouse, or equivalent. Fast, and it clears the mechanical failures
   so human attention goes where it counts.
5. **Screen reader spot-check.** One flow, not the whole app. VoiceOver (macOS/iOS), NVDA (Windows),
   TalkBack (Android), Orca (Linux).

## What the automated layer actually covers

Good at: contrast ratios, missing `alt`, missing form labels, missing `lang`, duplicate IDs, invalid
ARIA attribute/role combinations, empty links and buttons, heading-level skips.

Blind to: whether `alt` text says the right thing, whether focus order matches visual order, whether
an error message tells you how to fix it, whether a custom widget's keyboard model matches its
apparent role, whether a "skip link" actually skips anything useful, whether motion is disorienting.

**Report it honestly.** "0 automated violations" is not "accessible". Say which passes you ran and
which you did not.

## Driving checks from the terminal

This repo has `playwright-cli` (see `ref-sp-dev-playwright-cli`). Useful
patterns — `ref-sp-ux-design`'s responsive reference points here rather than keeping a second copy:

```bash
# Reflow: 320 CSS px wide, then look for horizontal overflow
yarn playwright resize 320 800
yarn playwright eval "() => document.documentElement.scrollWidth > document.documentElement.clientWidth"

# Focus order: tab through and record what receives focus
yarn playwright press Tab
yarn playwright eval "() => { const a = document.activeElement; return a.tagName + ' :: ' + (a.innerText||a.getAttribute('aria-label')||'').slice(0,60) }"

# Text-spacing override (1.4.12), applied as a user stylesheet
yarn playwright eval "() => { const s=document.createElement('style'); s.textContent='*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important}p{margin-bottom:2em!important}'; document.head.appendChild(s); return 'applied' }"

# Accessibility snapshot — names, roles, structure as assistive tech sees them
yarn playwright snapshot
```

The `snapshot` command returns the accessibility tree, which is the closest cheap proxy for what a
screen reader will announce. An element that shows up with no accessible name is a finding.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This blanket rule is a reasonable safety net, not a design. Prefer replacing motion with a
cross-fade or an instant state change where the motion carried meaning.

## Contrast checking without a GUI

Contrast ratio is `(L1 + 0.05) / (L2 + 0.05)` where L is relative luminance. Do not eyeball it and do
not trust a screenshot — sample the computed colours:

```bash
yarn playwright eval "(el) => { const s = getComputedStyle(el); return {color: s.color, bg: s.backgroundColor, size: s.fontSize, weight: s.fontWeight} }" "<ref from snapshot>"
```

Then compute against the 4.5:1 / 3:1 thresholds, remembering the large-text carve-out (≥18 pt, or
≥14 pt bold).

Watch for the two cases that fool checkers: text over an image or gradient (there is no single
background colour), and semi-transparent overlays (the computed `rgba` is not what is rendered).

## Things that are not evidence of conformance

- An **accessibility overlay** or widget script. These do not deliver conformance, are rejected by
  the accessibility community, and have attracted enforcement action.
- A **VPAT** or accessibility statement written by the vendor selling the product.
- A **Lighthouse accessibility score**. It is a weighted subset of axe rules and tops out well short
  of a conformance claim.
