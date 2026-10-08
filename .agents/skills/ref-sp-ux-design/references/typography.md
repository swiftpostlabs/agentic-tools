# Typography: size, measure, rhythm, emphasis

Load when choosing type sizes, line height, line length, or deciding how to emphasise something.

## Size: there is a floor, not an optimum

Legge & Bigelow (2011), *Does print size matter for reading?*, **Journal of Vision 11(5):8**,
establishes the **critical print size (CPS)**: an x-height of about **0.2 degrees** of visual angle —
roughly 9 pt Times New Roman at 40 cm. Below the CPS, reading speed drops sharply. Above it, reading
speed is essentially flat across a wide range of sizes.

Two consequences, and both matter:

1. **Body text has a floor.** Undersized body text is a genuine performance defect, not a style
   choice.
2. **Above the floor, bigger is not faster.** Larger body text buys comfort, tolerance for poor
   conditions, and headroom for users who need it — not speed. Do not claim a reading-speed benefit
   for going from 16 px to 18 px; there is not one.

**Conventional floors** (tier 4, consistent with the CPS finding):

| Context | Default | Minimum |
| --- | --- | --- |
| Web body text | 16 px | 14 px, and only for genuinely secondary text |
| iOS body (Apple HIG) | 17 pt | 11 pt |
| Screen threshold legibility | — | ~10 pt |

Apple adds a real caveat: "Thicker weights are easier to read for smaller font sizes" — with a thin
custom weight, go larger than the default.

**x-height matters more than point size.** Two fonts at the same nominal size can differ enormously
in apparent size because the CPS is defined on x-height, not on the em box. When you swap a
typeface, re-check sizes rather than keeping the numbers.

## Measure (line length): the fact everyone gets backwards

Dyson's review of on-screen reading finds:

- Reading is **fastest at long lines — around 100 characters per line**.
- Readers **prefer** short-to-medium lines, roughly **45–72 characters**.
- ~55 CPL performs well across normal and fast reading speeds.

So the ubiquitous "50–75 characters is optimal for readability" is a **preference** finding presented
as a **speed** finding. State it correctly:

> Measure is a comfort and preference optimum. Long lines are read faster and liked less.

Why preference still wins in practice: on the web, nobody is being paid to finish. A layout people
find unpleasant is abandoned, and abandonment costs more than the reading-speed delta. Design for
45–75 CPL because readers prefer it — not because it is faster, because it is not.

The only normative figure is **WCAG SC 1.4.8 (AAA)**, which caps measure at 80 characters (40 for
CJK). That number is owned by
`ref-sp-ux-accessibility` (its `references/thresholds.md`) and is repeated here only because
it is the object of the correction above — it is the one place a normative cap exists, and the
45–75 convention is not it.

```css
/* ch ≈ width of "0"; 60–70ch lands around 55–70 characters for most fonts */
.prose { max-width: 65ch; }
```

## Line height (leading)

- **Body text: 1.4–1.6.** Longer measures need more leading; the eye needs help finding the start of
  the next line. Tighter than ~1.3 on a long measure produces the "solid grey block" effect.
- **Headings: 1.1–1.25.** Large type needs proportionally less leading, and a heading set at 1.5
  falls apart into separate lines.
- **Line height is unitless.** `line-height: 1.5`, never `line-height: 24px` — the unitless value
  inherits correctly through nested elements of different sizes.

WCAG 1.4.12 requires that nothing *breaks* when a user forces 1.5 — it does not require you to ship
1.5. See `ref-sp-ux-accessibility`.

## Tracking (letter spacing)

- **Large text needs negative tracking.** Display sizes look loose at default spacing; roughly
  −0.01 to −0.03 em for headlines.
- **Small text and all-caps need positive tracking.** Caps were designed with more space between
  them; running them at body tracking looks cramped.
- **Never track body text** for aesthetics. It is set correctly by the designer of the typeface.

Material expresses tracking as `em = tracking in px / font size` — a scale-invariant way to keep
tracking proportional as sizes change.

## The type scale

A modular scale (a base size times a ratio, repeatedly) gives you a small set of sizes that look
deliberately related. Common ratios: 1.2 (minor third), 1.25, 1.333 (perfect fourth), 1.5.

This is **tier 4 convention**. The ratios come from musical intervals by analogy, and the analogy is
decorative, not perceptual. Adopt a scale because a constrained set of sizes is legible and
maintainable, not because 1.25 is harmonious.

Material 3 ships 15 baseline roles (display / headline / title / body / label × large / medium /
small) plus 15 emphasized variants. Their own guidance is worth repeating: "No single product will
use all the styles."

Practical: 5–7 sizes covers almost any product. If you need a ninth, you probably have a hierarchy
problem, not a scale problem.

## Emphasis: bold, italic, caps

The direct evidence: Dyson, M. C., & Beier, S. (2016), *Investigating typographic differentiation:
italics are more subtle than bold for emphasis*, **Information Design Journal 22(1), 3–18**.

Three experiments with purpose-designed fonts found that words set in **bold** or expanded faces,
alternated with a neutral font, **may impair** letter-identification performance, while switching to
**italic does not** disrupt recognition. Macaya & Perea (2014) separately found bold words are
recognised *faster* than roman, particularly for uncommon words.

Put together: **bold's disruptiveness is exactly what makes it work as emphasis.** That is a feature
at word scale and a defect at paragraph scale.

| Device | Use for | Avoid for |
| --- | --- | --- |
| **Bold** | Emphasis, headings, key terms, UI labels that must be found | Long runs; more than a few phrases per screen |
| *Italic* | Titles, foreign or technical terms, asides, voice, subtle differentiation | "Look at this" emphasis; whole paragraphs (Tinker, 1963/65: all-italic slows reading) |
| ALL CAPS | Short labels, buttons, eyebrows | Sentences and paragraphs — Perea, Rosa & Marcet (2017) found more re-fixations than lowercase |
| Underline | Links, on the web | Anything else |
| Colour alone | Nothing | Any information-carrying distinction (WCAG 1.4.1, Level A) |

**Emphasis inflation is the real failure.** Six bold phrases in a paragraph mean nothing is
emphasised. Budget it: roughly one emphasised element per paragraph, and if you need more, the
structure is wrong — those should probably be a list or subheadings.

## Font pairing and loading

- **Two families is plenty**; one with a good weight range is often better. Pairing rules
  ("contrast a serif with a sans") are conventions, not findings.
- **A superfamily** (a sans and serif designed together) removes the pairing question entirely.
- **System font stacks cost nothing** and render instantly. `system-ui` is a legitimate choice, not a
  cop-out.
- **`font-display: swap`** so text is readable during load; a flash of unstyled text beats invisible
  text.
- **Subset and preload** the faces you actually use. Every weight is a separate download.
- **Variable fonts** collapse many weights into one file — usually a net win if you use three or more
  weights.
