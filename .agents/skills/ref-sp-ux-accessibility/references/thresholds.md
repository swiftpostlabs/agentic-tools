# WCAG 2.2 thresholds — full reference

Verified 2026-08-02 against <https://www.w3.org/TR/WCAG22/> and the
[quick reference](https://www.w3.org/WAI/WCAG22/quickref/).

Load this when you need the exceptions and the exact wording, not just the number.

## Contrast

### 1.4.3 Contrast (Minimum) — AA

Text and images of text have a contrast ratio of at least **4.5:1**, except:

- **Large text** — at least **3:1**. Large is ≥ 18 pt, or ≥ 14 pt bold (≈24 px / ≈18.66 px).
- **Incidental** — inactive components, pure decoration, invisible text, or text in a picture that
  contains other significant visual content.
- **Logotypes** — text that is part of a logo or brand name.

### 1.4.11 Non-text Contrast — AA

**3:1** against adjacent colour for:

- **UI components** — visual information required to identify a control and its state (borders of
  inputs, the checked mark of a checkbox, focus indicators).
- **Graphical objects** — parts of graphics required to understand the content (chart series,
  meaningful icons).

Not required for decoration, or where a particular presentation is essential.

### 1.4.6 Contrast (Enhanced) — AAA

**7:1** normal text, **4.5:1** large text. Same incidental/logotype exceptions.

## Text presentation

### 1.4.4 Resize Text — AA

Text can be resized up to **200%** without assistive technology and without loss of content or
functionality. Exception: captions and images of text.

### 1.4.10 Reflow — AA

Content can be presented without loss of information or functionality, and without two-dimensional
scrolling, at:

- **320 CSS px** width, for content that scrolls vertically;
- **256 CSS px** height, for content that scrolls horizontally.

320 px is 1280 px at 400% zoom — this criterion is really about zoom, not about phones. Exception:
parts of content that genuinely require two-dimensional layout (data tables, maps, code, video).

### 1.4.12 Text Spacing — AA

No loss of content or functionality when the **user** sets all of:

| Property | Value |
| --- | --- |
| Line height | ≥ **1.5×** font size |
| Spacing after paragraphs | ≥ **2×** font size |
| Letter spacing | ≥ **0.12×** font size |
| Word spacing | ≥ **0.16×** font size |

**Direction of the requirement:** this is a *resilience* criterion. You are not required to ship
these values. You are required not to break when they are imposed. Fixed-height containers with text
inside are the classic failure.

### 1.4.8 Visual Presentation — AAA

For blocks of text, a mechanism is available to achieve all of:

- Foreground and background colours user-selectable.
- Width **≤ 80 characters** (≤ 40 for CJK).
- Text not justified (not aligned to both margins).
- Line spacing ≥ **1.5** within paragraphs; paragraph spacing ≥ **1.5×** the line spacing.
- Resizable to **200%** without horizontal scrolling.

The ≤80-character measure is the only *normative* line-length number in WCAG. Everything else about
measure is practitioner research — see
`ref-sp-ux-design` (its `references/typography.md`).

## Targets

### 2.5.8 Target Size (Minimum) — AA

Targets are at least **24 × 24 CSS px**, except:

1. **Spacing** — undersized targets whose 24 px-diameter circles do not intersect any other target's
   circle.
2. **Equivalent** — the same function is available through another target that does meet the size.
3. **Inline** — the target is in a sentence, or its size is otherwise constrained by the line of text.
4. **User agent control** — size is determined by the user agent and not modified by the author.
5. **Essential** — a particular presentation is legally required or essential to the information.

### 2.5.5 Target Size (Enhanced) — AAA

At least **44 × 44 CSS px**, with equivalent/inline/user-agent/essential exceptions.

44 px is also the long-standing Apple HIG figure and 48 dp the Material figure; those are vendor
conventions that happen to align with the AAA criterion, not independent evidence.

## Focus

### 2.4.7 Focus Visible — AA

Any keyboard-operable interface has a mode of operation where the focus indicator is visible.
Removing outlines without replacing them fails this.

### 2.4.11 Focus Not Obscured (Minimum) — AA

When a component receives keyboard focus, it is not **entirely** hidden by author-created content.
Sticky headers/footers, cookie banners, and chat widgets are the usual failures.

### 2.4.12 Focus Not Obscured (Enhanced) — AAA

**No part** of the focused component is hidden.

### 2.4.13 Focus Appearance — AAA

The focus indicator:

- covers at least the area of a **2 CSS px** thick perimeter of the unfocused component, and
- has a contrast ratio of at least **3:1** between focused and unfocused states.

## Motion and transient content

### 2.3.1 Three Flashes or Below Threshold — A

Nothing flashes more than **three times per second**, unless below the general and red flash
thresholds. This one is a seizure risk, not a comfort preference.

### 2.3.3 Animation from Interactions — AAA

Motion animation triggered by interaction can be disabled, unless essential. In practice: honour
`prefers-reduced-motion`.

### 1.4.13 Content on Hover or Focus — AA

Additional content triggered by hover or focus must be:

- **Dismissible** without moving pointer or focus,
- **Hoverable** — the pointer can move onto it without it disappearing,
- **Persistent** until dismissed, invalid, or the trigger is removed.

Tooltips and hover menus fail this constantly.

## Colour and information

### 1.4.1 Use of Color — A

Colour is not used as the **only** visual means of conveying information, indicating an action,
prompting a response, or distinguishing a visual element.

Level A. Non-negotiable. Chart legends keyed only by colour, required fields marked only in red, and
link text distinguished from body text only by hue all fail.
