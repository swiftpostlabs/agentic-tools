---
name: ref-sp-web-social-media
description: "Organic discovery on TikTok, YouTube, Instagram, LinkedIn, and X, separating documented and researched facts from folklore: in-app search, outbound links, audience fit, measurement. Use when asked whether to use social platforms for reach, or judging a social-strategy claim."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "web"
  shareable-skills.tags: "verification"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-web-marketing, ref-sp-web-seo, ref-sp-web-seo-ai"
---

# Social and Video Platforms

Social and video platforms as *organic* discovery surfaces, with each claim labelled by evidence:
much prevailing "social strategy" is unvalidated folklore. It is the counterpart of `ref-sp-web-seo`
for platforms Google doesn't own. Attribution and "which channel converts" (Direct, dark social,
self-reported attribution) are `ref-sp-web-marketing`; AI answers are `ref-sp-web-seo-ai`; the
site's own SEO is `ref-sp-web-seo`.

## Verify before you assert — this rots as fast as SEO

**Content below was verified 2026-07-13.** Platform algorithms, tools, and public statements change
constantly, and almost none of it is versioned the way Google's docs are. Every dated claim has a row
in `./references/sources.md` with its source, its tier, and what would invalidate it. Re-fetch the
platform's own newsroom/help pages before asserting a specific — and read the content, not the status
code (these pages are client-rendered; a `curl` may return an empty shell, so use a real browser via
`ref-sp-dev-playwright-cli`).

## The honest position, stated first

Three things are true at once, and most advice collapses them:

1. **Platform search is real, and at least one platform documents it.** TikTok states plainly that
   "search powers discovery on TikTok," and ships **Creator Search Insights** — a first-party tool
   showing which topics people search and which are "content gaps" (searched often, few videos). That
   is tier-1 evidence that in-app search matters and a demand-side tool exists. Treat it as the
   strongest fact in this skill.
2. **The headline behaviour stat is real but far narrower than quoted.** The famous "40% of young
   people use TikTok/Instagram instead of Google" traces to a Google SVP describing US 18–24-year-olds
   *"looking for a place for lunch"* — "something like almost 40%." It is a real first-party
   statement about *local/dining discovery in one age band in one country*. "Gen Z has abandoned
   Google" is a documented misrepresentation of it. Quote the real version.
3. **Almost every tactic layered on top is folklore.** Precise reach-penalty percentages, "semantic
   chunking" of video for LLMs, "transcribe everything," "creator ads always beat display" — these are
   agency assertions, often from vendors selling the service. Apply the claim-tiering rule from
   `ref-sp-web-seo`: documented → independently researched → inferred → vendor
   assertion. Say which tier you are in, every time.

So the deliverable is: **name the audience and intent, check whether platform presence is actually
warranted for them, do the small documented things, and refuse to ship the folklore.**

## Is this audience actually on-platform? (do not assume)

The single most expensive mistake is investing in a platform because a statistic said a cohort uses
it, without checking that *this brand's* audience and intent match. Discipline:

- **Anchor to real cohort data, and note its bounds.** The Swedish Internet Foundation's 2025 survey
  (real population survey) found TikTok reaches 78% of high-school students and YouTube dominates
  every age group — strong for that country and cohort, not a global constant. Ask for the equivalent
  for the actual target market rather than importing a headline.
- **Match the intent, not just the demographic.** The 40% stat is about *finding lunch*. Platform
  discovery is strong for local, product, food, how-to, and entertainment intents; weak for many B2B,
  high-consideration, or reference queries. A cohort being "on TikTok" does not mean they search TikTok
  for *your* thing.
- **When the data does not exist, say so.** "We do not know whether this audience uses this platform
  for this intent" is a finding. The fix is a small test, not a strategy deck.

## In-app search and discovery

Where a platform documents its own discovery, use that rather than a blog's reverse-engineering.

- **TikTok** documents search-driven discovery and provides **Creator Search Insights** (searched
  topics, content-gap topics, a search-value signal that feeds Creator Rewards) and brand **Search
  Hubs**. This is first-party demand data — the closest thing to keyword research the platform offers.
- **YouTube** is both the second-largest search destination and a video library; its own creator
  documentation is the source of truth for titles, descriptions, and chapters. Verify current
  guidance rather than reciting it.
- **Recommendation feeds are not search.** "For You" ranking is opaque and undocumented; anyone
  claiming to know its weights is selling a hypothesis. Optimise for the documented search surface,
  treat the feed as unpredictable distribution.

## Outbound links and "zero-click content"

The claim: platforms suppress posts carrying external links, so publish full value natively instead of
driving a click. Handle it with calibrated confidence, because the evidence is genuinely mixed.

- **The effect is plausible and partly evidenced, but the magnitude is disputed and no platform
  confirms it.** The largest independent LinkedIn analysis (van der Blom, ~1.3M posts) reports a body
  link reduces median reach ~18–19%; a separate large analysis (Saywhat, ~400k posts) found
  link-containing posts performed *better*, crediting content quality. Two big independent studies,
  opposite conclusions. No platform documents a link penalty.
- **So: design as if native value matters, without quoting a number as fact.** Lead with standalone
  value in the post; put the link where it costs least (bio, comment, second step) *if* the platform
  suggests it — but present any specific percentage as "reported by X," tier-2 at best, not a law.
- **"Zero-click" is a reach tactic, not a measurement excuse.** If you keep users on-platform, you
  also give up the referrer — which lands the visit in Direct. That is a measurement problem owned by
  `ref-sp-web-marketing`; hand the attribution half there.

## Measuring it: two walled gardens

Social measurement fails in two independent ways, and conflating them produces nonsense.

1. **Native platform analytics are non-comparable and self-serving.** Each platform defines a "view,"
   "reach," and "engagement" differently, does not let you export a clean cross-platform picture, and
   has an interest in the numbers looking good. Never rank platforms against each other on their own
   metrics.
2. **Off-platform, attribution is broken.** A tap from a bio link arrives without a referrer and lands
   in Direct. This is the dark-social problem — measured, and owned by
   `ref-sp-web-marketing` (self-reported attribution is the recovery). Do not
   restate it; route there.

**The one first-party cross-surface measurement that exists** is Google's Search Console **platform
properties**: connect an Instagram, TikTok, X, or YouTube account and see clicks, impressions, CTR,
and average position for how *that content performs in Google Search, Discover, and News*. Its limit
is the whole point — it measures the **Google surface only**, not native platform engagement (a
TikTok video's TikTok views are invisible to it). Useful, and narrow. See
`ref-sp-web-seo` for how that Google surface behaves.

## Defaults

- **Prefer a small test to a strategy deck.** One platform, one intent, a fixed window, self-reported
  attribution. Learn whether the audience is there before committing budget.
- **Do the documented things first:** use the platform's own search-insight tool, publish native
  value, verify current creator guidance. Skip the reverse-engineered feed hacks.

## Gotchas

- **Do not import a foreign statistic as a local fact.** Swedish survey numbers, US survey numbers,
  and a Google exec's dining anecdote are not interchangeable, and none is global.
- **Do not quote an algorithm-penalty percentage as settled.** The best independent studies
  contradict each other and the platforms stay silent.
- **Do not treat "For You" reach as controllable.** It is undocumented; optimising for it is
  optimising against a black box.
- **Do not confuse native reach with business outcome.** A million views that you cannot attribute and
  that drove no action is a vanity metric — the sample-size and signal-vs-noise discipline in
  `ref-sp-web-marketing` applies here too.

## Scope

**Out of scope — paid social advertising.** Ad formats, bidding, Spark Ads, and creator-ad buying are
paid media, a separate discipline with its own measurement (the platforms provide conversion tracking
for spend they are paid for). This skill is about *organic* discovery and reach. Say so if a user
conflates the two; "boost it" is not the same decision as "should we be here."

## References

- `./references/sources.md` — provenance by section, with each claim's evidence tier and what would
  invalidate it. Read it before asserting any dated specific.
- `ref-sp-web-marketing` — attribution, dark social, and whether a difference
  is signal or noise. It owns measurement; this skill routes there rather than restating it.
- `ref-sp-web-seo` — how content performs on the Google surface, and the
  claim-tiering rule this skill applies.
- `ref-sp-web-seo-ai` — visibility in AI answers, the neighbouring
  "new discovery surface" concern.
