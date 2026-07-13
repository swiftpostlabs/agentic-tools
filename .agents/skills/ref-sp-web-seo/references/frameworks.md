# Framework and CMS SEO

Stack-specific SEO for the two most common cases: **Next.js (App Router)** and **WordPress**,
including the **headless WordPress + Next.js** combination, where the failure modes are severe and
non-obvious.

Load this when the site is built on either stack. The general pipeline (crawl → render → index → rank
→ measure) is in `../SKILL.md` and still governs — this file is only about what the framework does to
that pipeline.

**Verified 2026-07-13** against Next.js 16.2.10 docs, Yoast's developer portal, and WordPress core
sitemap documentation. Framework behaviour changes between minor versions — check `./sources.md` and
re-read the version notes before asserting.

**The rule that outranks everything here: never infer what a crawler sees from the source code.**
Fetch the page as a bot and look at the bytes. Both these stacks routinely emit something other than
what the code appears to say.

---

## Next.js (App Router)

### Metadata

- **`generateMetadata` is Server Components only.** It cannot be set from a `'use client'` component;
  the metadata must move to a Server parent.
- **Canonicals come from `alternates.canonical` and need `metadataBase`** to resolve to absolute
  URLs. A relative URL with no `metadataBase` is a build error — the *good* failure. The bad failure
  is a canonical that silently resolves against the wrong origin (see the headless section, where this
  becomes catastrophic).
- **Metadata merges shallowly.** A child segment that sets *any* `openGraph` field replaces the parent's
  entire `openGraph` object. Pages routinely lose `og:description` this way and nobody notices.

### The streaming-metadata trap (the big one)

Since Next 15.2, when `generateMetadata` resolves *after* the initial UI is sent, its tags are
**appended to `<body>`, not `<head>`**. Vercel verified that bots which execute JavaScript and inspect
the full DOM (Googlebot) read this correctly.

For **HTML-limited bots** that cannot run JS, Next blocks rendering and puts metadata in `<head>`
instead — but it identifies those bots from a **hardcoded User-Agent list** (`htmlLimitedBots`).

**A non-JS crawler that is not on that list receives metadata it cannot see.** That is precisely the
population of most AI fetchers and many social unfurlers. If metadata must be in `<head>` for
everyone, either keep `generateMetadata` free of request-time data so it prerenders, or widen
`htmlLimitedBots`.

### Sitemaps and robots — use the file conventions

Next has dedicated metadata file conventions. Prefer them over hand-rolled Route Handlers or a
standalone build script:

- **`app/sitemap.ts`** exports a default function returning `MetadataRoute.Sitemap` and produces
  `/sitemap.xml` at build time. For a headless CMS, this is where you fetch the URL list from the API.
- **`app/robots.ts`** produces `/robots.txt` the same way.
- **`generateSitemaps`** splits large sets across multiple sitemaps (Google's hard limit is 50,000
  URLs / 50MB per file — see `../SKILL.md`). Output lands at `/product/sitemap/1.xml` etc.
- `alternates.languages` emits `hreflang`; `images` and `videos` emit image/video sitemap entries.

**Do not waste effort on `changeFrequency` and `priority`.** Next's `Sitemap` type accepts both, which
misleads people into tuning them — **Google ignores both entirely** (see the anti-folklore section in
`../SKILL.md`). Set `lastModified` accurately or omit it; an inaccurate `lastModified` is worse than
none.

### Structured data

There is no metadata API for JSON-LD. Render it yourself as a `<script type="application/ld+json">`
in the component, server-rendered so it lands in the static HTML. Validate it — and add it for **rich
results**, never for AI visibility (see `.agents/skills/ref-sp-web-seo-ai/SKILL.md`).

### Static export (`output: 'export'`)

Removes every server-dependent SEO lever. What **breaks**:

- **Redirects, custom headers, and rewrites** — so no `X-Robots-Tag` and no 301s from Next config.
  These must move to the host (Nginx, CDN, GitHub Pages' limits).
- **ISR, Middleware, Server Actions, dynamic Route Handlers**, `cookies()`.
- **Default-loader image optimization** — a custom loader (CDN, or a build-time optimizer) works.

What still **works**: `app/sitemap.ts` and `app/robots.ts` (static Route Handlers, `GET` only) still
emit their files at build. A standalone sitemap script is *not* required.

**The operational consequence** is the one people miss: with a static export, **content changes are
invisible to crawlers until you rebuild and redeploy.** A CMS edit does nothing on its own. Wire a
publish webhook to CI, or accept that the site is only as fresh as its last build.

---

## WordPress

**This file covers WordPress *SEO* only.** For building on WordPress — the security gates
(sanitize/capability/escape), hooks, `$wpdb->prepare`, child themes, and the headless REST API — use
`.agents/skills/ref-sp-web-wordpress/SKILL.md`.

### Core sitemaps

WordPress core has shipped XML sitemaps since **5.5**, at **`/wp-sitemap.xml`**, generated from posts
(and custom post types), taxonomies (and custom taxonomies), **and users**. Disable or filter them with
`wp_sitemaps_enabled`.

Two consequences:

- **The users sitemap exposes author archives.** These are usually thin, duplicative pages nobody wants
  indexed — and they enumerate usernames. Decide deliberately; do not leave it on by accident.
- **Core sitemaps plus an SEO plugin's sitemaps means two competing sitemaps.** Yoast and RankMath
  disable core's by default, but verify — fetch both `/wp-sitemap.xml` and `/sitemap_index.xml` and see
  what actually answers.

### The archive problem

WordPress generates, by default, a large surface of near-duplicate, thin URLs. This is the single most
common WordPress indexing problem and it dwarfs anything on an individual page:

- **Category, tag, author, and date archives** — often the same posts sliced four ways.
- **Paginated archives** (`/page/2/`) — thin and near-duplicate.
- **Attachment/media pages** — a page per uploaded image, with no content.
- **Search result pages**, if crawlable.

Audit what is actually indexable, then `noindex` what does not deserve to be. Remember the trap from
`../SKILL.md`: **do not `Disallow` these in `robots.txt` if you want them de-indexed** — a blocked page
never gets its `noindex` read.

### SEO plugins

Yoast and RankMath own the title, meta description, canonical, Open Graph, robots directives, and
JSON-LD output. On a classic (non-headless) install this mostly just works; the audit job is to verify
what is emitted, not to trust the plugin's own green lights — a plugin's "SEO score" is a lint, not an
outcome.

---

## Headless WordPress + Next.js

The Gemini-brief scenario, and the one with the sharpest failure modes. WordPress is the content API;
Next renders the frontend. **Every SEO signal that WordPress used to emit into the page must now be
carried across the API and re-emitted by Next.** Nothing does this for you.

### Getting the metadata across

Yoast exposes its output through the **REST API**:

- **`yoast_head`** — an escaped, prefabricated HTML blob of all the meta tags plus schema.org output.
- **`yoast_head_json`** — the same data structured as key/value pairs and objects.
- **`GET /wp-json/yoast/v1/get_head?url=…`** — fetch head data for any URL.
- The API is **read-only**. If it 404s for a page that exists, the object is not in Yoast's *indexables*
  table — re-save it in wp-admin or run "Optimize SEO Data."

WPGraphQL plus the WPGraphQL-Yoast addon is the GraphQL equivalent.

**Two ingestion strategies, and they are not equal:**

| Strategy | What it costs |
| --- | --- |
| Inject the `yoast_head` blob into `<head>` verbatim | Fast, and it **carries the CMS's URLs with it** — see the canonical trap below. Only safe after rewriting origins. |
| Map `yoast_head_json` into Next's `Metadata` object in `generateMetadata` | More work, type-safe, and you control every URL. **Prefer this.** |

### The canonical trap — read this before shipping

**Yoast assumes the CMS and the frontend are the same origin.** In a headless setup they are not. So
the `canonical`, `og:url`, and schema `@id` values it emits point at **`cms.example.com`, not
`example.com`**.

Inject that blob unmodified and you have told Google that **the CMS is the canonical version of your
site.** That is not a subtle ranking issue — it is instructing the index to prefer a backend origin
that may itself be a duplicate of your entire site.

Two things are therefore mandatory:

1. **Rewrite the CMS origin to the frontend origin** in every URL you take from Yoast — canonical, OG,
   schema `@id`, and any internal links inside the content HTML.
2. **Make the CMS origin non-indexable.** `noindex` it (or HTTP-auth it, or block it at the edge). A
   publicly crawlable WordPress backend serving the same content as the frontend is a full-site
   duplicate. Verify by fetching the CMS origin as a bot — do not assume.

### Build-time and freshness

- `generateStaticParams` enumerates the pages to build; `generateMetadata` fetches each page's SEO data
  from the WP API at build time and bakes it into the static HTML. This is what makes the content
  visible to non-rendering crawlers.
- Build the sitemap in **`app/sitemap.ts` from the WP API** — *not* from WordPress's own
  `/wp-sitemap.xml`, which lists **CMS URLs**, not frontend URLs. Shipping the CMS sitemap is the same
  category of mistake as the canonical trap.
- With a static export, a WordPress edit changes nothing until a rebuild. Wire a publish webhook to CI.

### The audit checklist for this stack

Fetch the **production frontend** as a bot and confirm, in the served HTML:

- Title, meta description, and canonical are present in `<head>` — and the canonical points at the
  **frontend** origin.
- The canonical is self-referencing and absolute.
- JSON-LD is present, valid, and its `@id`/`url` values are frontend URLs.
- `/sitemap.xml` lists frontend URLs and returns `200` for a sample of them.
- The **CMS origin** is not indexable, and does not appear in the index (`site:cms.example.com`).
- The content is in the served HTML, not only in the rendered DOM.
