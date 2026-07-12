# Sources and Verification

Provenance for `../SKILL.md`, organized by section. This is a **folklore-heavy field**, so every row
carries an explicit evidence tier: **documented** (the platform's own statement), **researched** (an
independent study), **inferred** (behaviour deduced from outside), or **vendor** (an interested party's
assertion). Cite the tier, not just the claim.

**Last full verification: 2026-07-13.**

## How to re-verify

1. **Re-fetch the platform's own newsroom/help pages** — they are the only tier-1 sources here, and
   they change without notice. There is no changelog; check them directly.
2. **Read the content, not the status code.** These pages are client-rendered; a `curl` can return an
   empty shell with HTTP 200. Use a real browser (`.agents/skills/ref-sp-dev-playwright-cli/SKILL.md`)
   when a fetch comes back empty.
3. **Treat every non-platform number as dated and interested.** Reach-penalty percentages and
   "algorithm 2026" figures come from agencies selling social services; corroborate or downgrade.
4. Update the claim, its row, and the last-verified date, and tell the user what moved.

## Section: The honest position / In-app search

| Claim in SKILL.md | Tier | Source | Verified | Invalidated if |
| --- | --- | --- | --- | --- |
| "Search powers discovery on TikTok"; Creator Search Insights shows searched topics and "content gap" topics; a search-value signal feeds Creator Rewards; brand Search Hubs exist | **documented** (first-party) | [TikTok Newsroom — Creator Search Insights](https://newsroom.tiktok.com/en-us/creator-search-insights); [TikTok Support](https://support.tiktok.com/en/using-tiktok/growing-your-audience/creator-search-insights) | 2026-07-13 | TikTok removes the tool or the search-value signal |
| The "~40% of young people use TikTok/Instagram instead of Google" figure is really a Google SVP (Prabhakar Raghavan) saying "something like almost 40% of young people, when they're looking for a place for lunch"; scope is US 18–24, dining | **documented but narrow** | [Econsultancy — "Not exactly"](https://econsultancy.com/gen-z-google-tiktok-search/); [TechCrunch (2022)](https://techcrunch.com/2022/07/12/google-exec-suggests-instagram-and-tiktok-are-eating-into-googles-core-products-search-and-maps/) | 2026-07-13 | A newer, wider-scope first-party figure is published (this one is from 2022) |

## Section: Is this audience actually on-platform?

| Claim in SKILL.md | Tier | Source | Verified | Notes |
| --- | --- | --- | --- | --- |
| TikTok reaches 78% of high-school students; YouTube dominates every age group; ~1 in 5 Swedes ask an AI tool instead of Google | **researched** (population survey) | [Svenskarna och internet 2025 — English summary](https://svenskarnaochinternet.se/rapporter/svenskarna-och-internet-2025/english/) | 2026-07-13 | **Sweden only.** Real survey data, not a global constant — the point of the section is to demand the local equivalent, not to import this. |

## Section: Outbound links and zero-click

| Claim in SKILL.md | Tier | Source | Verified | Notes |
| --- | --- | --- | --- | --- |
| A body link reduces LinkedIn median reach ~18–19% | **researched, contested** | van der Blom "State of LinkedIn 2026", ~1.3M posts / 50k creators (reported via multiple secondary write-ups; primary is a paid report) | 2026-07-13 | **Directly contradicted** by the next row. Do not quote the number as fact. |
| Posts with external links performed *better*, attributed to content quality | **researched, contested** | Saywhat Q1 2026 analysis, ~400k posts (secondary write-ups) | 2026-07-13 | Two large independent studies, opposite conclusions. Net: effect plausible, magnitude unknown. |
| No platform officially confirms a link penalty | **documented (absence)** | Instagram/LinkedIn have never published a link-suppression policy | 2026-07-13 | An official statement either way would resolve this |

**Honesty note.** The link-penalty numbers reach this file only through secondary marketing write-ups
of primary reports that are paywalled or gated. That is exactly why they are marked contested and must
be attributed ("van der Blom reports…"), never stated as a platform fact. The *durable* claim — native
value matters, attribution is lost either way — does not depend on the disputed figure.

## Section: Measuring it

| Claim in SKILL.md | Tier | Source | Verified | Notes |
| --- | --- | --- | --- | --- |
| Search Console **platform properties** connect Instagram/TikTok/X/YouTube accounts and report clicks, impressions, CTR, position for content **in Google Search/Discover/News only** — not native platform engagement; gradual rollout; ownership periodically re-checked | **documented** (first-party) | [About platform properties in Search Console](https://support.google.com/webmasters/answer/17148418); [Search Central blog, July 2026](https://developers.google.com/search/blog/2026/07/search-console-social-video-platforms) | 2026-07-13 | Metrics, surface coverage, or availability change. The blog post is a JS shell — read the support doc, or the blog in a browser. |
| Dark social breaks attribution; a bio-link tap lands in Direct; self-reported attribution is the recovery | **researched** | Owned by `.agents/skills/ref-sp-web-marketing/references/sources.md` (SparkToro controlled experiment). **Do not duplicate** — route there. | 2026-07-13 | — |

## What does not rot

The method, which needs no platform to confirm it and survives every algorithm change:

- Name the audience *and the intent*, then check presence is warranted — do not invest on a headline
  statistic.
- Separate the two walled gardens: non-comparable native metrics, and broken off-platform attribution.
- Tier every claim; refuse to ship folklore as a recommendation.
- Prefer a small, attributable test to a strategy deck.

## Deliberately not sourced / out of scope

- **Paid social advertising** (Spark Ads, bidding, creator-ad buys) — a separate discipline; excluded
  by the skill's Scope section.
- **"For You" feed ranking weights** — undocumented by every platform; any specific claim is a
  hypothesis, and this skill says so rather than sourcing folklore.
- **The `.agents/playground/` brief that seeded this skill** ("The Brave New World of Digital
  Relevance") is AI-generated and self-declares as an overview. It was used only as a lead; every
  claim above was re-sourced from a primary. Its GEO-for-video tactics did not survive tiering.
