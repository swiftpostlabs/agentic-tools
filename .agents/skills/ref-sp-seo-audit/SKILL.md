---
name: ref-sp-seo-audit
description: "Audit a website's SEO from what is actually observable — served and rendered HTML, robots.txt, sitemaps, canonicals, metadata, structured data, Core Web Vitals — separate that from the performance data only Search Console can answer, and design valid before/after tests for SEO changes. Use when: asked to check or improve a site's SEO, diagnose why pages are not indexed or not appearing in search, review titles, canonicals, or structured data, interpret a Lighthouse or Core Web Vitals report, judge whether an SEO change actually worked, or assess content quality against Google's rater framework."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "seo"
  shareable-skills.tags: "testing, browser"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-dev-playwright-cli"
---

# SEO Audit

## Purpose

Audit a site's SEO using evidence you can actually obtain, state plainly which questions cannot be
answered without the owner's Search Console data, and design SEO tests whose results mean something.

## When to use this skill

- Asked to "check the SEO" of a site, page, or app.
- A page is not indexed, not ranking, or disappeared from search results.
- Reviewing titles, meta descriptions, canonicals, `hreflang`, or structured data.
- Interpreting a Lighthouse run or Core Web Vitals numbers.
- Deciding whether an SEO change worked, or how to measure one before shipping it.
- Reading a traffic or conversion report where "Direct" is a large channel.
- Weighing an SEO claim sourced from a leak, a vendor, or a conference talk.
- Judging whether a page's *content* is good enough to rank (load `./references/content-quality.md`).

## First: separate what you can see from what you cannot

This is the most common failure. Say it to the user before you start.

**Observable by the agent, from the site itself:** server responses (status codes, redirects,
headers), the served HTML, the rendered DOM, `robots.txt`, sitemaps, canonicals, meta robots,
`hreflang`, structured data, lab performance, internal linking, and duplicate or thin content.

**Not observable — requires the owner's Search Console or analytics, so you must ask for it:**

| Question | Where the answer lives |
| --- | --- |
| Impressions, clicks, CTR, average position | Search Console → Performance report |
| Whether Google actually indexed a URL, and how it rendered it | Search Console → URL Inspection |
| Why URLs were excluded from the index | Search Console → Page Indexing report |
| Real-user Core Web Vitals | Search Console → Core Web Vitals (CrUX field data) |
| Structured data Google actually parsed | Search Console → Rich Result status reports |
| Whether the site has a manual penalty | Search Console → Manual Actions |
| Sessions, conversions, revenue | Analytics |
| Backlinks, competitor comparison | A third-party crawler/index |

Never present a technical audit as "your SEO performance." It diagnoses causes; it does not measure
outcomes. If the user asks "how is my SEO doing," the honest first answer is: *I can audit the site,
but the performance numbers live in your Search Console — export them or grant access.* Search
Console requires verified site ownership, so this is a request only the user can satisfy.

## The durable model

Ranking specifics churn; the pipeline does not. Every SEO problem is a failure at one of these
stages, and your first job is to identify **which stage** is broken before proposing fixes.

1. **Crawl** — can a bot fetch the URL? (robots.txt, status codes, redirects, server errors)
2. **Render** — does the content exist after JS runs? (client-only rendering, blocked assets)
3. **Index** — is the URL eligible and selected? (meta robots, canonicals, duplicates, thin content)
4. **Rank** — does it deserve the query? (content quality, intent match, trust, links)
5. **Measure** — is the effect visible and attributable? (Search Console, lag, noise, confounders)

Work top-down. A page that cannot be crawled will never be fixed by rewriting its title tag.
Diagnose stage 1 before spending any effort on stage 4.

## Core Workflow

1. **Establish the target.** One page, a page type, or the whole site? Production or staging? Get the
   exact origin — answers differ between `www` and apex, `http` and `https`.
2. **Fetch as a bot.** Get the raw response and served HTML. This is what a non-rendering crawler sees.
3. **Fetch as a browser.** Render the page and compare the final DOM against the served HTML. The
   delta is your JS-dependency risk.
4. **Check crawl and index directives.** `robots.txt`, meta robots, `X-Robots-Tag`, canonical,
   sitemap presence and agreement.
5. **Check page semantics.** Unique descriptive title, meta description, descriptive URL, image
   `alt` text, internal links with meaningful anchor text, valid structured data.
6. **Check performance honestly.** Run a lab audit, then say explicitly that field data is what
   counts.
7. **Judge the content.** Technical correctness gets a page eligible; content decides whether it
   ranks. Load `./references/content-quality.md`.
8. **Report by stage,** ordered by impact: crawl/index blockers first, then content, then
   performance. State what you verified and what you assumed.
9. **If a change is proposed, design its test before shipping it** (see "Testing SEO changes").

## Commands

Assume `<url>` is the page and `<origin>` its scheme+host. None of these install anything into the
project.

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| `curl -sSIL -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' <url>` | Status chain and headers as a bot. | Reveals redirect chains, `X-Robots-Tag`, and bot-specific blocking. | First probe, always. | One `200` after at most one redirect; no `noindex` header. |
| `curl -sS -A '<googlebot-ua>' <url>` | The served HTML. | This is what a non-rendering crawler indexes. | Right after the header check. | Title and body copy present in source, not just an empty app shell. |
| `curl -sS <origin>/robots.txt` | Crawl directives and sitemap pointers. | One `Disallow: /` here overrides every other optimization on the site. | Before any page-level work. | Production is crawlable; a `Sitemap:` line is present. |
| Check `robots.txt` for AI crawler user-agents (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, and others). | Whether AI assistants may crawl the site. | Sites block these deliberately or by copy-pasted default; either way the owner should know, because it decides whether the site can be cited by assistants at all. | Whenever the user cares about visibility in AI answers. | The allow/block state is intentional and the user has confirmed it. |
| `curl -sS <origin>/sitemap.xml` | The declared canonical URL set. | Sitemap URLs must be indexable, canonical, and `200`; mismatches confuse selection. | When auditing a site rather than one page. | Sitemap URLs match the canonicals the pages declare. |
| Render the page and dump the DOM + console, via `.agents/skills/ref-sp-dev-playwright-cli/SKILL.md`. | The post-JS DOM and any JS errors. | Distinguishes "content missing from HTML" from "content missing entirely". | Whenever the served HTML looks like an empty shell. | Rendered DOM has the content; no errors that abort rendering. |
| `npx lighthouse <url> --only-categories=seo,performance --output=json --quiet` | A lab audit. | Cheap lint for obvious on-page misses plus a lab performance baseline. | After crawl/index checks, never before. | A list of concrete defects — hints, not a score to chase. |

## Core Web Vitals

Three metrics, assessed at the **75th percentile** of real page views. A page or origin is "good"
only when 75% of visits meet the threshold.

| Metric | Good | Needs improvement | Poor |
| --- | --- | --- | --- |
| Largest Contentful Paint (LCP) | ≤ 2500 ms | 2501–4000 ms | > 4000 ms |
| Interaction to Next Paint (INP) | ≤ 200 ms | 201–500 ms | > 500 ms |
| Cumulative Layout Shift (CLS) | ≤ 0.1 | 0.11–0.25 | > 0.25 |

A local Lighthouse run is **lab** data from one machine on one network. The assessment that matters
uses **field** data from real users (CrUX, surfaced in Search Console). A green lab score alongside a
failing field score is common, and the field score is the one that counts.

## AI answers, and what they do to your data

AI Overviews and AI Mode change how a page earns a visit, and — more importantly for an auditor —
they corrupt the metrics you would otherwise reason from. Know the mechanics before you interpret any
Search Console trend.

- **An AI Overview occupies one position, and every link inside it is assigned that same position.**
  So average position mixes AI-Overview citations and classic blue links into one number. A moved
  average may mean nothing about either.
- **An impression only counts if the link is scrolled or expanded into view.** A page cited inside a
  collapsed AI Overview can be shown to the user and register *neither* an impression nor a click.
- **A click still requires a click-through.** When the answer is on the results page, the user's need
  is met without a visit. Impressions holding steady while clicks fall is the signature of this, and
  it is not a ranking loss — do not "fix" a ranking problem that does not exist.
- **Search Console does not break AI-surface data out of the Web totals** in the standard Performance
  report, so you generally cannot isolate it. Verify current behavior in the docs rather than assuming
  — this area is changing fast.

**The auditor's rule:** before diagnosing a CTR or traffic drop as a ranking or quality failure,
check whether the query now returns an AI answer. If it does, you are looking at a changed SERP, not
a demoted page, and the fix is a different conversation.

**Do not chase speculative GEO tactics.** "Generative Engine Optimization" is a real emerging
concern, but the tactics are unstable and largely unvalidated, and practitioners with the best view
of it advise against optimizing hard for a target still in active development. What is defensible
today is what was already defensible: be crawlable (including by AI crawlers, if the owner wants
that), be renderable without JS, mark up content with valid structured data, and be genuinely worth
citing. Treat anything beyond that as a hypothesis to test, not a recommendation to ship.

## Attribution: "Direct traffic" is a garbage bucket

Analytics reports a channel called Direct. It is not a channel — it is the bucket for every visit
whose origin was lost. Links shared in encrypted messengers and DMs (WhatsApp, Signal, Snapchat,
Instagram DMs), pasted into documents, or opened from some native apps arrive with no referrer and
land in Direct. This is often called "dark social."

**The invalid inference to refuse:** *"Direct is our biggest channel, so we have strong brand
recognition and loyalty."* Direct conflates people typing the URL from memory (real brand strength)
with people who clicked a link a friend sent them (someone else's referral, invisible to you). You
cannot tell those apart from analytics alone, so you cannot conclude either.

What to do instead:

- **Ask the user.** A self-reported attribution field ("How did you hear about us?") on the
  checkout or lead form is the only reliable way to recover the lost origin. It is crude, and it
  beats a confident number that means nothing.
- **Never rank channels by volume when Direct is one of the rows.** The comparison is not
  like-for-like.
- **Treat a Direct spike as an unexplained event, not an achievement.** It usually means someone
  shared you somewhere you cannot see.

The same discipline applies to sample size. Day-of-week and hour-of-day conclusions drawn from a few
hundred conversions — especially when most days have zero — are noise dressed as insight. Before
recommending "run campaigns on Tuesdays," check whether the difference survives the sparsity. Usually
it does not.

## Evaluating SEO claims: leaks, rumors, and vendor advice

SEO has more confident folklore than almost any technical field, and users will bring you claims
sourced from leaks, conference talks, and agency blogs. Apply a consistent standard.

**The May 2024 Google leak** (≈2,500 internal API documents; Google confirmed their authenticity but
cautioned that they may be out-of-context, outdated, or incomplete) is the case that comes up most.
Treat it correctly:

- **It shows which attributes exist. It does not show their weight, whether they are used in
  production ranking, or how they are computed.** A field name like `siteAuthority` or
  `siteFocusScore` in an internal API is evidence that a concept exists somewhere in Google's
  systems. It is not a dial you can turn, and it is not a tactic.
- **Almost nothing actionable follows from it that was not already official guidance.** The practical
  recommendations people derive from the leak — publish genuinely useful content, earn quality links,
  keep content current, use valid structured data, avoid keyword stuffing and link schemes — are the
  same recommendations in Google's public documentation. The leak changed the *story*, not the *job*.
- **Beware proxy-chasing.** "The leak mentions dwell time, so increase dwell time" inverts cause and
  effect: it produces padded intros and hidden answers, which make the page worse. Optimize the thing
  the metric is a proxy *for* — the user getting what they came for — never the metric.

**The general rule.** Rank a claim by what would have to be true for it to be actionable, and say
which tier you are in:

1. **Documented behavior** (Google Search Central, web.dev) — act on it.
2. **Observable mechanics** (what the server returns, what a crawler can fetch, what Search Console
   counts) — verify it yourself, then act on it.
3. **Inferred from a leak, a patent, or a correlation study** — interesting, unweighted, unactionable
   on its own. May justify an experiment; never justifies a confident recommendation.
4. **Asserted by a vendor or a blog with no mechanism** — treat as folklore until it reaches tier 2.

When a user asserts a tier-3 or tier-4 claim as fact, say which tier it is and what would move it up.
Do not adopt it because they sound certain, and do not dismiss it because it is unofficial.

## Defaults

- **Diagnose in pipeline order.** Crawl, render, index, rank. Do not reorder for convenience.
- **Compare served HTML against rendered DOM every time** the site is a JS app. That one diff
  explains most "Google can't see my content" reports.
- **Prefer one self-referencing, absolute canonical per page.** Conflicting canonicals are a defect.
- **Prefer JSON-LD** for structured data, and validate it rather than eyeballing it.
- **Treat performance as a tiebreaker, not a cause.** Core Web Vitals rarely explain a page absent
  from the index; they matter at the margin between comparable results.
- **Look it up, do not recall it.** For any current specific, check Google Search Central
  (see "Sources"). Memory of ranking advice is stale by construction and full of folklore.

## Anti-folklore

Google states these explicitly. Do not "fix" them, and push back when a user asks you to.

- **The keywords meta tag does nothing.** Google Search does not use it.
- **There is no word-count target.** No magic minimum or maximum.
- **Heading order does not matter for search.** `h1`/`h2` nesting matters for *accessibility*, which
  is a good reason to get it right — but do not sell it as an SEO fix.
- **Keywords in the domain or URL barely matter** beyond appearing in breadcrumbs.
- **E-E-A-T is not a ranking factor** and has no score to optimize. It describes what Google's
  systems aim to reward. Quality rater ratings never move an individual page's position.
- **Keyword stuffing is a spam policy violation,** not an optimization.

The starter guide's own summary: creating content people find compelling and useful "will likely
influence your website's presence in search results more than any of the other suggestions."

## Gotchas

- **`Disallow` in robots.txt does not remove a page from the index — it prevents Google from seeing
  the `noindex` you added.** To de-index, the page must stay crawlable long enough for the `noindex`
  to be read. Blocking and de-indexing are opposite instructions; combining them fails silently.
- **Lighthouse's "SEO" category is a shallow lint, not an SEO audit.** 100/100 says nothing about
  whether a site can rank. Never report that score as an SEO result.
- **`noindex` shipped from staging to production** is a routine and catastrophic cause of traffic
  collapse. On any "traffic dropped" report, check production's meta robots and `X-Robots-Tag` first.
- **Client-only rendered content is a gamble.** Google can render JS, but with delay and no promise;
  most other crawlers and LLM fetchers cannot.
- **Soft 404s**: a "not found" page returning `200` gets indexed as thin content. Status codes must
  tell the truth.
- **Pagination, faceted search, and query parameters** generate near-duplicate URLs at scale and are
  a far likelier indexing problem than anything on a single page.
- **Most new pages are discovered through links.** An orphan page in no sitemap and linked from
  nowhere is invisible regardless of how good it is.

## Testing SEO changes

SEO cannot be A/B tested the way a UI can: you cannot serve two versions of one URL to search engines
and compare. Showing the crawler different content than users is cloaking. The design must work
around that.

**Two valid designs, in order of preference:**

1. **Split test across comparable URL groups.** Take a large set of similar pages (products,
   locations, articles), split into two matched buckets, change one bucket, and compare each bucket's
   Search Console impressions and clicks against its own pre-change baseline. The only design with a
   real control. Needs enough pages — typically hundreds — to survive the noise.
2. **Before/after on the same pages, with a control set.** Use when there are too few pages to split.
   Track an unchanged comparable set over the same window; if both sets move, the cause was external.

**Rules that make the result mean anything:**

- **Confirm the change was actually seen before measuring.** Use Search Console's URL Inspection live
  test to verify Google fetched and rendered the new version. Measuring before recrawl measures lag.
- **Respect the lag.** Recrawl and re-evaluation take days to weeks. Judging an SEO change after 48
  hours produces noise, not a verdict.
- **Pick a leading, attributable metric.** Impressions and average position for the affected page set
  move earlier and cleaner than sessions or revenue. A single-position rank change is nothing.
- **Name the confounders up front:** algorithm updates, seasonality, competitor moves, other deploys
  in the same window, and **the arrival of an AI answer on the target queries** — that last one can
  move clicks and average position on its own, with nothing about your page having changed. Write
  down which you cannot rule out, and say so in the result.
- **One change at a time per bucket.** Ship the title rewrite and the internal-linking change
  together and you have learned nothing about either.

If the user wants a verdict faster than the crawl lag allows, tell them the truth: the data does not
exist yet, and any number produced now is noise.

## Validation

Before reporting an audit as complete:

- Every claim traces to a specific observation (a status code, a DOM node, a directive), not to a
  general belief about SEO.
- Findings are grouped by pipeline stage and ordered by impact, crawl/index blockers first.
- The report states explicitly which questions require the user's Search Console or analytics data.
- Any current-specifics claim was checked against a source below rather than recalled.
- No Lighthouse score is presented as an SEO outcome.
- No recommendation appears in the "Anti-folklore" list.

## References

- Read `./references/content-quality.md` when the audit reaches the content or ranking stage: it
  carries Google's quality-rater framework (page purpose, YMYL, E-E-A-T with Trust at the center, and
  the Lowest-quality criteria) and how to use it without over-claiming.

## Sources

Check these before asserting any current specific; they are the authority, and they change.

- SEO Starter Guide — <https://developers.google.com/search/docs/fundamentals/seo-starter-guide>
- Search Console — <https://developers.google.com/search/docs/monitor-debug/search-console-start>
- Core Web Vitals — <https://web.dev/explore/learn-core-web-vitals>
- Search Quality Rater Guidelines (PDF) —
  <https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf>
- Performance report, including how AI Overviews and AI Mode count clicks, impressions, and position
  — <https://support.google.com/webmasters/answer/7042828>
