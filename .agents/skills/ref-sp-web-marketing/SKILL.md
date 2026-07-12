---
name: ref-sp-web-marketing
description: "Measure web marketing honestly: why the 'Direct' channel is a garbage bucket, how dark social destroys referrer data, when a conversion-rate difference is noise rather than signal, and how to recover attribution you cannot track. Use when: reading a traffic, channel, or conversion report, being asked which channel is working or where to spend budget, interpreting a conversion-rate change or a campaign result, analyzing analytics from Google Analytics, Wix, Shopify, or similar, or judging whether a marketing claim is supported by the data behind it."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "web"
  shareable-skills.tags: "verification"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-web-seo, ref-sp-web-seo-ai"
---

# Web Marketing Measurement

## Purpose

Read marketing and conversion data without lying to yourself. Most bad marketing decisions are not
failures of strategy — they are confident conclusions drawn from data that could not support them.
This skill is about knowing which conclusions the data can actually carry.

## When to use this skill

- Reading a traffic, channel, or conversion report.
- Asked "which channel is working" or "where should we spend."
- Interpreting a conversion-rate change, a campaign result, or a traffic spike.
- Analyzing analytics exports from Google Analytics, Wix, Shopify, or similar.
- Sanity-checking a marketing claim, a dashboard, or an agency's report.

## "Direct" is not a channel

Analytics shows a row called Direct. It is not a traffic source — it is the bucket for every visit
whose origin was **lost**. A visit lands there when the referrer is missing, which happens when a link
is shared in a messenger or DM ("dark social"), opened from a native app, an email client, or a PDF,
pasted into a note or a ticket, stripped by a privacy setting — or, sometimes, genuinely typed from
memory.

**This is measured, not assumed.** A SparkToro controlled experiment (16 tracking URLs, 11 networks,
~100 participants, 1,113 visits) found how much referrer data each network destroys:

| Source | Visits arriving with no referrer, logged as Direct |
| --- | --- |
| TikTok, Slack, Discord, Mastodon, WhatsApp | **100%** |
| Facebook Messenger | 75% |
| Instagram DMs | 30% |
| LinkedIn public posts | 14% |
| Pinterest | 12% |

A link shared on TikTok or WhatsApp arrives *indistinguishable from someone typing your URL from
memory.* That is the whole problem in one sentence.

**But do not over-claim in the other direction either.** That study measures what each *network*
loses. It does **not** tell you what share of *your* Direct is dark social — nobody has measured that
for your site. So the defensible statement is "traffic from these networks is systematically misfiled
as Direct," never "N% of your Direct is dark social." See `./references/sources.md`.

**The invalid inference to refuse, out loud:** *"Direct is our biggest channel, so we have strong
brand recognition."* Direct conflates people who typed your URL from memory (real brand strength)
with people who clicked a link a friend sent them (someone else's referral, invisible to you). Those
are opposite conclusions about the business, and analytics cannot distinguish them. Anyone reasoning
from the size of Direct is reasoning from a bucket labelled "unknown."

The corollaries:

- **Never rank channels by volume when Direct is one of the rows.** It is not like-for-like.
- **A Direct spike is an unexplained event, not an achievement.** Something happened somewhere you
  cannot see. Go find out what; do not book it as a win.
- **Under-crediting is systematic, not random.** Word-of-mouth and social sharing are the channels
  most likely to be misfiled as Direct, so they are the channels most likely to be underfunded by a
  team that trusts its dashboard.

## Recovering attribution you cannot track

Since the data cannot be repaired after the fact, collect it at the point of conversion.

- **Self-reported attribution is the primary tool.** A "How did you hear about us?" field on the
  checkout, signup, or lead form. It is crude, it is biased by recall, and it is *still* the most
  reliable signal you have about the channels analytics cannot see. Use a short list of options plus
  a free-text box.
- **Use UTM parameters on every link you control** so at least your own campaigns are not misfiled.
  You cannot tag a link someone else shares, which is exactly the point.
- **Triangulate rather than attribute.** Compare self-reported answers against the analytics channel
  mix. Where they disagree, the disagreement is the finding.
- **State the uncertainty in the report.** "We cannot attribute roughly N% of conversions" is a
  finding, not a failure. Hiding it to produce a clean pie chart is the failure.

## Is it signal, or is it noise?

The most common analytical error in small-business marketing data is drawing conclusions from too
few events. Apply these checks before recommending an action.

- **Count the conversions, not the visitors.** A report can have thousands of sessions and still be
  built on a few hundred conversions. The conversions are the sample.
- **Watch for zero-inflation.** If most days have zero conversions, day-of-week and hour-of-day
  patterns are almost certainly noise. "Tuesdays convert best" drawn from a few hundred conversions
  across six months, where three quarters of days had none, is an artefact.
- **A handful of months cannot separate a trend from seasonality.** A declining conversion rate over
  six months that includes a holiday period is not evidence of decline.
- **Rate changes hide their denominators.** Conversion rate can fall while conversions rise, simply
  because top-of-funnel traffic grew and brought in browsers rather than buyers. That is often
  *success*, misread as failure. Always look at numerator and denominator separately.
- **A spike aligned with a post is correlation.** It is worth investigating, and it is not proof —
  especially with one observation per campaign.

**The rule:** before recommending an action based on a difference, ask what else would have to be
true for the difference to be chance. If you cannot rule chance out, say the data is not yet
conclusive and state what would make it so — usually more time or more events.

## Zero-click and platform reality

Platforms suppress outbound links to keep users on-platform, and answer surfaces increasingly satisfy
the need without a visit. SparkToro reports that roughly **60% of Google searches end without a
click**, with a further ~30% of clicks going to Google-owned properties, and that **a third to a half
of users run an ad blocker** that prevents tracking outright. Cite those as *"SparkToro reports"* —
they come from an interested party (see `./references/sources.md`), unlike the dark-social experiment
above, which is a controlled study.

Two consequences worth stating to a stakeholder:

- **Click-through is a shrinking and biased measure of reach.** Impressions and engagement on the
  platform may be doing work that never appears in your analytics.
- **That is not permission to stop measuring.** It is a reason to measure differently — self-reported
  attribution, branded-search volume, and direct business outcomes — rather than to accept
  unfalsifiable claims about "brand awareness."

For how AI answer surfaces specifically distort search metrics, use
`.agents/skills/ref-sp-web-seo-ai/SKILL.md`.

## Defaults

- **Report the limits with the result, in the same breath.** A finding whose caveats are in an
  appendix will be quoted without them.
- **Prefer a boring true statement to an interesting false one.** "Direct is 40% and we do not know
  what it is" beats a confident channel attribution.
- **Separate what happened from why it happened.** Analytics is good at the first and mostly
  incapable of the second.
- **When asked where to spend, say what the data can and cannot justify.** Sometimes the honest
  recommendation is to instrument first and decide next quarter.

## Gotchas

- **Bot and internal traffic inflate everything** if unfiltered. Check before analyzing.
- **"Unique visitors" is platform-specific and often wrong.** Cookie-based counts fragment one person
  across devices and browsers. Do not treat the number as a person count.
- **Attribution windows silently determine the answer.** Last-click will credit the channel that
  closed; first-click will credit the one that introduced. Neither is true; both are conventions. Say
  which one produced the number.
- **An analysis that only covers part of the funnel cannot rank channels end-to-end.** If you have
  visits and purchases but nothing between, you cannot say where people dropped.
- **The industry-average benchmark is a trap.** "Our 5% conversion rate matches the industry average"
  compares your business to an aggregate of businesses that are not yours. It justifies nothing.

## References

- `./references/sources.md` — provenance by section: the SparkToro dark-social experiment and its
  numbers, the zero-click figures and why they carry a vendor caveat, and the analytics channel
  definitions. Read it before quoting any percentage.
- `.agents/skills/ref-sp-web-seo-ai/SKILL.md` — how AI answer surfaces distort search metrics.
- `.agents/skills/ref-sp-web-seo/SKILL.md` — the claim-tiering rule this skill also applies.

## Validation

Before delivering a marketing analysis:

- The size of Direct is reported as unknown-origin, never as brand strength.
- The conversion count (not the visitor count) is stated, and any sparsity is flagged.
- Seasonality and window length are addressed explicitly.
- Every recommendation names the evidence that supports it and the uncertainty that remains.
- Anything the data cannot answer is listed as such, with what it would take to answer it.
