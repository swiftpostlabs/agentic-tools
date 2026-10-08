# Spacing and layout

Load when choosing spacing values, building a scale, or diagnosing a layout that "feels off".

## Why spacing is the highest-leverage detail

Proximity is the strongest cheap grouping signal the visual system offers (see `foundations.md`).
Space is therefore not the gap left over after placing things — it is the mechanism that tells the
viewer what belongs to what. Every border, card, divider, and background you add is a *second*
grouping signal compensating for a spacing decision you did not make.

**Default order of grouping tools:**

1. Space
2. Alignment
3. A divider line
4. A background or card (common region)
5. A border

Reach down that list only when the level above genuinely cannot carry the structure. Interfaces that
look noisy are usually using level 4 or 5 to do level 1's job.

## The defect that causes most "it feels off"

**Uniform spacing.** When the gap between a label and its field equals the gap between one field and
the next, the layout communicates nothing. The eye receives no grouping information, so the user has
to parse the structure consciously.

The fix is not "more space" — it is **unequal space on purpose**:

```text
Bad (everything 16px):          Good (4 / 24):
  Label                           Label
  [input]                         [input]
  Label                     ← 24px gap here
  [input]                         Label
                                  [input]
```

**Rule of thumb:** the gap *within* a group should be visibly smaller than the gap *between* groups —
enough that nobody has to measure. A ratio of roughly 1:3 or more between inner and outer reads
cleanly. That ratio is a working convention (tier 4), not a finding.

## Building a scale

Adopt a scale so spacing decisions stop being ad hoc. Any of these work:

| Approach | Values | Notes |
| --- | --- | --- |
| 4-pt / 8-pt grid | 4, 8, 12, 16, 24, 32, 48, 64 | Most common; aligns with Material and most icon grids |
| Modular (×1.5) | 4, 6, 9, 13, 20, 30, 45 | Smoother ramp, awkward numbers |
| Modular (×2) | 4, 8, 16, 32, 64 | Very few steps; forces decisiveness, sometimes too coarse |

**All of these are tier 4 conventions.** There is nothing perceptually special about 8. The value is
consistency: a limited set of gaps makes relationships legible and makes inconsistency visible as a
defect rather than as noise.

Pick one, put it in tokens, and stop debating individual pixel values.

## Density

Density is a product decision, not a taste one. Ask who is using this and how often:

- **Low density** — occasional users, unfamiliar tasks, marketing, mobile. Space is guidance.
- **High density** — expert users, repeated tasks, data tables, dashboards, IDEs. Space is a
  scrolling tax, and experts trade comfort for how much they can see at once.

A dashboard designed at marketing-page density is a real usability failure, not a stylistic
preference. Material provides explicit density scales for exactly this reason.

Whatever you choose, keep the *ratios* between inner and outer spacing intact as you compress.
Uniformly shrinking every gap destroys the grouping information first.

## Space around controls

Apple's HIG, on layout: "Make controls easier to use by providing enough space around them and
grouping them in logical sections. If unrelated controls are too close together — or if other
content crowds them — they can be difficult for people to tell apart."

WCAG SC 2.5.8 encodes the same idea from the other direction, through its spacing exception: an
undersized target can still conform when it is far enough from its neighbours. **Space substitutes
for size.** The threshold and the exact exception wording are owned by
`ref-sp-ux-accessibility` (its `references/thresholds.md`).

Practical: destructive actions get extra separation from the action next to them. That is a Fitts
argument (see `foundations.md`) and it is one of the legitimate ones.

## Alignment

- **Fewer alignment lines is better.** Every distinct left edge is a line the eye has to track.
  Align to as few as the content allows.
- **Alignment beats similarity for scanning.** A column of left-aligned items scans faster than a
  set of centred ones, whatever their styling.
- **Centre only short, isolated things** — a hero headline, an empty state, a dialog's actions.
  Centred body text has a ragged left edge, and the left edge is where the eye returns on every line.
- **Optical vs mathematical centring.** Mathematically centred glyphs and icons often look wrong:
  a triangular "play" icon, text with descenders, and a button label with trailing punctuation all
  need optical adjustment. Trust your eye over the number here — this is the one place where "it
  looks centred" beats "it is centred".

## Vertical rhythm

The idea: space vertically in multiples of a base line height so text blocks land on a shared grid.
It is worth doing loosely and not worth being religious about — strict baseline grids on the web
fight with images, embeds, and variable content and rarely survive contact.

The part that *is* worth keeping: **paragraph spacing should be larger than line spacing**, or
paragraphs stop reading as units. WCAG SC 1.4.8 (AAA) puts a normative floor under this — the value
is in `ref-sp-ux-accessibility` (its `references/thresholds.md`).

## Layout containers

- **Max width on text containers**, always. A `<p>` that spans a 27-inch monitor is unreadable —
  see the measure discussion in `typography.md`.
- **Margins scale with viewport; measure does not.** Widen the gutters, not the paragraph.
- **Multi-column body text is usually a mistake on screen** because the reader has to scroll to
  reach the bottom of column one and back up for column two. It works in print because the page
  boundary does the work.
