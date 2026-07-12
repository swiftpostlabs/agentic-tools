# Sources and Verification

This is the **fastest-rotting** material in the `web` family. Everything here was true on the
verified date and may not be true now. Check before you assert.

**Last full verification: 2026-07-12.**

A worked demonstration of why this matters: the first draft of this skill was written and, within the
same working session, a freshness pass found two of its claims already superseded — Search Console had
gained a Generative AI performance report, and Google had published an AI optimization guide. Neither
existed in the docs the draft was built from. Assume the same is happening now.

## How to re-verify (cheapest path first)

1. **Check the documentation changelog** for the docs named below:

   ```sh
   curl -s https://developers.google.com/search/updates/search_docs_updates.rss
   ```

2. **Check the Search Central blog** — AI features are announced there before the reference docs are
   updated, so for this skill the blog is a *primary* source, not a backstop:
   <https://developers.google.com/search/blog>

3. **Fetch the flagged documents** and compare against the "Claim" column.

4. **For non-Google assistants there is no changelog.** OpenAI, Anthropic, and Perplexity publish
   crawler documentation but do not version it usefully. Re-fetch the operator's own docs (linked
   below) and treat anything you cannot confirm there as unverified.

5. **Update the claim, the row, and both last-verified dates**, and tell the user what moved.

## Provenance — Google surfaces

| Claim in SKILL.md | Source | Verified | Invalidated if |
| --- | --- | --- | --- |
| "There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary"; eligibility is ordinary Search eligibility; snippet controls (`nosnippet`, `data-nosnippet`, `max-snippet`) govern AI appearance | [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) | 2026-07-12 | Google introduces any AI-specific eligibility requirement or optimization lever — **this is the single most load-bearing claim in the skill** |
| "Structured data isn't required for generative AI search, and there's no special schema.org markup you need to add"; the guide warns against chunking content | [Guide to optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) | 2026-07-12 | Google recommends AI-specific markup, or reverses its position on chunking |
| `Google-Extended` governs AI training/grounding in Google's *other* systems; it does **not** control AI Overviews, AI Mode, or Search ranking | [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) | 2026-07-12 | `Google-Extended` gains control over Search AI surfaces |
| Generative AI performance report: **impressions only** (no clicks, no position), drawn from and **included in** the Web search type totals, rolling out to a subset of properties, 1,000-row cap | [Generative AI performance report](https://support.google.com/webmasters/answer/16984139) | 2026-07-12 | Clicks or position are added, it becomes a separate search type, or general availability is reached — **expect this one to change** |
| Inclusion settings for AI surfaces | [Search generative AI control](https://support.google.com/webmasters/answer/16908024) | 2026-07-12 | The control model changes |
| An AI Overview occupies one position with all links at that position; impressions require scroll/expand; clicks require click-through | [Impressions, position, and clicks](https://support.google.com/webmasters/answer/7042828) | 2026-07-12 | The counting rules change |

## Provenance — non-Google crawlers

The user-agent names in SKILL.md's crawler table. These are the operators' own docs; there is no
central registry, and operators add and rename crawlers without notice. **Re-fetch before advising a
`robots.txt` change** — a stale user-agent string in a `robots.txt` is a silent no-op.

| Crawler | Operator documentation | Verified |
| --- | --- | --- |
| `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `OAI-AdsBot` | <https://developers.openai.com/api/docs/bots> | 2026-07-12 |
| `ClaudeBot` | <https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler> | 2026-07-12 |
| `PerplexityBot` | <https://docs.perplexity.ai/guides/bots> | 2026-07-12 |
| `Google-Extended` (token reference) | <https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers> | 2026-07-12 |
| `CCBot` | <https://commoncrawl.org/ccbot> | 2026-07-12 |

**Two live examples of why this table exists**, both found while writing it:

- OpenAI's bot documentation **moved**. `platform.openai.com/docs/bots` now 301s to the URL above. A
  redirect today is a 404 tomorrow.
- Google's crawler documentation **moved** out of Search Central into a separate "Crawling
  Infrastructure" section (`/crawling/docs/...`). The old
  `search/docs/crawling-indexing/overview-google-crawlers` page still returns 200 but **does not
  document `Google-Extended` at all** — a source that resolves is not a source that supports the
  claim. Check the content, not the status code.

The user-agent tokens originally came from general knowledge and were only then checked against the
operator docs — which is how the incomplete list (missing `ChatGPT-User` and `OAI-AdsBot`) got caught.
**Re-fetch these before advising any `robots.txt` change.** A stale or misspelled user-agent in a
`robots.txt` is a silent no-op: it blocks nothing and no one tells you.

## What does not rot

The epistemic content — claim-tiering, refusing to ship unvalidated tactics as recommendations,
labelling mechanical versus speculative, and the diagnostic that *impressions steady + clicks falling*
points at an AI answer rather than a demotion. That is method. It survives whatever Google ships next,
and it is the reason this skill stays useful between verifications.
