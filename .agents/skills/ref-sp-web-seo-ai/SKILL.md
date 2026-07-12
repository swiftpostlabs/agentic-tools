---
name: ref-sp-web-seo-ai
description: "Visibility in AI answers — Google AI Overviews and AI Mode, and assistants like ChatGPT, Claude, and Perplexity: how they retrieve and cite pages, how to control AI crawler access, how AI surfaces distort your Search Console numbers, and which GEO tactics are defensible versus speculative. Use when: asked how to rank or get cited in AI search, AI Overviews, or chatbots, asked about GEO or answer-engine optimization, deciding whether to allow or block GPTBot, ClaudeBot, PerplexityBot, or Google-Extended, or diagnosing falling clicks while impressions hold steady."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "web"
  shareable-skills.tags: "browser"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-web-seo, ref-sp-web-marketing"
---

# AI Search Visibility

## Purpose

Give honest guidance on being found and cited by AI answer surfaces: what is mechanically true and
checkable, what it does to your measurements, and — the part most sources get wrong — how much of the
prevailing "GEO" advice is actually unvalidated guesswork that should not be shipped as a
recommendation.

## Verify before you assert — this file rots fastest

**Content below was verified 2026-07-12** and this is the fastest-moving material in the repo. Every
dated claim has a row in `./references/sources.md` giving its source, its verified date, and what
would invalidate it. Re-verification is cheap — one request tells you whether anything moved:

```sh
curl -s https://developers.google.com/search/updates/search_docs_updates.rss
```

Scan it for the documents in that table, re-fetch only those, and update the claim and its row.
Proof this is not theoretical: the first draft of this skill was superseded **within the same working
session** — Search Console shipped a Generative AI performance report and Google published an AI
optimization guide, neither of which existed in the docs the draft was built from.

## When to use this skill

- Asked how to "rank in ChatGPT", "show up in AI Overviews", or "get cited by AI".
- Asked about GEO (Generative Engine Optimization) or AEO (Answer Engine Optimization).
- Deciding whether to allow or block AI crawlers in `robots.txt`.
- Clicks are falling while impressions hold steady, or CTR dropped with no ranking change.
- A stakeholder is proposing an AI-search content strategy and wants it sanity-checked.

## The honest position, stated first

**For Google's AI surfaces, this is settled and documented.** Google states it directly:

> "There are no additional requirements to appear in AI Overviews or AI Mode, nor other special
> optimizations necessary."

Google has since published an **AI optimization guide**, and — read carefully — it does not walk that
back. It refines it: the guide's recommendations are ordinary SEO fundamentals (create non-commodity
content with a unique point of view, meet the technical requirements, follow crawling best practices,
provide good page experience, reduce duplicate content). It adds no AI-only lever. Two statements in
it are worth memorizing, because they kill the two most-sold GEO tactics outright:

> "Structured data isn't required for generative AI search, and there's no special schema.org markup
> you need to add."

and it **explicitly warns against "chunking" content** for machine extraction.

So when someone recommends restructuring your prose into "answer nuggets" for LLM retrieval, or
bolting on schema specifically to win AI citations, Google's own guidance says not to. That is not
your opinion against theirs — quote the guide.

Eligibility for AI Overviews and AI Mode is ordinary Search eligibility: be indexed, be eligible for
snippets, meet the normal requirements. There is no GEO lever for Google.

**For non-Google assistants, the honest answer is that nobody knows.** Retrieval and citation behavior
in ChatGPT, Claude, Perplexity, and the rest is proprietary, changes without notice, and is not
documented the way Google's crawl and index behavior is. Correlation studies on a moving target are
not mechanisms.

So the deliverable is: **do ordinary good SEO, control crawler access deliberately, and refuse to
invent the rest.**

If you cannot say *why* a tactic would work in terms of retrieval mechanics, it is a hypothesis, not
a recommendation. See the claim-tiering rule in `.agents/skills/ref-sp-web-seo/SKILL.md`.

Say this to users plainly. They are being sold certainty that does not exist, and an agent that plays
along is part of the problem.

## What is mechanically true

These are checkable, and they are the whole of the defensible baseline.

- **An AI system cannot cite what it cannot fetch.** Retrieval-augmented answers pull live pages. If
  the crawler is blocked, the page is not a candidate — full stop.
- **Most AI fetchers do not execute JavaScript.** Googlebot renders (slowly, via a queue); the
  general population of AI crawlers largely does not. Content that only exists after hydration is
  invisible to them. Server-render or statically render anything you want cited.
- **Structured data is *not* an AI-visibility lever, and Google says so.** Valid JSON-LD remains
  worth having — for rich results in ordinary Search — but do not sell it as a way to win AI
  citations, and never add schema *for* generative AI. There is no special markup for it.
- **The answer has to actually be on the page, in text.** A page whose substance is in an image, a
  video with no transcript, or a PDF behind a click cannot be quoted.
- **Being worth citing is not a trick.** Systems that cite sources are built to prefer ones that are
  accurate, specific, and attributable. That is the same target as `references/content-quality.md`
  in the SEO skill, not a separate discipline.

## Controlling AI crawler access

This is a real decision with a real trade-off, and the owner — not the agent — must make it.

| Crawler | Operator | What it actually does |
| --- | --- | --- |
| `GPTBot` | OpenAI | Crawls for **training** foundation models |
| `OAI-SearchBot` | OpenAI | Crawls for **ChatGPT search**. Block this and you disappear from ChatGPT's search answers |
| `ChatGPT-User` | OpenAI | **User-initiated** fetches — someone asked ChatGPT to look at a page. Not automatic crawling |
| `OAI-AdsBot` | OpenAI | Validates pages submitted as ChatGPT ads; not used for training |
| `ClaudeBot` | Anthropic | Crawling for Claude |
| `PerplexityBot` | Perplexity | Perplexity answers and citations |
| `Google-Extended` | Google | AI training and grounding in Google's *other* systems (e.g. Gemini) |
| `CCBot` | Common Crawl | A corpus many models train on |

**These are four different decisions, not one.** The most common error is a blanket `Disallow` for
every AI user-agent, which quietly does three unrelated things: opts out of model training (maybe
intended), removes you from ChatGPT search results (usually not intended), and **breaks a user's
ability to have the assistant read a page they explicitly pasted** (almost never intended —
`ChatGPT-User` is not a crawler; it is a person asking). Separate training from retrieval from
user-initiated fetching, and ask which the owner actually wants to stop.

The trade-off to put to the user: **blocking protects your content from being used; it also removes
you from the answers.** You cannot be cited by a system you refuse to let read you. There is no
setting that gives attribution without access.

**The `Google-Extended` misconception, which comes up constantly.** It does **not** control AI
Overviews or AI Mode, and it does **not** affect Search ranking. AI Overviews and AI Mode are part of
Search: they are governed by ordinary Googlebot access and the *snippet* controls. So:

- To stay out of AI Overviews and AI Mode, you use `nosnippet`, `data-nosnippet`, or `max-snippet`
  (or `noindex` to leave Search entirely). Those are the levers, and they cost you regular snippets
  too — there is no way to keep the blue-link snippet while opting out of the AI answer.
- Blocking `Google-Extended` affects Gemini and other Google systems, and changes nothing about your
  Search or AI Overview presence. Users block it expecting to escape AI Overviews; it does not work.

One more, before it bites: **`robots.txt` is a request, not enforcement.** Well-behaved crawlers
honour it; it stops nothing else. If the requirement is actually "prevent unauthorized use,"
`robots.txt` is not the control.

Audit the current state before advising: fetch `robots.txt` and report what is allowed and blocked
today. It is usually an accident — a copy-pasted default nobody chose.

## What AI answers do to your data

This is where AI search most affects an engineer's day-to-day, and it is documented rather than
speculative. From Google's Search Console documentation:

- **An AI Overview occupies a single position, and every link inside it is assigned that same
  position.** Average position now blends AI citations with classic blue links into one number that
  means less than it used to.
- **An impression counts only if the link is scrolled or expanded into view.** A page cited inside a
  collapsed AI Overview can be shown and register *neither* an impression nor a click.
- **A click still requires a click-through.** When the answer is on the results page, the need is met
  without a visit.

**The Generative AI performance report** now gives a dedicated view of AI Overviews and AI Mode — but
read its limits before you lean on it, because they are severe:

- **Impressions only.** No clicks. No position. So it tells you where you *appeared*, not what it
  earned you.
- **Not a separate channel.** The data is drawn from the Web search type and is **included in those
  totals**, not additive to them. Do not add it to your Web numbers; you will double-count.
- **Rolling out to a subset of properties.** If the user does not see it, that is expected — it does
  not mean they have zero AI impressions.
- Standard Performance-report limits still apply (1,000-row cap, preliminary data that shifts).

The practical consequence: you can now see AI impressions, and you still **cannot** measure what an
AI citation is worth, because clicks and position are not broken out. Anyone quoting an "AI Mode CTR"
is computing it from data Google does not provide.

**The diagnostic rule:** *impressions steady, clicks falling* is the signature of an AI answer
absorbing the visit — not a demoted page. Before anyone "fixes" a ranking problem, confirm the
problem exists. Chasing a phantom demotion wastes a quarter.

## Defaults

- **Lead with the epistemics.** State which of your recommendations are mechanical and which are
  speculative, every time. Do not launder a guess into a bullet point.
- **Do the boring baseline first:** crawlable by the fetchers the owner wants, server-rendered, valid
  structured data, answer present in text, genuinely accurate.
- **Refuse to ship unvalidated tactics as recommendations.** They can be framed as experiments with a
  defined measurement, never as "best practice."
- **Re-verify before asserting.** This area changes faster than any other in search. Anything here
  older than a few months should be checked against the operator's current documentation.

## Gotchas

- **"Zero-click" is not automatically a loss.** If the answer surface cites the brand and the user's
  need was informational, brand exposure happened. Whether that has value depends on the business
  model, and that is the user's call — but do not let anyone report it as pure traffic theft without
  examining what the query was worth.
- **Do not cloak for AI crawlers.** Serving different content to an AI fetcher than to users is the
  same category of mistake as cloaking for Googlebot, and Google's guidance already rejects the
  equivalent workaround (dynamic rendering) as a bad idea for exactly the complexity it creates.
- **Do not degrade the page for humans to court a machine.** Stripping nuance into "answer nuggets"
  because a blog post claimed LLMs prefer them trades a real audience for a hypothetical one — and
  Google's AI optimization guide explicitly warns against chunking content this way. The popular
  advice is not merely unproven here; it is contradicted.
- **Beware advice built on a vendor's own visibility product.** An agency selling AI-visibility
  tracking has an interest in AI visibility being both measurable and urgent.

## Validation

- Every recommendation is labelled mechanical (checkable) or speculative (a hypothesis to test).
- The `robots.txt` AI-crawler state was actually fetched, not assumed.
- Any claim about a specific AI surface's behavior was checked against that operator's current
  documentation, with the check date stated.
- No tactic is recommended on the strength of a correlation study alone.
- If clicks fell while impressions held, the AI-answer explanation was considered before a ranking
  diagnosis.

## References

**Read `./references/sources.md` before asserting anything dated.** It carries the per-claim
provenance table (claim → source → verified date → what would invalidate it), the crawler user-agent
sources, and the re-verification procedure. The cheap path is one request:

```sh
curl -s https://developers.google.com/search/updates/search_docs_updates.rss
```

Scan it for the documents in that table; re-fetch only what moved. For this skill also check the
Search Central blog (<https://developers.google.com/search/blog>) — AI features are announced there
before the reference docs are updated, so for AI surfaces the blog is a primary source, not a
backstop.

- The technical audit that underpins all of this: `.agents/skills/ref-sp-web-seo/SKILL.md`
- Traffic and conversion measurement: `.agents/skills/ref-sp-web-marketing/SKILL.md`
