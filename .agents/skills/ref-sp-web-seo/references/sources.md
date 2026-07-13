# Sources and Verification

Provenance for `../SKILL.md`, **organized by the section it supports**. Use it to check one claim's
origin before asserting it, and to re-verify the skill when it may have gone stale.

**Last full verification: 2026-07-12.**

## Read this first: corroborate, do not just cite Google

Most SEO documentation is written by Google, and on many of these questions Google is an **interested
party** — it is describing its own product, and sometimes describing what it *wants* site owners to
do. Google's docs are the best available source for *how Google behaves*. They are not automatically
the best source for *how the web works*.

So, wherever one exists, this file names a second, independent source:

- **Standards** (IETF, sitemaps.org, schema.org, WHATWG) define what the protocol actually says, and
  bind every crawler, not just Google's.
- **Other search engines** (Bing) reveal which behaviours are universal and which are Google-specific.
  Bing's guidelines defeat plain fetching — read them with a real browser (see "Reading Bing" below).
- **Framework docs** (Next.js) determine what a crawler physically receives, which no search engine
  can tell you.

**Where two independent sources agree, the claim is strong. Where only Google speaks, say so out
loud.** A claim resting on a single interested source is a tier-1 document but not a tier-1 fact.

## How to re-verify (cheapest path first)

1. **Fetch Google's documentation changelog** — one request, tells you whether anything moved:

   ```sh
   curl -s https://developers.google.com/search/updates/search_docs_updates.rss
   ```

   Scan it for the documents named below. If none appear since the last-verified date, the Google-
   sourced claims are almost certainly still good.

2. **Check the ranking-update history** — this invalidates *test windows*, not claims:
   <https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history>

3. **Standards move slowly; framework docs move fast.** Skip the RFCs on a routine pass. Always
   re-check the Next.js pages — they carry a version and a `lastUpdated` date, and the behaviour
   genuinely changes between minor versions.

4. **Fetch only what was flagged**, compare against the "Claim" column, fix the claim, update the row,
   bump both dates, and tell the user what moved.

5. **Check content, not status codes.** A source that returns 200 is not a source that supports the
   claim — see the crawler-doc example in `.agents/skills/ref-sp-web-seo-ai/references/sources.md`,
   where a live page had silently stopped documenting the thing it was cited for.

## Section: Anti-folklore

| Claim | Primary source | Corroboration | Verified |
| --- | --- | --- | --- |
| Meta keywords unused; no word-count target; heading order irrelevant to search (matters for accessibility); domain keywords barely matter; E-E-A-T is not a ranking factor; keyword stuffing is a spam violation | [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) | [Search Essentials — spam policies](https://developers.google.com/search/docs/essentials/spam-policies); heading semantics are an accessibility concern per [WHATWG HTML](https://html.spec.whatwg.org/multipage/sections.html#headings-and-outlines) | 2026-07-12 |
| Meeting every technical requirement guarantees nothing | [Search Essentials](https://developers.google.com/search/docs/essentials) | — (Google-only; it is a statement about Google's own discretion, and no external source can corroborate it) | 2026-07-12 |
| Google ignores `<priority>` and `<changefreq>`; uses `<lastmod>` only if consistently and verifiably accurate | [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) | The [sitemaps.org protocol](https://www.sitemaps.org/protocol.html) *defines* these tags — which is exactly the point: the standard specifies them and the engines decline to use them. A tag in the spec is not a tag anyone honours. **Bing** independently values *"accurate `lastmod` values and HTTP validation headers such as ETags"* — so `lastmod` accuracy matters to both engines, while `priority`/`changefreq` matter to neither. | 2026-07-12 |
| Dynamic rendering is "a workaround and not a recommended solution" | [Dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering) | — (Google-only) | 2026-07-12 |

## Section: Crawl, robots.txt, and sitemaps

| Claim | Primary source | Corroboration | Verified |
| --- | --- | --- | --- |
| `robots.txt` syntax and semantics; it is a **request, not enforcement** | [RFC 9309 — Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html) — the actual standard, binding on every crawler | [Google's robots.txt interpretation](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt) | 2026-07-12 |
| A `Disallow` prevents Google from *seeing* a `noindex`. Verbatim: *"For the `noindex` rule to be effective, the page or resource must not be blocked by a robots.txt file… the crawler will never see the `noindex` rule, and the page can still appear in search results."* | [Google: block indexing](https://developers.google.com/search/docs/crawling-indexing/block-indexing) | Follows directly from RFC 9309: a crawler forbidden to fetch the page cannot read a directive inside it. **Mechanically true, not merely documented** — the strongest class of claim in this skill. | 2026-07-12 |
| Sitemap limits: 50MB uncompressed, 50,000 URLs, UTF-8, absolute canonical URLs, sitemap index above that | [sitemaps.org protocol](https://www.sitemaps.org/protocol.html) — the vendor-neutral spec | [Google build-sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) | 2026-07-12 |
| Discovery is mostly via links; an orphan page is invisible | [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) | **Bing, independently**: discover URLs via "XML sitemaps, Crawlable internal links, External links from relevant websites"; "Ensure each important URL is reachable through crawlable internal links"; "Use standard `<a href>` links" | 2026-07-12 |

## Section: JavaScript rendering

| Claim | Primary source | Corroboration | Verified |
| --- | --- | --- | --- |
| Crawl → render → index, with a deferred render queue; blocked resources prevent rendering; `noindex` in initial HTML can skip rendering; SPA soft 404s; fragment URLs unreliable; lazy-loaded images may not be indexed | [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) | **Bing, independently**, lists under "Avoid": *"Hiding critical content behind client-side rendering"*, and warns *"Content that cannot be reliably rendered may not be indexed or selected for grounding results."* Two engines agree — this is not a Google quirk. | 2026-07-12 |
| Most non-Google crawlers do not execute JavaScript | Inferred, not documented by any single vendor | Corroborated by Next.js's own `htmlLimitedBots` mechanism (below), which exists *precisely because* a class of bots cannot run JS. **Label this as a well-supported inference, not a citation.** | 2026-07-12 |

## Section: Framework and CMS traps → `./frameworks.md`

Fast-moving. The Next.js pages carry a version and `lastUpdated` — check them; behaviour changes
between minor versions. Verified against Next.js **16.2.10**.

| Claim | Source | Verified |
| --- | --- | --- |
| Streaming metadata appends tags to `<body>`; Googlebot handles it; **HTML-limited bots are detected by a hardcoded User-Agent list** (`htmlLimitedBots`); `generateMetadata` is Server-Components-only; shallow merge replaces whole nested objects; canonicals via `alternates.canonical` + `metadataBase` | [generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) | 2026-07-13 |
| `app/sitemap.ts` and `app/robots.ts` file conventions generate the files at build; `generateSitemaps` splits large sets; `alternates.languages` emits `hreflang`; the `Sitemap` type accepts `changeFrequency` and `priority` — **which Google ignores** (see Anti-folklore above; the framework offering a field is not the engine honouring it) | [sitemap.xml](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap); [robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots); [Metadata files](https://nextjs.org/docs/app/api-reference/file-conventions/metadata) | 2026-07-13 |
| `output: 'export'` disables redirects, headers, rewrites, Middleware, ISR, Server Actions, and default-loader image optimization; static `GET` Route Handlers (incl. `sitemap.ts`/`robots.ts`) still emit at build | [Static exports](https://nextjs.org/docs/app/guides/static-exports) | 2026-07-13 |
| WordPress core ships XML sitemaps since **5.5** at `/wp-sitemap.xml`, built from posts, taxonomies, **and users**; disable/filter via `wp_sitemaps_enabled` | [Make WordPress Core — XML sitemaps in 5.5](https://make.wordpress.org/core/2020/07/22/new-xml-sitemaps-functionality-in-wordpress-5-5/); [WP_Sitemaps class](https://developer.wordpress.org/reference/classes/wp_sitemaps/) | 2026-07-13 |
| Yoast REST API exposes `yoast_head` (prefabricated HTML blob incl. schema) and `yoast_head_json` (structured); `GET /wp-json/yoast/v1/get_head?url=`; read-only; a 404 means the object is missing from Yoast's *indexables* | [Yoast developer portal — REST API](https://developer.yoast.com/customization/apis/rest-api/) | 2026-07-13 |
| **Yoast assumes the CMS and frontend share a domain**, so in a headless setup its canonical / `og:url` / schema `@id` point at the CMS origin and must be rewritten | Yoast's REST API docs describe the fields; the same-domain assumption and the required URL rewrite are **widely reported by headless practitioners** and follow mechanically from the API returning the CMS's own URLs. **Tier: inferred + widely reported, not a Yoast-documented caveat.** Verify against the actual `yoast_head` output of the site you are auditing — it is a one-request check. | 2026-07-13 |

**The strongest claim in that file is also the cheapest to verify.** "Your headless canonical points at
the CMS" is not something to take on authority — `curl` the frontend and read the `<link rel=canonical>`.
Do that rather than citing this row.

## Section: Structured data

| Claim | Source | Verified |
| --- | --- | --- |
| JSON-LD is the preferred syntax; validate rather than eyeball | [schema.org](https://schema.org/) — the vocabulary itself, vendor-neutral and shared by Google, Bing, and others | 2026-07-12 |
| Validate with a real validator | [Schema Markup Validator](https://validator.schema.org/) (vendor-neutral) and [Google Rich Results Test](https://search.google.com/test/rich-results) (Google-specific eligibility) — **these answer different questions**: valid markup and rich-result eligibility are not the same thing | 2026-07-12 |

## Section: Core Web Vitals

| Claim | Primary source | Corroboration | Verified |
| --- | --- | --- | --- |
| LCP ≤ 2500ms, INP ≤ 200ms, CLS ≤ 0.1, at the **75th percentile** | [CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds) | — | 2026-07-12 |
| Field data (CrUX) is what counts; a lab Lighthouse run is one machine on one network | [Chrome UX Report](https://developer.chrome.com/docs/crux) | [Lighthouse docs](https://developer.chrome.com/docs/lighthouse/overview) confirm it is lab tooling by design | 2026-07-12 |
| No single page-experience signal; relevance wins even when page experience is sub-par; good CWV does not guarantee ranking — tiebreaker, not penalty | [Page experience](https://developers.google.com/search/docs/appearance/page-experience) | — (Google-only, and it is Google describing its own ranking; treat as authoritative *about Google* and not generalizable to other engines) | 2026-07-12 |

## Section: Content quality

| Claim | Source | Verified |
| --- | --- | --- |
| Page Quality framework, page purpose, YMYL, E-E-A-T with Trust at the centre, the Lowest-quality screen, Needs Met, and the statement that no rating moves an individual page | [Search Quality Rater Guidelines (PDF)](https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf) — **September 11, 2025 edition** | 2026-07-12 |

Check page 1 for the edition date and Appendix 2 for the change log. A new edition supersedes the
summary in `./content-quality.md` wholesale — do not patch it claim by claim.

## Section: Evaluating SEO claims / testing

| Claim | Source | Verified |
| --- | --- | --- |
| The May 2024 leak: Content Warehouse API docs — **2,596 modules, 14,014 attributes** — committed to a public GitHub repo by a bot; Google confirmed authenticity 29 May 2024 while cautioning against "inaccurate assumptions… based on out-of-context, outdated, or incomplete information" | [2024 Google Search documentation leak (Wikipedia)](https://en.wikipedia.org/wiki/2024_Google_Search_documentation_leak) — event facts and Google's statement; [SparkToro / Rand Fishkin](https://sparktoro.com/blog/an-anonymous-source-shared-thousands-of-leaked-google-search-api-documents-with-me-everyone-in-seo-should-see-them/) — the recipient's own account | 2026-07-12 |
| Core and spam update history, used to rule out the algorithm-update confounder | [Search Status Dashboard](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history) — live; consult per test, never cache | 2026-07-12 |
| Split-testing, control groups, lag, confounders, leading vs lagging metrics | **Method, not citation.** Ordinary experimental design. It needs no vendor to confirm it and cannot go stale. | n/a |

## Reading Bing — and why "200" is not "supported"

Bing's Webmaster Guidelines are the independent corroboration for the crawl, rendering, and
link-discovery sections. Getting them required a lesson worth keeping.

**The trap.** The page returns HTTP 200 to `curl`, and is a client-rendered JavaScript shell: a
non-rendering fetch retrieves the `<title>` and essentially no body. The first attempt at this file
cited Bing anyway, on the strength of the status code. That is a fabricated citation — an unread
source is not a source, however confident the paraphrase.

**The fix.** Read it in a real browser:

```sh
yarn playwright open
yarn playwright goto "https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a"
```

(Note the canonical path is `webmaster-guidelines`, singular; the plural form redirects.) See
`.agents/skills/ref-sp-dev-playwright-cli/SKILL.md`.

**The lesson, twice over.** Check content, never status codes — and note *what* defeated the fetch:
Bing's own public guidance telling site owners not to hide content behind client-side rendering is
itself served as a client-rendered shell that a non-JavaScript crawler cannot read. That is the exact
failure this skill exists to catch, found on the first independent source we reached for. Assume it is
happening on the site you are auditing.

## Standing entry points

- Google documentation changelog (RSS) — <https://developers.google.com/search/updates>
- Google Search Central blog — <https://developers.google.com/search/blog>
- Bing Webmaster Guidelines — <https://www.bing.com/webmasters/help/webmasters-guidelines-30fba23a>
  (**read it in a real browser**, not a fetcher — see below)
- AI surfaces rotate fastest and have their own provenance file:
  `.agents/skills/ref-sp-web-seo-ai/references/sources.md`
- Traffic and attribution provenance: `.agents/skills/ref-sp-web-marketing/references/sources.md`
