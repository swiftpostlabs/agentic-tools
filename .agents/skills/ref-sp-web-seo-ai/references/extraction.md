# How AI systems actually read a page: extraction, not tags

Load when someone asks whether semantic HTML, `<article>`, `<main>`, or heading structure helps AI
visibility — or when a page's content is being ingested wrongly and nobody knows why.

## The pipeline nobody accounts for

An AI system almost never sees your HTML. Between fetch and model there is a **content extraction**
step — sometimes called boilerplate removal — that strips navigation, sidebars, footers, ads, and
comment threads down to a main-content text block. Everything downstream reasons over *that block*,
not your page.

So the question "does semantic HTML help AI" is really: **does it change what survives extraction?**
Sometimes. Much less than people assume, and not through the tags they name.

## What the extractors actually score

Mozilla's Readability (Firefox Reader Mode, and the basis of a large share of extraction tooling) is
the most inspectable case — the algorithm is the source of truth for its own behaviour.

**Tags it scores:** `SECTION, H2, H3, H4, H5, H6, P, TD, PRE`.

**Base content score by tag:**

| Tag | Score |
| --- | --- |
| `DIV` | **+5** |
| `PRE`, `TD`, `BLOCKQUOTE` | +3 |
| `ADDRESS`, `OL`, `UL`, `DL`, `DD`, `DT`, `LI`, `FORM` | −3 |
| `H1`–`H6`, `TH` | −5 |

Five things follow, and four of them contradict the usual advice:

1. **`<article>` and `<main>` receive no tag-level bonus.** They are scored only through their
   descendants. Wrapping content in `<main>` does not, by itself, make it more extractable.
2. **`<div>` outscores every semantic container.** A `<div>` dense with paragraphs beats an
   `<article>` dense with links.
3. **The `article`/`main` signal is a class/id match, not a tag match.** Readability's
   "maybe a candidate" test runs `/and|article|body|column|content|main|mathjax|shadow/i` against
   **class and id attributes**. Its "unlikely candidate" test runs
   `/footer|sidebar|social|comment|banner|breadcrumbs|sponsor|extra|…/i` the same way.
4. **Class weight dominates tag choice** — positive class patterns add **+25**, negative subtract
   **−25**, against tag bases of ±5. Naming a real content wrapper `.comment-body` or
   `.article-sidebar` is a bigger risk than choosing the wrong element.
5. **Link density is the strongest single lever.** The final score is scaled by `(1 − linkDensity)`,
   and the algorithm's own comment sets the bar: "Good content should have a relatively small link
   density (5% or less)." A content region that is mostly links reads as navigation and is dropped.

**The one real tag effect:** `<aside>` and `<footer>` are *conditionally removed* during article
preparation. This is the strongest practical argument for semantic elements — not that `<article>`
attracts attention, but that `<aside>` and `<footer>` repel it. Substantive content placed in either
can be deleted before a model ever sees the page.

## Extraction is lossy no matter what you do

trafilatura, among the most accurate open-source extractors, benchmarked on 750 documents
(2022-05-18):

| Tool | Precision | Recall | F1 |
| --- | --- | --- | --- |
| trafilatura (standard) | 0.914 | 0.904 | **0.909** |
| trafilatura (precision mode) | 0.932 | 0.874 | 0.902 |
| goose3 | 0.934 | 0.690 | — |

Read the recall column: the best general-purpose extractor still **loses around 10% of main
content**. There is no markup that makes extraction perfect, so the winning structure is the one
that does not require cleverness — real prose in real paragraphs, server-rendered, low link density.

## What to actually tell someone

**Defensible:**

- Do not put substantive content in `<aside>` or `<footer>`. It can be stripped.
- Keep link density low in the content region — under ~5% is the bar the algorithm sets.
- Do not give content wrappers class or id names matching `comment`, `sidebar`, `footer`, `social`,
  `banner`, `sponsor`, or `breadcrumbs`. This outweighs tag choice.
- Server-render it. (Covered in the main skill: most AI fetchers do not execute JavaScript.)
- Valid HTML extracts better than broken HTML; trafilatura names invalid markup as a difficulty
  source.

**Not defensible, and worth correcting on sight:**

- "Use `<article>` and `<main>` so AI can find your content." Readability gives neither a bonus.
- "Semantic HTML improves rankings." Google says it does not — see `./sources.md`.
- "Vendor X's pipeline privileges tag Y." No AI vendor documents its extraction internals. Anyone
  asserting this is guessing.

## Why semantic markup is still worth doing

The extraction argument is weak. The other two arguments are strong, and neither is about AI:

- **Accessibility.** Native elements carry role, focusability, and keyboard behaviour that a `<div>`
  does not. See `ref-sp-ux-accessibility` (its `references/semantic-structure.md`).
- **Maintainability.** Structure that names itself survives redesigns.

Recommend semantic HTML on those grounds. Do not sell it as an AI-visibility lever — that is the
same error as selling schema markup for AI citations, which this skill already refuses to do.

## Staleness

The Readability constants above were read from the algorithm on **2026-08-02**. It is actively
developed and these are exactly the kind of values that drift. Re-read the source before treating
any specific number as current.
