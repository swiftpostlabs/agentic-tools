---
name: ref-sp-web-seo-ai
description: "Visibility in AI answers — Google AI Overviews and AI Mode, and assistants like ChatGPT, Claude, and Perplexity: how they retrieve and cite pages, how to control AI crawler access, how AI surfaces distort your Search Console numbers, and which GEO advice is defensible versus speculative. Use when: asked how to rank, appear, or get cited in AI search, AI Overviews, or chatbots; asked about GEO, AEO, or answer-engine optimization; deciding whether to allow or block AI crawlers (GPTBot, ClaudeBot, Claude-User, PerplexityBot, Google-Extended, CCBot), or whether to opt out of AI training; writing robots.txt rules for AI bots; or diagnosing falling clicks while impressions hold steady."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "web"
  shareable-skills.tags: "browser, verification"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-web-seo, ref-sp-web-marketing, ref-sp-dev-playwright-cli"
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
- Deciding whether to allow or block AI crawlers in `robots.txt`, or **whether to opt out of AI
  training** — three separate decisions that most people collapse into one.
- Clicks are falling while impressions hold steady, or CTR dropped with no ranking change.
- A stakeholder is proposing an AI-search content strategy and wants it sanity-checked.

**Route elsewhere when:** the question is ordinary technical SEO — indexing, canonicals, rendering,
Core Web Vitals (`.agents/skills/ref-sp-web-seo/SKILL.md`). Note that per Google *and* Bing, ordinary
SEO **is** the AI-visibility lever, so that skill will often be the real answer.

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

**Bing says the same thing, independently — and that matters.** Google describing its own product is
an interested party. But Microsoft's Webmaster Guidelines open with a section titled *"SEO
Fundamentals Still Apply to Grounding and AI Experiences"*:

> "Bing and Copilot search experiences rely on the same core crawling, indexing, and ranking
> foundation as traditional search. SEO best practices that support discovery, indexing accuracy, and
> content clarity also support eligibility for AI-generated experiences, grounding results, and
> citations."

Two independent search engines, each with its own AI answer surface, both say the lever is ordinary
SEO. That is as close to settled as this field gets. Bing also lists *"hiding critical content behind
client-side rendering"* under **Avoid**, warning that content it cannot reliably render "may not be
indexed or selected for grounding results" — which is the one genuinely load-bearing technical
requirement, confirmed twice.

**For non-Google assistants, the honest answer is that nobody knows.** Retrieval and citation behavior
in ChatGPT, Claude, Perplexity, and the rest is proprietary, changes without notice, and is not
documented the way search crawling and indexing is. Correlation studies on a moving target are not
mechanisms.

So the deliverable is: **do ordinary good SEO, control crawler access deliberately, and refuse to
invent the rest.**

If you cannot say *why* a tactic would work in terms of retrieval mechanics, it is a hypothesis, not
a recommendation. See the claim-tiering rule in `.agents/skills/ref-sp-web-seo/SKILL.md`.

Say this to users plainly. They are being sold certainty that does not exist, and an agent that plays
along is part of the problem.

## How to read GEO advice

You will be handed GEO articles, decks, and vendor reports. Judge them with these four questions,
which are drawn from actually reading the leading ones rather than from suspicion.

1. **Who profits if this is true?** The most-cited GEO evidence is Semrush's "AI Visibility Index" —
   published by a company that *sells AI-visibility monitoring*. That does not make it false; it means
   it is not disinterested, and it cannot be the only source for a recommendation.
2. **Does the article's own data undercut its advice?** Frequently, yes. One leading GEO piece reports
   that **40–60% of cited sources change from month to month**, and then claims "patterns emerged."
   Both cannot be true. That volatility figure is the single most useful number in the GEO literature,
   and it argues *against* the article carrying it: if more than half the citations churn monthly, you
   cannot attribute a change to your optimization, and you cannot tell success from noise.
3. **Is there a mechanism, or only a correlation?** GEO articles theorize about "extractability" and
   "entity clarity" and assert these "likely" drive citations. No mechanism, no causal evidence.
4. **Read the caveat the author already wrote.** They are usually honest in the fine print: "these
   principles increase your probability… they don't guarantee it", "what works today may shift as
   models update." Quote that back to anyone selling the headline.

Prediction pieces ("what SEO leaders expect in 2026") are tier-4 by construction: forward-looking
opinion, framed as "will be," with the bullish claims foregrounded and the cautions buried. Treat them
as a map of what people are *excited* about, never as input to a recommendation.

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

**Every major operator splits its bots into three jobs.** Learn the pattern, not the list — the names
change, the three jobs do not. These are **three separate decisions**, and conflating them is the most
common and most damaging mistake in this whole area.

| Job | What blocking it costs you | OpenAI | Anthropic | Perplexity | Google | Common Crawl |
| --- | --- | --- | --- | --- | --- | --- |
| **Training** — builds the model | Your content is not used to train. Costs you nothing in visibility. | `GPTBot` | `ClaudeBot` | — | `Google-Extended` | `CCBot` |
| **Search / retrieval** — indexes you so the assistant can cite you | **You disappear from that assistant's answers.** Usually not what the owner wants. | `OAI-SearchBot` | `Claude-SearchBot` | `PerplexityBot` | `Googlebot` (AI Overviews and AI Mode ride on ordinary Search) | — |
| **User-initiated** — a person asked the assistant to read *this page* | **You break a user who explicitly pasted your link.** Almost never intended. | `ChatGPT-User` | `Claude-User` | `Perplexity-User` | — | — |

(OpenAI also runs `OAI-AdsBot`, which validates pages submitted as ChatGPT ads and is not used for
training.)

**The default mistake:** a blanket `Disallow` for every AI user-agent. It reads as one decision and is
actually three — opting out of training (often intended), vanishing from AI answers (usually not), and
breaking users who deliberately handed the assistant your URL (essentially never). Ask the owner which
of the three they want, then write the rules for that.

**Two hard limits on what `robots.txt` can do here:**

- **`robots.txt` is a request, not enforcement** (RFC 9309). Well-behaved crawlers honour it; nothing
  else does. If the requirement is really "prevent unauthorized use," this is not the control — and
  saying otherwise gives the owner false comfort.
- **User-initiated fetchers may ignore it by design.** Perplexity documents that `Perplexity-User`
  "generally ignores robots.txt rules" because a human initiated the request. So you **cannot** rely
  on `robots.txt` to stop a person pasting your URL into an assistant. Do not promise an owner that
  you can.

**Verify the tokens before you write them.** These names change and operators add new bots without
announcement — Anthropic runs three where most people know one. A misspelled or retired user-agent in
a `robots.txt` is a silent no-op: it blocks nothing and nobody tells you. Current tokens and their
sources are in `./references/sources.md`.

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
