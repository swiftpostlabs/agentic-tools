# Sources and provenance

Every dated or numeric claim in this skill, mapped to its primary, the date it was verified, and what
would invalidate it.

Content verified **2026-08-02**.

## Claim tiers

| Tier | What it is | Treatment |
| --- | --- | --- |
| 1 | Perceptual / cognitive research | Durable. Cite the primary. Respect its scope. |
| 2 | Normative standard | Binding, versioned. Quote the version. |
| 3 | Practitioner research | Real data, known bounds, often old. State year and n. |
| 4 | Design-system convention | Internally consistent, not empirical. Label it. |
| 5 | Folklore | Name and refute — see `folklore.md`. |

**Vendor design systems are interested parties.** Material 3 and Apple's HIG are tier 4: authoritative
about their own platform, not evidence about human perception.

## Primary documents

| Document | URL | Tier | Verified |
| --- | --- | --- | --- |
| Wagemans et al. 2012, *A century of Gestalt psychology I*, Psych. Bull. 138(6) 1172–1217 | <https://pmc.ncbi.nlm.nih.gov/articles/PMC3482144/> | 1 | 2026-08-02 |
| Dyson & Beier 2016, *Investigating typographic differentiation*, Inf. Design J. 22(1) 3–18 | <https://benjamins.com/catalog/idj.22.1.02dys> · open copy <https://typ.dk/wp-content/uploads/2023/07/2016IDJ-DysonBeier.pdf> | 1 | 2026-08-02 |
| NN/g, *F-Shaped Pattern of Reading on the Web* (study 2006, revisit 2017) | <https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/> | 3 | 2026-08-02 |
| Nielsen 1997, *How Users Read on the Web* | <https://www.nngroup.com/articles/how-users-read-on-the-web/> | 3 | 2026-08-02 |
| NN/g, *10 Usability Heuristics* (1990, rev. 1994, text updated 2020) | <https://www.nngroup.com/articles/ten-usability-heuristics/> | 3 | 2026-08-02 |
| Hoober 2013, *How Do Users Really Hold Mobile Devices?* | <https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php> | 3 | 2026-08-02 |
| W3C CSS Color Module Level 4 (CR Draft, 28 July 2026) | <https://www.w3.org/TR/css-color-4/> | 2 | 2026-08-02 |
| WCAG 2.2 | <https://www.w3.org/TR/WCAG22/> | 2 | 2026-08-02 |
| W3C WAI supplemental guidance (**non-normative**) | <https://www.w3.org/WAI/WCAG2/supplemental/> | 2 (non-normative) | 2026-08-02 |
| Material 3 — window size classes | <https://m3.material.io/foundations/layout/applying-layout/window-size-classes> | 4 | 2026-08-02 |
| Apple HIG — Layout | <https://developer.apple.com/design/human-interface-guidelines/layout> | 4 | 2026-08-02 |
| Apple HIG — Accessibility | <https://developer.apple.com/design/human-interface-guidelines/accessibility> | 4 | 2026-08-02 |

**Fetching note:** `m3.material.io` and `developer.apple.com/design/*` are client-rendered shells —
a plain fetch returns HTTP 200 with no useful body. Read them with `playwright-cli`
(`goto`, then `eval` over `document.querySelectorAll('table')` or `('p,li,h2,h3')`). See
`ref-sp-dev-playwright-cli`.

## Claim table

| Claim | Tier | Source | Invalidated by |
| --- | --- | --- | --- |
| Grouping principles and their attribution (proximity… common region, Palmer 1992; element/uniform connectedness, Palmer & Rock 1994) | 1 | Wagemans 2012 | A later review reattributing or demoting a principle |
| Grouping principles are principles, not laws; criticised for imprecision | 1 | Wagemans 2012 | — |
| Prägnanz wording | 1 | Wagemans 2012 | — |
| Bold may impair letter identification when alternated; italic does not disrupt recognition | 1 | Dyson & Beier 2016 | Replication failure |
| Bold words recognised faster than roman, esp. uncommon words | 1 | Macaya & Perea 2014 (via Beier's research overview) | — |
| All-caps produces more re-fixations | 1 | Perea, Rosa & Marcet 2017 (via same overview) | — |
| All-italic text slows reading | 1 | Tinker 1963/1965 (via same overview) | — |
| F-pattern conditions, and NN/g calling it bad for users | 3 | NN/g F-shaped pattern | NN/g revising the article |
| Scanning patterns: layer-cake, spotted, marking, bypassing, commitment | 3 | NN/g F-shaped pattern | — |
| 79% scan / 16% word-by-word | 3 | Nielsen 1997 — **no sample size stated** | — |
| Rewrite study: 58% / 47% / 27% / 124% | 3 | Nielsen 1997 — **no sample size stated**; 1997 lab study | — |
| 10 usability heuristics, dates, "rules of thumb" framing | 3 | NN/g | NN/g revising |
| Hoober grips: 49 / 36 / 15%, n=1,333 (780 touching), 2013 | 3 | Hoober 2013 | A modern replication |
| `oklch()` / `oklab()` components; CSS Color 4 is a CR Draft dated 2026-07-28 | 2 | CSS Color 4 | Advancing to Recommendation, or a spec change |
| M3 window size classes and pane counts | 4 | Material 3 | Material revising |
| Apple: 17 pt default / 11 pt minimum body; 200% enlargement; "thicker weights are easier to read at small sizes" | 4 | Apple HIG Accessibility | Apple revising |
| Apple layout quotes (grouping via negative space; reading order; crowding) | 4 | Apple HIG Layout | Apple revising |
| WCAG criteria referenced from this skill | 2 | WCAG 2.2 — values **owned by** `ref-sp-ux-accessibility` (its `references/thresholds.md`); this skill cites criterion numbers only | WCAG 2.3/3.0 |

## Corroborated but NOT primary-verified

These are used in the skill and were **not** confirmed against the primary document during this
pass. Re-verify before they become load-bearing in a deliverable.

| Claim | Status | Why not verified |
| --- | --- | --- |
| Critical print size ≈ 0.2° x-height; ~9 pt Times at 40 cm; ~10 pt screen threshold (Legge & Bigelow 2011, *J. Vision* 11(5):8) | Via Sofie Beier's research overview at <https://legible-typography.com/en/5-overview-of-research-type> | jov.arvojournals.org returned **HTTP 403** |
| Line length: ~100 CPL fastest, 45–72 CPL preferred, ~55 CPL balanced (Dyson 2004, *Behaviour & Information Technology*) | Via secondary summaries | PDF mirror returned raw binary; text extraction failed |
| Faulkner 2003 percentages: pool of 60; 5 users 55–99%; 10 users min 80%; 20 users min 95% (*Behav. Res. Methods Instrum. Comput.* 35(3) 379–383) | Via search summary + Human Factors International corroboration | Springer 303-redirects to an identity provider |
| OKLCH holds perceived lightness constant across hues | **Design intent of Oklab, not a quote from CSS Color 4** — the fetched excerpt did not state it | Not in the retrieved sections |
| Red–green CVD ≈ 8% male / 0.5% female (Birch 2012, JOSA A) | Via search corroboration. **The 8% figure is Northern European; pooled global ≈ 4.5% / 0.4%** | Not fetched directly |
| Miller 1956 / Cowan 2001 / Fitts 1954 / Hick 1952 / Hyman 1953 / Landauer & Nachbar 1985 / Kurosu & Kashimura 1995 / Tractinsky et al. 2000 | Cited from established secondary knowledge; scope limits stated are the consensus reading | Not fetched this pass |
| ISO 9241-11:2018 and ISO 24495-1:2023 | Cited by title and scope only | Paywalled standards |

## Deliberate omissions

- **Material 3 type scale token values.** The page renders them in a token viewer rather than a
  table; only unit conversions were recoverable (Android sp ↔ Web rem at 0.0625; tracking em =
  tracking px / font size sp). Not load-bearing — M3 itself says "No single product will use all the
  styles."
- **Apple's 44 × 44 pt tap target.** Not captured verbatim from the pages fetched, so it is not
  cited as an Apple figure anywhere in this skill. The citable version is WCAG SC 2.5.5 (AAA), whose
  value is owned by `ref-sp-ux-accessibility` (its `references/thresholds.md`).
- **The grouping-conflict ordering** in `foundations.md` (common region > proximity > similarity) is
  labelled tier 4 in place: a working heuristic, not a finding from Wagemans.
