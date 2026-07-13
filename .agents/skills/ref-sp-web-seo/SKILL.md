---
name: ref-sp-web-seo
description: "Audit a website's SEO from what is actually observable — served and rendered HTML, robots.txt, sitemaps, canonicals, titles, structured data, Core Web Vitals — separate that from the performance data only Search Console can answer, and design before/after tests that mean something. Use when: asked to check, audit, or improve a site's SEO; diagnosing why pages are not indexed, not ranking, or why organic traffic dropped; reviewing robots.txt, sitemaps, canonicals, titles, or structured data; debugging why a crawler cannot see JavaScript-rendered content; SEO on Next.js, WordPress, or headless WordPress + Next.js (metadata, sitemaps, canonicals, static export); interpreting a Lighthouse or Core Web Vitals report; judging whether an SEO change actually worked; weighing an SEO claim from a leak, a vendor, or a blog; or assessing content quality against Google's rater framework."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "web"
  shareable-skills.tags: "testing, browser"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-dev-playwright-cli, ref-sp-web-seo-ai, ref-sp-web-marketing, ref-sp-web-social-media"
---

# Web SEO

## Purpose

Audit a site's SEO using evidence you can actually obtain, state plainly which questions cannot be
answered without the owner's Search Console data, and design SEO tests whose results mean something.

## This file goes stale in months, not years

Search changes faster than almost anything else this repo documents, and the AI surfaces are changing
faster still. **Treat every vendor-specific claim below as dated, not permanent.** Content here was
verified **2026-07-12**; a specific that is more than a few months old has a real chance of being
wrong, and stating it confidently is worse than looking it up.

What is durable: the crawl → render → index → rank → measure pipeline, the observable/not-observable
split, the claim-tiering rule, and the test-design discipline. Those are method, and method holds.

What rots: thresholds, report names, which directives Google honours, what Search Console exposes,
and anything about AI answers. Before asserting one of those, check `./references/sources.md`.

This is not boilerplate caution. A freshness pass on this skill's own first draft found two claims
that had already been superseded within weeks of being written.

**Every dated claim here has a source, and re-verifying is one command.** Read
`./references/sources.md` before asserting a specific, and whenever the skill may be stale. It maps
each claim to the document it came from, the date it was checked, and what would invalidate it — and
it opens with the cheap path: fetch Google's documentation changelog
(`curl -s https://developers.google.com/search/updates/search_docs_updates.rss`), scan it for the
documents in the table, and only re-fetch what actually moved. If nothing moved, you are done in one
request.

## When to use this skill

- Asked to "check the SEO" of a site, page, or app.
- A page is not indexed, not ranking, or disappeared from search results — **or organic traffic
  dropped** and nobody knows why.
- Reviewing `robots.txt`, sitemaps, titles, meta descriptions, canonicals, `hreflang`, or structured
  data.
- A crawler cannot see JavaScript-rendered content.
- The site is **Next.js, WordPress, or headless WordPress + Next.js** and metadata, canonicals,
  sitemaps, or indexing are behaving oddly — load `./references/frameworks.md`.
- Interpreting a Lighthouse run or Core Web Vitals numbers.
- Deciding whether an SEO change worked, or how to measure one before shipping it.
- Weighing an SEO claim sourced from a leak, a vendor, or a conference talk.
- Judging whether a page's *content* is good enough to rank (load `./references/content-quality.md`).

**Route elsewhere when:** the question is about AI answers or AI crawlers
(`.agents/skills/ref-sp-web-seo-ai/SKILL.md`), or about traffic sources, channels, and conversions —
including a large "Direct" bucket (`.agents/skills/ref-sp-web-marketing/SKILL.md`).

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
| Check `robots.txt` for AI crawler user-agents. **Do not advise a change from this skill** — load `.agents/skills/ref-sp-web-seo-ai/SKILL.md` first. | Whether AI assistants may crawl, cite, or train on the site. | Operators split their bots into **training / search-retrieval / user-initiated**, and a blanket AI `Disallow` silently does all three — including breaking users who deliberately paste your URL into an assistant. The token list also changes without notice. | Whenever the user cares about AI visibility, or is about to block AI bots. | The allow/block state is intentional per *job*, not per vendor, and the user has confirmed it. |
| `curl -sS <origin>/sitemap.xml` | The declared canonical URL set. | Sitemap URLs must be indexable, canonical, absolute, and `200`; mismatches confuse selection. Hard limits: 50MB uncompressed and 50,000 URLs per file — split via a sitemap index beyond that. | When auditing a site rather than one page. | Sitemap URLs match the canonicals the pages declare. |
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

**Do not oversell this.** There is no single "page experience signal," and relevance dominates:
Google states that Search "always seeks to show the most relevant content, even if the page
experience is sub-par," and that good Core Web Vitals "doesn't guarantee that your pages will rank at
the top." Page experience contributes when there is lots of comparable helpful content — a
tiebreaker, not a lever, and not a penalty. Anyone framing Core Web Vitals as an "algorithmic
penalty" you must avoid is wrong.

## JavaScript rendering

Google processes JS apps in three phases: **crawl** (fetch the URL, parse the HTML for `href` links),
**render** (a headless Chromium executes the JS — but only after sitting in a **render queue**, which
"can take longer" than a few seconds), then **index** the rendered result. Rendering is deferred and
not guaranteed, and most non-Google crawlers do not render at all.

Documented pitfalls, all of which you can check yourself:

- **Blocked resources kill rendering.** Google will not render JS from files or pages blocked in
  `robots.txt`. A `Disallow`d `/static/` or `/_next/` directory silently blanks the page.
- **A `noindex` in the initial HTML can stop rendering entirely.** Google may skip rendering when it
  sees `noindex`, so you *cannot* use JavaScript to remove one. The server must not send it.
- **SPA soft 404s.** Client-side routing cannot return a real status code. A missing route that
  renders "not found" with a `200` gets indexed as thin content. Redirect to a real 404 URL or emit
  `noindex`.
- **Fragment URLs (`#/route`) are not reliably resolved.** Use real paths.
- **Lazy-loaded images may never be indexed** if they only load on interaction.

Google's recommendation is plain: **server-side rendering, static rendering, or hydration.** It also
now **discourages dynamic rendering** (serving crawlers a pre-rendered copy) — in its words, "a
workaround and not a recommended solution, because it creates additional complexities and resource
requirements." Do not propose it.

## Framework and CMS traps

The framework decides what a crawler actually receives, and the defaults are not what you would guess.
**If the site is Next.js or WordPress — or both, headless — load `./references/frameworks.md` before
auditing.** It carries the sourced detail; these are the three traps you must recognize on sight:

- **Next.js may stream metadata into `<body>`, not `<head>`.** Since 15.2, when `generateMetadata`
  resolves after the initial UI is sent, its tags are appended to `<body>`. Googlebot copes because it
  runs JS. Next protects non-JS bots via a **hardcoded User-Agent list** (`htmlLimitedBots`) — so a
  non-JS crawler *outside that list* receives metadata it cannot see. That is most AI fetchers and many
  social unfurlers.
- **Headless WordPress emits canonicals pointing at the CMS.** Yoast assumes the CMS and frontend share
  an origin. They do not. Inject its `yoast_head` blob unmodified and you have told Google that
  **`cms.example.com` is the canonical version of your site.** Rewrite every origin, and make the CMS
  non-indexable — an open WordPress backend serving the same content is a full-site duplicate.
- **WordPress generates a large surface of thin, near-duplicate URLs by default** — category, tag,
  author, and date archives, paginated archives, and attachment pages. This dwarfs anything on an
  individual page. (And core has shipped sitemaps at `/wp-sitemap.xml` since 5.5, including a *users*
  sitemap.)

The general rule all three illustrate: **never infer what a crawler sees from the source code.** Fetch
the page as a bot and look at the bytes. The framework may be doing something you did not authorize.

## Adjacent skills

Two neighbouring concerns have their own skills. Hand off rather than duplicating them.

### AI answers — `.agents/skills/ref-sp-web-seo-ai/SKILL.md`

This skill and that one are **two halves of one job**, and the boundary is worth stating plainly:
per Google *and* Bing, **ordinary SEO is the AI-visibility lever** — there is no separate GEO
mechanism. So most AI questions resolve back into the work in *this* file. Load the AI skill for the
things that genuinely differ:

| Symptom or question | Go to `ref-sp-web-seo-ai`, section |
| --- | --- |
| "How do we rank / get cited in ChatGPT, AI Overviews, AI Mode?" | "The honest position, stated first" |
| Someone is proposing GEO tactics — chunking, entity engineering, schema for AI | "How to read GEO advice" — Google's guide *warns against* chunking, and there is no AI schema |
| **Clicks falling while impressions hold steady**, or CTR fell with no ranking change | "What AI answers do to your data" — this is an AI answer absorbing the visit, not a demotion |
| Reading Search Console now that AI Overviews blend into the numbers | Same — average position mixes AI citations with blue links; the Generative AI report is impressions-only |
| Blocking or allowing `GPTBot`, `ClaudeBot`, `Claude-User`, `PerplexityBot`, `Google-Extended` | "Controlling AI crawler access" — training / search / user-initiated are **three** decisions |
| "Should we opt out of AI training?" | Same — and note `Perplexity-User` documents that it ignores `robots.txt` |

**Do not answer an AI-crawler or GEO question from this file.** The token list and the AI surfaces
change monthly; that skill carries the current ones and their provenance.

### Traffic, channels, conversions — `.agents/skills/ref-sp-web-marketing/SKILL.md`

Why "Direct" is a bucket of lost origins rather than a channel, how dark social destroys referrer
data, self-reported attribution, and when a difference is sparsity rather than signal. Load it as soon
as the discussion moves from *search* to *traffic sources or conversions* — including any report where
Direct is a large row.

## Evaluating SEO claims: leaks, rumors, and vendor advice

SEO has more confident folklore than almost any technical field, and users will bring you claims
sourced from leaks, conference talks, and agency blogs. Apply a consistent standard.

**The May 2024 Google leak** is the case that comes up most. The facts, so you can correct the myths
around them: internal Content Warehouse API documentation — **2,596 modules describing 14,014
attributes** — was committed to a public GitHub repository by an automated bot and surfaced in May
2024. Google **confirmed the documents were authentic** (29 May 2024) while cautioning, verbatim:

> "We would caution against making inaccurate assumptions about Search based on out-of-context,
> outdated, or incomplete information."

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

**Briefing documents are leads, not sources.** When someone hands you a research export, a strategy
brief, a slide deck, or an AI-generated summary — including one they wrote themselves — it is a **map
of what to go verify**, never a citation. Mine it for the URLs and claims worth chasing, then fetch
the live primary source and cite *that*. These documents are stale or will be, and they carry errors
that get laundered into fact by being quoted. Real examples encountered building this skill: a
research export mislabelled Google's Search Essentials with the starter-guide URL and claimed Core
Web Vitals carry "algorithmic penalties" (they do not); a strategy brief recommended "semantic
chunking," which Google's own AI optimization guide explicitly warns against. Both would have been
shipped as advice if quoted rather than checked.

**Read the content, never the status code.** A source that returns HTTP 200 is not a source that
supports your claim. Pages move, get rewritten, and drop the section you cited while the URL keeps
resolving. And a page can return 200 with an empty body: client-rendered documentation is invisible
to `curl`. When plain fetching fails, read it in a real browser rather than paraphrasing what it
surely says — see `.agents/skills/ref-sp-dev-playwright-cli/SKILL.md`. Citing an unread source is
fabrication, however confident the paraphrase.

## Defaults

- **Diagnose in pipeline order.** Crawl, render, index, rank. Do not reorder for convenience.
- **Compare served HTML against rendered DOM every time** the site is a JS app. That one diff
  explains most "Google can't see my content" reports.
- **Prefer one self-referencing, absolute canonical per page.** Conflicting canonicals are a defect.
- **Prefer JSON-LD** for structured data, and validate it rather than eyeballing it. But add it for
  **rich results**, never for AI visibility — Google states there is no special schema for generative
  AI. If someone is adding schema to win AI citations, see
  `.agents/skills/ref-sp-web-seo-ai/SKILL.md`.
- **Treat performance as a tiebreaker, not a cause.** Core Web Vitals rarely explain a page absent
  from the index; they matter at the margin between comparable results.
- **Look it up, do not recall it.** For any current specific, check Google Search Central
  (via `./references/sources.md`). Memory of ranking advice is stale by construction and full of folklore.

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
- **Google ignores `<priority>` and `<changefreq>` in sitemaps entirely.** Tuning them is wasted
  work. `<lastmod>` is used only if it is "consistently and verifiably accurate" — a build process
  that stamps today's date on every URL makes it worthless, so an inaccurate `lastmod` is worse than
  none.
- **Dynamic rendering is not a fix.** Google calls it "a workaround and not a recommended solution."
- **Meeting every technical requirement guarantees nothing.** Google states plainly that satisfying
  Search Essentials does not guarantee it will crawl, index, or serve your content. Eligibility is
  not entitlement.

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
- **Rule out the algorithm update, do not just name it.** Google's Search Status Dashboard lists core
  and spam updates with start dates and durations (and offers JSON feeds). Cross-reference the traffic
  change against it before blaming your own deploy — or before crediting it. A core update that
  overlaps your test window invalidates the test.
- **Name the remaining confounders up front:** seasonality, competitor moves, other deploys in the
  same window, and **the arrival of an AI answer on the target queries** — that last one can move
  clicks and average position on its own, with nothing about your page having changed. Write down
  which you cannot rule out, and say so in the result. Before blaming your own change for a CTR
  collapse, rule out the AI surface: `.agents/skills/ref-sp-web-seo-ai/SKILL.md` (its "What AI
  answers do to your data" section explains why *impressions steady, clicks falling* is the
  signature, and why average position now blends AI citations with blue links).
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
- Any dated specific was checked against `./references/sources.md` rather than recalled, and its
  verified date is recent enough to trust.
- No Lighthouse score is presented as an SEO outcome.
- No recommendation appears in the "Anti-folklore" list.

## References

- Read `./references/sources.md` **before asserting any dated specific, and whenever this skill may be
  stale.** It carries the per-claim provenance table (claim → source → verified date → what would
  invalidate it) and the one-command re-verification procedure.
- Read `./references/frameworks.md` when the site is **Next.js or WordPress** (or headless WordPress +
  Next.js): metadata streaming, `sitemap.ts`/`robots.ts` conventions, static-export limits, WordPress
  archives and core sitemaps, and the headless canonical trap.
- Read `./references/content-quality.md` when the audit reaches the content or ranking stage: it
  carries Google's quality-rater framework (page purpose, YMYL, E-E-A-T with Trust at the center, and
  the Lowest-quality criteria) and how to use it without over-claiming.
- Hand off to `.agents/skills/ref-sp-web-seo-ai/SKILL.md` for AI answers, and to
  `.agents/skills/ref-sp-web-marketing/SKILL.md` for traffic and conversion data.
