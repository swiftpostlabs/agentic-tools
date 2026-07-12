# Sources and Verification

Every dated claim in `../SKILL.md` traces to a row below. Use this file two ways: to **check a single
claim's provenance** before asserting it, and to **re-verify the skill** when it may have gone stale.

**Last full verification: 2026-07-12.**

## How to re-verify (cheapest path first)

Do not re-fetch everything. Start with the change feed; it tells you what, if anything, moved.

1. **Check the documentation changelog.** Google publishes a machine-readable feed of changes to its
   Search docs:

   ```sh
   curl -s https://developers.google.com/search/updates/search_docs_updates.rss
   ```

   Scan it for the documents named in the provenance table below. If none of them appear since the
   last-verified date, the skill's documented claims are almost certainly still good, and you are
   done. This is a single cheap request and it is the whole point of keeping the table.

2. **Check for ranking updates**, which invalidate test windows rather than claims:
   <https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history>

3. **Fetch only the documents the feed flagged.** For each, compare the live text against the "Claim"
   column. The "Invalidated if" column tells you what you are looking for.

4. **When a claim has changed**, fix it in `../SKILL.md`, update its row here, and bump the
   last-verified date at the top of both files. State in your report to the user *which* claim moved —
   a silently corrected skill teaches nobody.

5. **When nothing has changed**, still bump the last-verified date. A fresh date on an unchanged claim
   is information.

## Provenance

| Claim in SKILL.md | Source | Verified | Invalidated if |
| --- | --- | --- | --- |
| Meta keywords tag is unused; no word-count target; heading order does not matter for search; domain keywords barely matter; E-E-A-T is not a ranking factor | [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) | 2026-07-12 | Google restates any of these as a ranking factor, or removes the explicit denial |
| Meeting the requirements guarantees nothing; the three parts (technical requirements, spam policies, key best practices) | [Search Essentials](https://developers.google.com/search/docs/essentials) | 2026-07-12 | The "no guarantee" statement is removed, or the structure changes |
| Google ignores `<priority>` and `<changefreq>`; uses `<lastmod>` only if consistently and verifiably accurate; 50MB / 50,000 URL limits | [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) | 2026-07-12 | Google begins honouring the ignored tags, or the limits change |
| Crawl → render → index with a deferred render queue; blocked resources prevent rendering; a `noindex` in initial HTML can skip rendering; SPA soft 404s; fragment URLs unreliable | [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) | 2026-07-12 | The rendering pipeline changes, or rendering stops being queued/deferred |
| Dynamic rendering is "a workaround and not a recommended solution"; prefer SSR, static rendering, or hydration | [Dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering) | 2026-07-12 | Google re-recommends dynamic rendering, or removes the page |
| LCP ≤ 2500ms, INP ≤ 200ms, CLS ≤ 0.1, assessed at the 75th percentile | [CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds) | 2026-07-12 | A threshold moves, the percentile changes, or a metric is replaced (INP replaced FID; expect further churn) |
| No single page-experience signal; relevance wins even when page experience is sub-par; good CWV does not guarantee ranking — a tiebreaker, not a penalty | [Page experience](https://developers.google.com/search/docs/appearance/page-experience) | 2026-07-12 | Google elevates page experience to a standalone signal, or frames it as a penalty |
| An AI Overview occupies one position with all its links at that position; an impression requires the link be scrolled or expanded into view | [Impressions, position, and clicks](https://support.google.com/webmasters/answer/7042828) | 2026-07-12 | The counting rules for AI surfaces change |
| Page Quality framework, YMYL, E-E-A-T with Trust at the centre, the Lowest-quality screen, Needs Met; ratings never move an individual page | [Search Quality Rater Guidelines (PDF)](https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf) — September 11, 2025 edition | 2026-07-12 | A new edition is published (check the date on page 1 and the change log in Appendix 2) |
| Core and spam update history, used to rule out the algorithm-update confounder | [Search Status Dashboard](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history) | 2026-07-12 | — (a live feed; consult it per-test, do not cache it) |
| The May 2024 leak: ~2,500 internal API docs, authenticity confirmed, Google cautioned they may be out-of-context, outdated, or incomplete | Historical event | n/a | Does not rot — it is a fixed past event. The *interpretation* rule in SKILL.md is what matters, and that is method, not a dated fact. |

## Standing entry points

Not tied to a single claim; check these when the ground may have shifted generally.

- **Documentation changelog (RSS)** — the cheapest signal that anything moved:
  <https://developers.google.com/search/updates>
- **Search Central blog** — announcements land here before the docs catch up:
  <https://developers.google.com/search/blog>
- **AI surfaces** rotate fastest and have their own provenance file:
  `.agents/skills/ref-sp-web-seo-ai/references/sources.md`
