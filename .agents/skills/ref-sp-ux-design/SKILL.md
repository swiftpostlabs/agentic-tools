---
name: ref-sp-ux-design
description: "Interface design from evidence: grouping, hierarchy, spacing, type scale, line length, emphasis, colour palettes, walls of text, mobile-first, each claim labelled research, standard, convention, or folklore. Use when a UI feels cluttered or off, or when designing or reviewing one."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "ux"
  shareable-skills.tags: "design, typography, readability"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-ux-accessibility, ref-sp-dev-playwright-cli, ref-sp-js-react, ref-sp-web-seo"
---

# UX Design

Making design decisions defensible by separating what perceptual research establishes from what is
standard, house convention, or folklore. Trends rot; mechanisms don't, so everything here is
organised around *why* it works. Whether something *passes* (contrast, target size, reflow, focus,
any WCAG threshold) is `ref-sp-ux-accessibility`, which owns every normative number: this skill
names criteria by number (SC 1.4.1, SC 2.5.8) and never their values, except the 80-character cap
recorded in `./references/typography.md`.

## The rule that makes this skill different: label the claim

Before asserting anything about design, know which of these you are saying. State the tier when it
matters, and never let a lower tier impersonate a higher one.

| Tier | What it is | How to treat it |
| --- | --- | --- |
| 1. **Perceptual / cognitive research** | Gestalt grouping, critical print size, Fitts | Durable. Cite the primary. Respect its scope. |
| 2. **Normative standard** | WCAG, ISO, CSS specs | Binding and versioned. Quote the version. |
| 3. **Practitioner research** | NN/g eyetracking, Hoober's grip study | Real data, known bounds, often old. State the year and the n. |
| 4. **Design-system convention** | 8-pt grid, Material's 600/840 dp, 44 pt targets | Internally consistent, not empirical. Say "convention". |
| 5. **Folklore** | 60-30-10, "7±2 menu items", golden-ratio typography, the thumb heat map as law | Name it and refute it. |

**Vendor design systems are interested parties.** Material 3 and Apple's HIG are authoritative about
*their own platforms* and are not evidence about human perception. A Material spacing token is tier
4 no matter how confident the documentation sounds.

Load `./references/folklore.md` when someone quotes a rule you suspect is tier 5.

## Foundations: grouping is the whole game

Almost every "this looks messy" complaint is a grouping failure, and grouping is the best-established
part of the whole field.

Wertheimer's grouping principles — proximity, similarity, common fate, good continuation, closure,
symmetry, parallelism — plus later additions, notably **common region** (Palmer, 1992) and **element
and uniform connectedness** (Palmer & Rock, 1994). The authoritative modern review is Wagemans et al.
(2012), *Psychological Bulletin* 138(6).

The review is careful, and so should you be: these are **principles, not laws**. They describe
reliably how grouping is *perceived*. They do not adjudicate a spacing argument, and the review
itself records the historical criticism that they were stated "with little precision".

**The load-bearing consequence:** proximity is the strongest and cheapest grouping signal available.
That is *why* spacing is the most underrated detail in interface design — space is not decoration,
it is the primary mechanism by which a viewer decides what belongs with what. Before adding a
border, a card, a background, or a divider, ask whether space alone would do the job. It usually
does, and it does it with less visual noise.

Apple's HIG states the same thing from the vendor side: "Group related items… you might use negative
space, background shapes, colors, materials, or separator lines" — negative space listed first.

Load `./references/foundations.md` for the full principle set, cognitive load, visual hierarchy
mechanics, Nielsen's heuristics, and the honest scope limits of Fitts, Hick, and Miller.

## Spacing

The single highest-leverage thing in a layout, and the least discussed.

- **Space communicates relationship.** Elements closer together are read as belonging together —
  this outranks similarity of colour or size. The most common real defect is *uniform* spacing:
  when everything is 16 px apart, nothing is grouped, and the eye gets no structure.
- **Make the gaps unequal on purpose.** A label 4 px from its input and 24 px from the next field
  says something. Both at 16 px says nothing.
- **Space *around* a control is part of the control.** Crowded controls are hard to tell apart —
  Apple's HIG says exactly this, and WCAG SC 2.5.8's spacing exception encodes it.
- **A spacing scale is a convention, not a finding.** 4/8-pt grids, 1.5 modular ratios, 8-point
  systems — all tier 4. They are worth adopting because consistency is legible, not because 8 is a
  perceptually special number. Say "we use an 8-pt scale" and never "8 px is correct".

Load `./references/spacing-and-layout.md` for building a scale, density decisions, alignment, and
optical vs mathematical centring.

## Typography

Three things carry most of the weight: size, measure, and emphasis.

**Size.** There is a **critical print size** — below it reading speed collapses, above it speed is
flat over a wide range (Legge & Bigelow, 2011). So body text has a *floor*, and past the floor,
larger buys comfort, not speed. Apple's platform defaults (17 pt body, 11 pt minimum on iOS) and the
web's 16 px convention sit consistently above that floor. Floor: tier 1. The specific numbers: tier 4.

**Measure (line length).** The most misreported fact in design writing. Dyson's work finds reading
is **fastest at long lines — around 100 characters** — while readers **prefer** 45–72. The famous
"50–75 characters is optimal" is a *preference* result being sold as a *speed* result. The honest
statement: measure is a comfort optimum. The one place a normative cap exists is WCAG SC 1.4.8, and
that is AAA — see `./references/typography.md`.

**Emphasis.** Dyson & Beier (2016) tested this directly: bold words are perceptually salient but
alternating into bold **can impair** letter identification, while switching to italic does not
disrupt recognition. The synthesis worth remembering: *the property that makes bold work as emphasis
is the same property that makes it slightly harder to read.*

- **Bold** — for emphasis and for headings. Correct tool, use it sparingly. A paragraph where six
  phrases are bold has no emphasis at all.
- *Italic* — genuinely more subtle. Right for titles, terms, asides, and voice. Weak for "look here".
  Whole paragraphs in italic read slower (Tinker, 1963/65).
- ALL CAPS — more re-fixations than lowercase (Perea, Rosa & Marcet, 2017). Fine for a label,
  bad for a sentence.
- Underline on the web means link. Do not use it for emphasis.

Load `./references/typography.md` for scales, line height, tracking, font pairing, and web font
loading.

## Colour

- **Build ramps in a perceptually uniform space.** In HSL, equal lightness values do not look equally
  light across hues — that is why HSL palettes drift and why a "50% blue" and a "50% yellow" are
  nothing alike. `oklch()` and `oklab()` (CSS Color 4, Candidate Recommendation) exist to fix this.
  Use OKLCH to generate tonal ramps and you get predictable steps for free.
- **Semantic roles, not a paint list.** Define surface / on-surface / primary / on-primary / border /
  danger and their states. A palette that names colours by hue ("blue-500") stops scaling the moment
  you add a dark theme.
- **Never encode meaning in hue alone.** Red–green deficiency affects roughly 8% of males in
  Northern European populations (nearer 4.5% pooled globally). Pair hue with text, icon, shape, or
  position. The normative form of this rule is WCAG 1.4.1, Level A — see `ref-sp-ux-accessibility`.
- **Contrast thresholds live in `ref-sp-ux-accessibility`.** Do not restate
  them here. And if
  someone proposes APCA: it is a candidate method, not a standard, and it was removed from the
  WCAG 3 draft in 2023.
- **60-30-10 is folklore.** Fine as a starting sketch, not a rule, and there is no perceptual
  research behind it.

Load `./references/color.md` for ramp construction, dark theme, elevation, and gamut handling.

## Readable long-form: the "no wall of text" problem

The evidence here is unusually direct. Nielsen's 1997 rewrite study measured four versions of the
same content:

| Change | Measured usability improvement |
| --- | --- |
| Concise text (about half the words) | **58%** |
| Scannable layout (bulleted, structured) | **47%** |
| Objective language (no marketing puff) | **27%** |
| All three | **124%** |

**Note which one wins: cutting words.** The instinct is to add bullets and subheads; the bigger
effect was deleting text. (Sample size is not stated in the source — treat the ordering as durable
and the percentages as indicative. 1997 lab study.)

On scanning, NN/g's eyetracking gives you a target and an anti-target:

- **F-shaped pattern** — the *failure* symptom, not a layout goal. It appears when text is
  unformatted and the reader is uncommitted, and NN/g is explicit that it "is bad for users and
  businesses". Anyone telling you to "design for the F-pattern" has inverted the finding.
- **Layer-cake pattern** — eyes moving between headings and subheadings. *This* is what you design
  for. It is what good heading structure produces.

Practical consequences: front-load the point; headings that state content rather than tease it; one
idea per paragraph; lists for things that are actually lists; measure inside the comfort band.

Load `./references/content-readability.md` for structure patterns, plain-language guidance, and why
readability formulas mislead.

## Mobile-first and responsive

- **Mobile-first is a content-priority discipline**, not a media-query order. Starting narrow forces
  the ranking question — what actually matters — and prevents designing a desktop layout you then
  amputate.
- **Break where the content breaks.** Content-driven breakpoints beat device-width breakpoints,
  because device widths keep changing and your content does not.
- **Size classes are a sanity check, not a mandate.** Material 3's compact <600 / medium 600–839 /
  expanded 840–1199 / large 1200–1599 / extra-large 1600+ dp are useful for asking "what am I
  actually on", and they are tier 4.
- **The thumb-zone heat map is over-claimed.** Its usual source is Hoober's 2013 observation of
  1,333 people, which found one-handed use at **49%** — common, but not the majority, and cradled
  (36%) and two-handed (15%) use place fingers elsewhere. The data is from 2013 phones. Put primary
  actions within easy reach because it is cheap, not because "the thumb zone" is a law.
- **Height rarely matters.** Material's own note: most layouts scroll vertically, so adapting to
  available height is rarely needed.

Load `./references/responsive.md` for breakpoint strategy, touch vs pointer input, and density.

## Before you call a design decision done

1. Can you say **why** in one sentence that is not "it looks better"?
2. Which tier is your justification — research, standard, convention, or taste? Taste is allowed;
   claiming it is research is not.
3. Does grouping survive: would a stranger draw the same boxes around your content that you would?
4. Does it survive the narrow-viewport and text-zoom checks (WCAG SC 1.4.10 and 1.4.4)? Values and
   procedure: `ref-sp-ux-accessibility` (its `references/testing.md`).
5. Is any information carried by colour alone?
6. Have you deleted anything? Conciseness measured better than every formatting change.

## Sources and staleness

`./references/sources.md` maps every dated or numeric claim above to its primary, when it was
verified, and what would invalidate it — including which claims are currently **corroborated but not
primary-verified**. Content verified **2026-08-02**.

Perceptual mechanisms age slowly; vendor conventions and CSS specification status age quickly. If a
number here is load-bearing for a deliverable, re-check it.
