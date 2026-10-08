# Semantic structure: elements, landmarks, headings

Load when choosing between a `<div>` and a real element, adding landmarks, fixing heading order, or
answering "does semantic HTML matter?"

## The argument, in one line

A native element carries role, focusability, keyboard behaviour, and state to assistive technology
for free. A `<div>` carries none of it, and every capability you want back has to be rebuilt in ARIA
and JavaScript — correctly, and kept correct.

This is the same rule as **"no ARIA is better than bad ARIA"** in the main skill, viewed from the
markup side rather than the attribute side.

## Choose the element for its behaviour, not its appearance

| Need | Use | Not |
| --- | --- | --- |
| Runs a function on the page | `<button>` | `<div onclick>`, `<a href="#">` |
| Navigates somewhere | `<a href>` | `<button>` + `router.push` |
| Groups form controls | `<fieldset>` + `<legend>` | `<div>` + a styled heading |
| Labels a control | `<label for>` | placeholder text, adjacent `<span>` |
| Expandable disclosure | `<details>`/`<summary>` | `<div>` + toggle state |
| Modal dialog | `<dialog>` | `<div role="dialog">` + focus-trap code |
| Tabular data | `<table>`, `<th scope>` | nested `<div>`s with grid CSS |
| Progress or a value in a range | `<progress>`, `<meter>` | a styled `<div>` with a width |

The three that cause the most real damage:

- **`<div onclick>`** — not focusable, not keyboard-operable, announced as nothing. It fails
  keyboard operability outright.
- **`<a>` used as a button** — announced as a link, so users expect navigation; `href="#"` also
  moves focus and can change the URL.
- **Placeholder as label** — disappears on input, is often too low-contrast, and is not reliably
  announced.

## Landmarks

Landmark elements let screen-reader users jump directly to a page region instead of tabbing through
it. The mapping is automatic — the element *is* the landmark, no ARIA needed:

| Element | Landmark role |
| --- | --- |
| `<main>` | `main` — exactly one per page |
| `<nav>` | `navigation` |
| `<header>` (page-level) | `banner` |
| `<footer>` (page-level) | `contentinfo` |
| `<aside>` | `complementary` |
| `<form>` with an accessible name | `form` |
| `<section>` with an accessible name | `region` |

Notes that matter in practice:

- **`<header>` and `<footer>` only map to `banner`/`contentinfo` at page level.** Inside an
  `<article>` or `<section>` they are generic. This surprises people.
- **`<section>` without an accessible name is not a landmark** — it is generic. Give it
  `aria-labelledby` pointing at its heading, or use a plain `<div>`. A page full of anonymous
  `<section>`s adds nothing.
- **Name repeated landmarks.** Two `<nav>`s need `aria-label="Primary"` and `aria-label="Footer"`,
  or the user gets "navigation, navigation".
- **One `<main>`.** More than one defeats the purpose of the skip target.

A **skip link** to `<main>` remains worth having for keyboard users who are not using a screen
reader, since they get no landmark navigation.

## Headings

Headings are the primary navigation mechanism inside a page for screen-reader users — the equivalent
of the layer-cake scanning pattern that sighted readers use (see
the `references/content-readability.md` of `ref-sp-ux-design`).

- **Do not skip levels going down.** `h2` → `h4` leaves a gap that reads as missing content. Going
  back up any distance is fine.
- **Heading level is structure, not size.** Style with CSS. Choosing `h4` because you want smaller
  text is the single most common heading defect.
- **Every landmark region should be reachable from a heading**, and headings should describe the
  content that follows rather than tease it.
- **Do not use a heading for emphasis** or a bold paragraph as a heading. Both break the outline.

WCAG-wise: heading *presence and usefulness* is SC 2.4.6 (Headings and Labels, AA) and SC 2.4.10
(Section Headings, AAA); values and exact wording in `./thresholds.md`. Level-skipping itself is
not a WCAG failure — it is a usability defect that automated checkers flag anyway.

## What semantic markup does *not* buy you

Be straight about this, because the SEO folklore is thick:

- **It is not a ranking factor.** Google has said so explicitly and repeatedly, including that
  fixing heading hierarchy will not improve rankings.
- **It barely helps AI content extraction.** The most widely deployed extractor gives `<article>`
  and `<main>` no bonus at all and weights class/id names and link density far more heavily. The one
  real tag effect is that `<aside>` and `<footer>` get stripped — which is an argument for not
  hiding content in them, not an argument for `<main>`. Full treatment in
  `ref-sp-web-seo-ai` (its `references/extraction.md`).

**The honest case for semantic HTML is accessibility and maintainability.** Both are sufficient. It
does not need a fake SEO justification, and offering one damages the real argument when someone
checks it.

## Checking it

```bash
# The accessibility tree is what assistive tech consumes — an element with
# no accessible name is a finding
yarn playwright snapshot

# Landmark and heading inventory
yarn playwright eval "() => ({
  landmarks: [...document.querySelectorAll('main,nav,header,footer,aside,section[aria-label],section[aria-labelledby],form[aria-label]')].map(e => e.tagName + (e.getAttribute('aria-label') ? ':' + e.getAttribute('aria-label') : '')),
  headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.tagName + ' ' + h.innerText.slice(0, 50)),
  clickableDivs: document.querySelectorAll('div[onclick],span[onclick]').length
})"
```

Read the heading list top to bottom: it should work as an outline of the page. If it does not, the
structure is wrong regardless of what any checker says.
