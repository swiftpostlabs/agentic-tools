# Sources and provenance

Every dated or numeric claim in this skill, mapped to where it came from, when it was checked, and
what would make it wrong.

**Claim tiers** (same scheme as the `references/sources.md` of `ref-sp-ux-design`):

1. **Perceptual/cognitive research** — durable, cite the primary.
2. **Normative standard** — binding, versioned, checkable.
3. **Practitioner research** — real data, known sample bounds, often old.
4. **Design-system convention** — internally consistent, not empirical.
5. **Folklore** — name it and refute it.

Almost everything in this skill is **tier 2**. That is the point of the skill.

## Primary documents

| Document | URL | Verified |
| --- | --- | --- |
| WCAG 2.2 (W3C Recommendation) | <https://www.w3.org/TR/WCAG22/> | 2026-08-02 |
| WCAG 2.2 Quick Reference | <https://www.w3.org/WAI/WCAG22/quickref/> | 2026-08-02 |
| WAI supplemental guidance (non-normative) | <https://www.w3.org/WAI/WCAG2/supplemental/> | 2026-08-02 |
| Apple HIG — Accessibility | <https://developer.apple.com/design/human-interface-guidelines/accessibility> | 2026-08-02 |

`developer.apple.com` and `m3.material.io` are client-rendered shells: a plain fetch returns an empty
body with HTTP 200. Read them with `playwright-cli`.

## Claim table

| Claim | Tier | Source | Verified | Invalidated by |
| --- | --- | --- | --- | --- |
| 4.5:1 / 3:1 contrast at AA | 2 | WCAG 2.2 SC 1.4.3 | 2026-08-02 | WCAG 2.3/3.0 |
| 3:1 non-text contrast | 2 | SC 1.4.11 | 2026-08-02 | WCAG 2.3/3.0 |
| 200% resize | 2 | SC 1.4.4 | 2026-08-02 | WCAG 2.3/3.0 |
| 320 CSS px reflow | 2 | SC 1.4.10 | 2026-08-02 | WCAG 2.3/3.0 |
| Text spacing 1.5 / 2 / 0.12 / 0.16 | 2 | SC 1.4.12 | 2026-08-02 | WCAG 2.3/3.0 |
| ≤ 80 characters per line | 2 | SC 1.4.8 (AAA) | 2026-08-02 | WCAG 2.3/3.0 |
| 24×24 px target (AA) | 2 | SC 2.5.8 | 2026-08-02 | WCAG 2.3/3.0 |
| 44×44 px target (AAA) | 2 | SC 2.5.5 | 2026-08-02 | WCAG 2.3/3.0 |
| Focus not entirely obscured | 2 | SC 2.4.11 | 2026-08-02 | WCAG 2.3/3.0 |
| 2 px perimeter / 3:1 focus indicator | 2 | SC 2.4.13 (AAA) | 2026-08-02 | WCAG 2.3/3.0 |
| Colour not the only means | 2 | SC 1.4.1 (A) | 2026-08-02 | WCAG 2.3/3.0 |
| Apple: 200% enlargement target, 17 pt default / 11 pt minimum body | 4 | Apple HIG Accessibility | 2026-08-02 | Apple revising the HIG |
| Apple names both WCAG and APCA; Accessibility Inspector uses WCAG AA | 4 | Apple HIG Accessibility | 2026-08-02 | Apple switching tools |

## The APCA claim, in detail

**Claim:** APCA is not a standard, was removed from the WCAG 3 draft in July 2023, and WCAG 3's
contrast algorithm is undetermined.

- **Source:** Roselli, A., *WCAG3 Contrast as of April 2026*,
  <https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html>. Verified 2026-08-02.
- Quoted from the WCAG 3 draft via that post: "The contrast algorithm used in WCAG 3 is yet to be
  determined."
- Removal mechanism: exploratory content without Working Group support is dropped after 6 months;
  APCA was flagged in early 2023 and removed from the July 2023 Working Draft. The removal note
  described the draft's APCA versions as "very obsolete".
- Timeline: WCAG 3 "perhaps 2030 at the soonest".
- **Tier:** 3 (expert secondary) reporting on a tier-2 document. The underlying W3C draft is the
  primary; re-read it directly if this becomes load-bearing.
- **Invalidated by:** the Working Group adopting a contrast algorithm in a future draft. Check the
  WCAG 3 Working Draft directly before repeating this.

## Colour vision deficiency prevalence

**Claim:** red–green deficiency affects ~8% of males and ~0.5% of females.

- Commonly attributed to Birch, J. (2012), *Worldwide prevalence of red-green color deficiency*,
  JOSA A. **Not fetched directly** — recorded from search corroboration on 2026-08-02.
- **Important caveat found while sourcing:** the 8% figure is a **Northern European** population
  number. Pooled global estimates are nearer **4.5% male / 0.4% female**. Both circulate as "the"
  statistic; state the population.
- **Tier:** 1 with a sampling caveat.
- **Status: corroborated, not primary.** Re-verify against Birch (2012) before quoting the exact
  figure in a deliverable.

## Semantic markup, SEO, and AI extraction

Claims made in `./semantic-structure.md` about what semantic HTML does *not* buy you.

| Claim | Tier | Source | Verified | Status |
| --- | --- | --- | --- | --- |
| Semantic HTML is not a Google ranking factor; fixing heading hierarchy will not improve rankings | 3 | John Mueller, quoted consistently across SEO trade press | 2026-08-02 | **Corroborated, not primary.** Not fetched from Google Search Central this pass |
| Readability gives `<article>`/`<main>` no tag-level score; `<div>` +5; class/id weight ±25; link density scales the score; `<aside>`/`<footer>` conditionally removed | 1 (for its own behaviour) | `Readability.js`, <https://github.com/mozilla/readability> | 2026-08-02 | Read from the algorithm itself. Actively developed — re-read before relying on a constant |
| trafilatura benchmark: 0.914 precision / 0.904 recall / 0.909 F1 on 750 docs (2022-05-18) | 3 | <https://trafilatura.readthedocs.io/en/latest/evaluation.html> | 2026-08-02 | Vendor's own benchmark; treat the ordering as more reliable than the absolute numbers |

Full working notes, including what these findings do and do not license, live in
`ref-sp-web-seo-ai` (its `references/extraction.md`).

## Known gaps

- Overlay-product enforcement history is stated qualitatively; no specific case is cited here. Do not
  attribute a specific lawsuit or fine without sourcing it first.
- Screen-reader market share figures are deliberately absent — the WebAIM survey is self-selecting
  and is routinely over-read.
