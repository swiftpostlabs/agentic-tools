---
name: ref-sp-ux-accessibility
description: "WCAG 2.2 as the floor: contrast, text, target, and focus thresholds, keyboard and screen-reader use, alt text, ARIA, semantic markup, motion, APCA, overlays. Owns every accessibility number in this repo. Use when checking or fixing accessibility or a specific value."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "ux"
  shareable-skills.tags: "accessibility, wcag, testing"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-ux-design, ref-sp-dev-playwright-cli"
---

# UX Accessibility

The normative accessibility floor. Every accessibility number in this repo lives here, versioned and
sourced, in `./references/thresholds.md`, so no other skill invents a threshold and no two disagree.
How something should *look* (spacing, palette, type scale, hierarchy, readable prose) is
`ref-sp-ux-design`, which cites criterion numbers but never their values, with one recorded
exception
(the 80-character measure cap, repeated there because it is the subject of a correction). If a
threshold value appears in a third place,
remove that copy rather than keeping it in sync.

## The version matters — say it out loud

Everything below is **WCAG 2.2**, verified **2026-08-02**. WCAG 2.2 is the current W3C
Recommendation. State the version whenever you quote a number, because the numbers are the part that
moves.

**WCAG 3 is not usable as a target.** It is a Working Draft, realistically not complete before
~2030, and its contrast algorithm is explicitly undetermined. See the APCA section.

## Conformance levels are not a difficulty ladder

A, AA, AAA are *categories of barrier*, not tiers of effort. **AA is the standard almost every legal
regime and procurement policy actually references.** AAA is not "extra credit you should aim for" —
W3C itself does not recommend AAA conformance for entire sites, because some AAA criteria are
impossible for some content types.

Default target: **WCAG 2.2 Level AA.** Reach for a specific AAA criterion when the content warrants
it, and say which one.

## The thresholds

These are the numbers. Load `./references/thresholds.md` for the full table with exceptions and
exact normative wording.

### Contrast

| Criterion | Level | Requirement |
| --- | --- | --- |
| 1.4.3 Contrast (Minimum) | AA | **4.5:1** normal text; **3:1** large text (≥18pt, or ≥14pt bold) |
| 1.4.11 Non-text Contrast | AA | **3:1** for UI components and meaningful graphics |
| 1.4.6 Contrast (Enhanced) | AAA | 7:1 normal; 4.5:1 large |

### Text and layout

| Criterion | Level | Requirement |
| --- | --- | --- |
| 1.4.4 Resize Text | AA | Works at **200%** zoom without loss of content or function |
| 1.4.10 Reflow | AA | No two-dimensional scrolling at **320 CSS px** wide |
| 1.4.12 Text Spacing | AA | Nothing breaks when the **user** sets line height 1.5×, paragraph spacing 2×, letter spacing 0.12×, word spacing 0.16× |
| 1.4.8 Visual Presentation | AAA | Line length ≤ **80 characters** (40 CJK) |

**Read 1.4.12 in the right direction.** It does not tell you to ship `line-height: 1.5`. It tells
you
that when a user forces those values, your layout must not clip, overlap, or hide anything. Design
guidance that cites 1.4.12 as "WCAG requires 1.5 line height" is misreading it.

### Targets and focus

| Criterion | Level | Requirement |
| --- | --- | --- |
| 2.5.8 Target Size (Minimum) | AA | **24 × 24 CSS px** |
| 2.5.5 Target Size (Enhanced) | AAA | **44 × 44 CSS px** |
| 2.4.11 Focus Not Obscured (Min) | AA | Focused element not **entirely** hidden by author content |
| 2.4.13 Focus Appearance | AAA | Indicator ≥ area of a **2 CSS px** perimeter, **3:1** contrast against unfocused state |

Both target criteria carry the same four exceptions (equivalent target elsewhere, inline in text,
user-agent controlled, essential). Sticky headers and cookie banners are the usual 2.4.11 failure.

### Colour is not information

**1.4.1 Use of Color (Level A).** Colour must never be the only way information is conveyed. This is
Level A — the floor of the floor — and it is the criterion that makes colour-vision deficiency a
design constraint rather than a nice-to-have. Red-green deficiency affects roughly **8% of males**
in Northern European populations (~4.5% pooled globally) and ~0.5% of females.

Error states, required fields, chart series, and status badges are the repeat offenders. Pair hue
with text, icon, pattern, or position.

## APCA: answer this correctly, because most sources do not

**APCA is not a standard, and it is not "the WCAG 3 algorithm".**

- APCA was exploratory content in the WCAG 3 draft, flagged for removal in early 2023 and **pulled
  from the July 2023 Working Draft**.
- The current WCAG 3 draft says the contrast algorithm is **yet to be determined**.
- WCAG 3 is not expected before ~2030.

**What to tell a user:** conform to WCAG 2.2 contrast. APCA is a defensible *supplementary* check —
it models thin light-on-dark text better than WCAG 2's ratio does — but if you ship a pair that
fails WCAG 2 and passes APCA, you have taken on a documented risk, not met a standard. Say that
plainly rather than repeating the vendor line.

Note that Apple's own HIG names both, while Apple's Accessibility Inspector uses WCAG AA values.
Vendors hedge; the standard has not moved.

## ARIA: the first rule is not to use it

**No ARIA is better than bad ARIA.** A native `<button>` carries role, focusability, keyboard
activation, and state for free; `<div role="button">` carries none of it until you write all of it
correctly.

Order of preference: native element → native element with an accessible name → ARIA only for
patterns HTML cannot express (live regions, complex composite widgets). Every ARIA attribute you add
is a promise you must keep in JavaScript.

Load `./references/semantic-structure.md` for the element-by-behaviour table, landmark mapping and
its traps (`<header>` is only `banner` at page level; an unnamed `<section>` is not a landmark), and
heading rules. It also answers the SEO/AI version of the question honestly: semantic markup is
**not** a ranking factor and barely affects AI content extraction — accessibility and
maintainability are the real case, and they are enough.

## What automated checking can and cannot tell you

Automated checkers find a real but **minority** share of barriers. They are good at contrast ratios,
missing `alt`, missing labels, missing lang, duplicate IDs, and invalid ARIA. They cannot judge
whether alt text is *meaningful*, whether focus order is *logical*, whether an error message is
*understandable*, or whether a custom widget actually works with a screen reader.

A clean axe run is a floor, not a pass. Report it as "no automated violations", never as
"accessible".

**Overlay products** (one-line scripts promising conformance) do not deliver it, are widely rejected
by the accessibility community, and have been the subject of enforcement action. Do not recommend
one.

For how to actually test — keyboard pass, zoom pass, spacing-override bookmarklet, screen reader
basics, and driving checks through `playwright-cli` — load `./references/testing.md`.

## Sources and staleness

`./references/sources.md` maps every number above to its primary, the date it was verified, and what
would invalidate it. Re-check before asserting a specific if this file is more than a few months
old; a WCAG 2.3 or 3.0 release moves the numbers, not the method.
