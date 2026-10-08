# Design folklore, and what to say instead

Load when someone cites a rule that sounds authoritative. Each entry: the claim, what is actually
true, and the honest replacement.

The pattern to notice: most of these are a real finding that has been **stripped of its scope**, or a
preference that has been **promoted to a law**.

## "Miller's law: 7 ± 2 items in a menu"

**Claim:** navigation, menus, or lists should hold 7 ± 2 items.

**Reality:** Miller (1956) measured the span of immediate memory for *unrelated items*. It is not
about menus, navigation, or anything visible on screen while you use it — nothing needs to be held in
memory when it is displayed. Miller proposed no interface rule. Cowan (2001) puts working memory
nearer **4 ± 1** anyway.

**Say instead:** long lists cost scanning time and decision effort. Group them, order them, or make
them searchable. Argue from scanning cost, not from Miller.

## "Hick's law: fewer options are always faster"

**Claim:** cutting choices always speeds decisions.

**Reality:** Hick–Hyman describes choice-reaction time among **known, ordered** alternatives.
Landauer & Nachbar (1985) and later work show it does not model visual search through unfamiliar
options — which is exactly the case designers invoke it for. A broad, well-labelled menu often beats a
deep narrow one, because finding is search, not choice.

**Say instead:** structure and labelling beat raw count. Fewer *categories* can be slower if it
forces deeper nesting.

## "Design for the F-pattern"

**Claim:** put important content along an F-shaped path.

**Reality:** NN/g calls the F-pattern a symptom of unformatted text and low commitment, and says
plainly that it "is bad for users and businesses". It is what readers fall back on when your
structure gives them nothing.

**Say instead:** design for the **layer-cake** pattern — real headings that let the eye move between
them. See `content-readability.md`.

## "The thumb zone"

**Claim:** most phone use is one-handed thumb use, so put everything in the bottom arc.

**Reality:** the source (Hoober, 2013, n = 1,333) found **49%** one-handed, 36% cradled, 15%
two-handed — the largest single category, not a majority. On 2013-sized phones.

**Say instead:** bottom-reachable primary actions are a cheap, sensible default. Cite the year and
the n, and do not distort a layout for it.

## "50–75 characters is the optimal line length"

**Claim:** stated as a reading-speed optimum.

**Reality:** it is a **preference** optimum. Dyson's work finds reading is fastest at roughly **100
characters per line**; readers prefer 45–72.

**Say instead:** target 45–75 characters because readers prefer it and abandonment is the real cost —
not because it is faster, because it is not. The one place a *normative* cap on measure exists is
WCAG SC 1.4.8, at AAA — see `./typography.md`.

## "60-30-10 colour rule"

**Claim:** 60% dominant, 30% secondary, 10% accent.

**Reality:** an interior-decorating heuristic with no perceptual research behind it.

**Say instead:** most of the surface should be neutral, and the accent should be rare enough to mean
something. That is the useful part, and it does not need a fake ratio.

## "Blue means trust, red means urgency"

**Claim:** colour psychology drives behaviour predictably.

**Reality:** culturally contingent and not replicated at anything like the strength design writing
claims. The reliable effects are *learned conventions* within a context (red for errors in software,
green for success), not innate responses.

**Say instead:** conventions in the user's context matter; universal colour meanings do not exist.
And never carry meaning in hue alone (WCAG 1.4.1, Level A).

## "APCA is the new WCAG contrast algorithm"

**Claim:** APCA supersedes WCAG 2 contrast.

**Reality:** APCA was exploratory content, flagged for removal in early 2023 and **pulled from the
July 2023 WCAG 3 working draft**. The current draft says the contrast algorithm is "yet to be
determined". WCAG 3 is not expected before ~2030.

**Say instead:** conform to WCAG 2.2. APCA is a reasonable supplementary check, not a standard. Full
treatment in `ref-sp-ux-accessibility`.

## "The golden ratio in typography and layout"

**Claim:** 1.618 produces harmonious type scales and proportions.

**Reality:** no perceptual evidence supports a special status for φ in reading or interface
perception. The aesthetic claims trace to art-historical narratives, several of them retrofitted.

**Say instead:** use *a* consistent ratio. 1.2, 1.25, and 1.333 are more practical because they
produce usable step sizes. The value is consistency, not the constant.

## "Users don't scroll" / "above the fold"

**Claim:** content below the fold is not seen.

**Reality:** a mid-1990s finding from an era of unfamiliar scrollbars. People scroll fluently now.
What is true: content at the top gets disproportionate attention, and people decide quickly whether
to continue.

**Say instead:** earn the scroll. Do not cram everything into the first viewport — that produces the
crowding that makes people leave.

## "3 clicks to anything"

**Claim:** any content should be reachable in three clicks.

**Reality:** no evidence supports a threshold at three. The research that exists finds users do not
abandon at a click count; they abandon when they stop believing they are getting closer.

**Say instead:** every step should visibly reduce uncertainty. A confident fourth click beats a
confusing second.

## "White space equals elegance"

**Claim:** more space is always better design.

**Reality:** space is a grouping mechanism, and density is a product decision. A trading terminal or
IDE at marketing-page density is a usability failure.

**Say instead:** space should be *unequal and meaningful*. The information is in the ratios between
gaps, not in the total amount. See `spacing-and-layout.md`.

## "Accessibility overlays make a site compliant"

**Claim:** a script tag delivers conformance.

**Reality:** it does not, it is widely rejected by the accessibility community, and it has attracted
enforcement action.

**Say instead:** fix the markup. See `ref-sp-ux-accessibility`.

## How to handle a claim not on this list

1. Ask what tier it is: research, standard, convention, or nobody knows.
2. Find the primary. Aggregator sites and agency blogs are **leads, not sources** — they routinely
   drop the scope conditions that make a finding true.
3. Check whether the original study's conditions resemble your situation. Most of the entries above
   fail exactly here.
4. If you cannot source it, you may still follow it — as a convention, stated as a convention.
