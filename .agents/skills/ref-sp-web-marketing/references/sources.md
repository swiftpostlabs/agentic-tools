# Sources and Verification

Provenance for `../SKILL.md`, organized by the section it supports. Most of this skill is **method**
(attribution is lossy; sparse data is noise), which does not rot. The parts that *are* empirical are
below, with the study behind them.

**Last verified: 2026-07-12.**

## Section: "Direct" is not a channel

The claim that Direct is a bucket of lost origins is not a heuristic — it has been measured.

**Primary evidence — SparkToro / Steve Lamar controlled experiment.** Design: 16 unique tracking URLs
across 11 social networks, GA4 and UA installed, ~100 recruited participants visiting from specified
networks over 10 days, 1,113 total visits. Measured how often each network passes referrer data.

| Source network | Visits arriving with **no** referral data (logged as Direct) |
| --- | --- |
| TikTok, Slack, Discord, Mastodon, WhatsApp | **100%** |
| Facebook Messenger | 75% |
| Instagram DMs | 30% |
| LinkedIn (public posts) | 14% |
| Pinterest | 12% |

- <https://sparktoro.com/blog/new-research-dark-social-falsely-attributes-significant-percentages-of-web-traffic-as-direct/>

**Read the limitation honestly, and pass it on.** The study measures how often a *given network* loses
referrer data. It does **not** establish what share of any site's Direct traffic is dark social — that
is the reverse inference and the study does not support it. So the defensible statement is *"traffic
from these networks is systematically misfiled as Direct"*, **not** *"N% of your Direct is dark
social."* Do not quote a percentage of Direct that nobody measured. (SparkToro notes its own site
shows ~95% Direct and says plainly that this misrepresents reality.)

## Section: Zero-click and platform reality

- ~60% of Google searches end without a click; a further ~30% of clicks go to Google-owned properties.
- One-third to one-half of internet users run an ad blocker, which blocks tracking outright.
- Recommends abandoning click-level attribution for lift/leads/revenue measured over time.
- <https://sparktoro.com/blog/when-attribution-is-a-fools-errand-zero-click-marketing-is-the-way/>

**Provenance caveat:** SparkToro sells audience-research tooling and its founder has a public position
in favour of "zero-click marketing." The dark-social experiment above is a real controlled study and
should be treated as tier-2 evidence; the zero-click *percentages* are secondary figures reported by
an interested party, and should be cited as "SparkToro reports…" rather than as settled fact. Apply
the same tiering to them that `ref-sp-web-seo` applies to vendor SEO claims — a vendor being right
does not make them disinterested.

## Section: Recovering attribution / channel definitions

How the analytics vendor defines its channels determines what the report can mean. Read the platform's
own channel definitions before interpreting anyone's dashboard — "Direct" and "Organic Social" are
vendor constructs, not facts about the world.

- Google Analytics default channel group definitions —
  <https://support.google.com/analytics/answer/9756891>
- Campaign URL / UTM parameters — the only links whose origin you control —
  <https://support.google.com/analytics/answer/10917952>

## Section: Is it signal, or is it noise?

This section is **method, not citation.** Zero-inflation, denominators moving under a rate,
seasonality confounding a six-month window, and single-observation campaign spikes are ordinary
statistical reasoning, not marketing facts. They do not go stale and they need no vendor to confirm
them. If a claim in that section ever needs defending, defend it with the arithmetic, not a link.

## What is deliberately not sourced here

Social and video platform strategy (TikTok/YouTube as discovery surfaces, creator-led ad formats,
zero-click publishing) is **out of scope for this skill** and mostly tier-3/tier-4 material. It is
parked in the tracked task for a future `ref-sp-web-social-media` skill, along with the Swedish
Internet Foundation's *Svenskarna och internet* report
(<https://svenskarnaochinternet.se/rapporter/svenskarna-och-internet-2025/english/>), which is real
survey data and would be that skill's strongest source.
