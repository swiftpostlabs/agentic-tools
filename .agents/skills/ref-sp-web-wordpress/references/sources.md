# Sources and Verification

Provenance for `../SKILL.md`, organized by section. Nearly everything here is **tier-1: WordPress's own
developer handbook**, which is the right authority for how to build on WordPress — and, unlike the SEO
domain, WordPress is not an interested party describing a competitor's behaviour. It is describing its
own documented API.

**Last full verification: 2026-07-13; the blocks section 2026-11-14.**

Contents: how to re-verify; security model; database access; hooks; headless; blocks and block
themes; claims that are reasoning; deliberately not covered.

WordPress ships around every WordPress-y thing on its own schedule. Function sets grow (`%i` arrived in
6.2), coding standards shift, and the block editor moves fastest of all. **Re-read the handbook page
before asserting a specific.**

## How to re-verify

1. Re-fetch the handbook pages below. There is no changelog feed; check the pages directly.
2. For a function, the canonical source is its **Code Reference** page
   (`developer.wordpress.org/reference/functions/<name>/`), which carries the version it was introduced
   in and its current signature.
3. Read the content, not the status code. Update the claim, the row, and the date.

## Section: The security model

| Claim | Source | Verified |
| --- | --- | --- |
| "Don't trust any data. Don't trust user input, third-party APIs, or data in your database without verification"; "Escape as late as possible"; "Sanitation is okay, but validation/rejection is better"; "Rely on the WordPress API" | [Security — WordPress APIs](https://developer.wordpress.org/apis/security/) | 2026-07-13 |
| **"Nonces should never be relied on for authentication, authorization, or access control. Protect your functions using `current_user_can()`, and always assume nonces can be compromised."** Nonces "do not protect against replay attacks because they aren't checked for one-time use." Functions: `wp_create_nonce`, `wp_nonce_field`, `wp_nonce_url`, `wp_verify_nonce`, `check_admin_referer`, `check_ajax_referer` | [Nonces](https://developer.wordpress.org/apis/security/nonces/) | 2026-07-13 |
| Escaping functions and their contexts (`esc_html`, `esc_attr`, `esc_url`, `esc_js`, `esc_textarea`, `wp_kses`, `wp_kses_post`); combined i18n forms (`esc_html__`, `esc_html_e`, `esc_attr__`); late-escaping rationale — code "can be deemed safe for output at a glance" and it "makes it easier to do automatic code scanning" | [Escaping data](https://developer.wordpress.org/apis/security/escaping/) | 2026-07-13 |
| Sanitization functions (`sanitize_text_field`, `sanitize_textarea_field`, `sanitize_email`, `sanitize_user`, `sanitize_url`, `sanitize_key`, `sanitize_file_name`, `wp_kses`, `wp_kses_post`, and the `sanitize_*` family); "Validation is preferred over sanitization because validation is more specific" | [Sanitizing data](https://developer.wordpress.org/apis/security/sanitizing/) | 2026-07-13 |

**This is the highest-value section in the skill.** The nonce-is-not-authorization quote is the one to
memorize: the most common WordPress plugin vulnerability is an endpoint that verifies a nonce and
forgets the capability check.

## Section: Database access

| Claim | Source | Verified |
| --- | --- | --- |
| `$wpdb->prepare()` uses sprintf-style placeholders: `%s` string, `%d` integer, `%f` float, **`%i` identifier (added in WordPress 6.2)**. **"All placeholders MUST be left unquoted in the query string."** Pass untrusted values as arguments; never concatenate into the query | [`wpdb::prepare()` — Code Reference](https://developer.wordpress.org/reference/classes/wpdb/prepare/) | 2026-07-13 |

**Version-sensitive:** `%i` does not exist before 6.2. If the target site runs older core, an identifier
placeholder will not work — check the minimum supported version before using it.

## Section: Hooks

| Claim | Source | Verified |
| --- | --- | --- |
| Hooks let "one piece of code interact/modify another piece of code at specific, pre-defined spots"; **actions** perform work and "do not return anything back to the calling Action hook"; **filters** "accept a variable, modify it, and return it" and should operate without side effects | [Hooks — Plugin Handbook](https://developer.wordpress.org/plugins/hooks/) | 2026-07-13 |
| Child themes are the documented way to modify a theme without losing changes on update | [Child themes — Theme Handbook](https://developer.wordpress.org/themes/advanced-topics/child-themes/) | 2026-07-13 |

The "a filter that forgets to `return` destroys the value" gotcha is **inferred from the documented
contract** (a filter must return the modified variable), not a quoted warning. It is mechanically true
and worth stating — but label it as reasoning, not a citation.

## Section: Headless WordPress

| Claim | Source | Verified |
| --- | --- | --- |
| The REST API exposes "posts, pages, taxonomies, and other built-in WordPress data types", "implements the same authentication restrictions" as WordPress itself, is "the foundation of the WordPress Block Editor", and is used for headless/decoupled frontends. Caveat, verbatim: **"You do not need to use the REST API to build a WordPress theme or plugin."** | [REST API Handbook](https://developer.wordpress.org/rest-api/) | 2026-07-13 |
| WPGraphQL as the GraphQL alternative | <https://www.wpgraphql.com/> — third-party plugin, not core. **Tier: vendor/community, not WordPress-documented.** | 2026-07-13 |

## Section: Blocks and block themes (`block-editor.md`)

Verified 2026-11-14 against WordPress 7.1 (7.1.4 released 2026-10-28, per
<https://wordpress.org/download/releases/>). The block editor moves fastest of all; recheck version
numbers before relying on them.

| Claim | Source | Verified |
| --- | --- | --- |
| `block.json` is "the canonical way to register block types"; only `name` and `title` required; `apiVersion` 3 is the latest, "introduced in WordPress 6.3"; `render` file added in 6.1 | [Metadata in block.json](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/) | 2026-11-14 |
| From 7.1 the editor will "always use the iframe for the post editor, regardless of the `apiVersion`" | [Block API versions](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-api-versions/) | 2026-11-14 |
| Since 6.8 the recommended registration is `wp_register_block_types_from_metadata_collection()`; `register_block_type()` "remains a valid approach, particularly for plugins with a single block"; best practice is "registering them on both the server and client" | [Registration of a block](https://developer.wordpress.org/block-editor/getting-started/fundamentals/registration-of-a-block/) | 2026-11-14 |
| `render` names a PHP template for a dynamic block's markup, used when no `render_callback` is passed | [block.json fundamentals](https://developer.wordpress.org/block-editor/getting-started/fundamentals/block-json/) | 2026-11-14 |
| Static output is "fixed and stored in the database upon saving"; dynamic blocks "generate their content and structure in real-time" | [Static and dynamic rendering](https://developer.wordpress.org/block-editor/getting-started/fundamentals/static-dynamic-rendering/) | 2026-11-14 |
| "A deprecation will be tried if the current state of a parsed block is invalid" | [Deprecation](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-deprecation/) | 2026-11-14 |
| Dynamic block examples escape output (`esc_html( get_the_title( ... ) )`) | [Creating dynamic blocks](https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/creating-dynamic-blocks/) | 2026-11-14 |
| `unfiltered_html` "Allows user to post HTML markup or even JavaScript code"; administrators and editors on a single site; "In WordPress Multisite, only Super Admins have" it | [Roles and capabilities](https://wordpress.org/documentation/article/roles-and-capabilities/) | 2026-11-14 |
| `get_block_wrapper_attributes()` (5.6+) applies the block's supports to the wrapper; use it in a `render_callback` | [Code Reference](https://developer.wordpress.org/reference/functions/get_block_wrapper_attributes/), [Supports](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/) | 2026-11-14 |
| `InnerBlocks` nests blocks; saved with `<InnerBlocks.Content />` or `useInnerBlocksProps.save()` | [Nested blocks](https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/nested-blocks-inner-blocks/) | 2026-11-14 |
| Files in a theme's `/patterns` register "automatically ... provided that it has a valid pattern file header"; add "at least" `Title`, `Slug`, `Categories` | [Block patterns — Theme Handbook](https://developer.wordpress.org/themes/features/block-patterns/) | 2026-11-14 |
| "Reusable blocks have been renamed to Patterns in WordPress 6.3"; content "still saved to the wp_block CPT" | [Editor changes in 6.3](https://make.wordpress.org/core/2023/07/18/miscellaneous-editor-changes-in-wordpress-6-3/) | 2026-11-14 |
| `@wordpress/scripts` `build`, `start`, `build-blocks-manifest` (6.7+); `@wordpress/create-block` scaffolds a block plugin, `--variant dynamic` | [scripts](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/), [create-block](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-create-block/) | 2026-11-14 |
| theme.json "latest version is version 3 introduced in WordPress 6.6"; `add_theme_support` values are mapped into it and theme.json values "take precedence". The Theme Handbook page still says version 2: stale | [Global settings and styles — Block Editor Handbook](https://developer.wordpress.org/block-editor/how-to-guides/themes/global-settings-and-styles/) | 2026-11-14 |
| Top-level keys `settings`, `styles`, `customTemplates`, `templateParts`, `patterns` | [theme.json living reference](https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/theme-json-living/) | 2026-11-14 |
| Cascade: defaults, then the theme, then "a child theme's `theme.json` takes priority", then the user's "choice takes priority over all other levels"; theme.json "works with both block and classic themes" | [Global settings — Theme Handbook](https://developer.wordpress.org/themes/core-concepts/global-settings-and-styles/), [Introduction to theme.json](https://developer.wordpress.org/themes/global-settings-and-styles/introduction-to-theme-json/) | 2026-11-14 |
| `style.css` "is required"; `templates/index.html` "is necessary for WordPress to consider this a block theme" and is "the only required template file"; `parts/` holds template parts | [Theme structure](https://developer.wordpress.org/themes/core-concepts/theme-structure/), [Template hierarchy](https://developer.wordpress.org/themes/templates/template-hierarchy/) | 2026-11-14 |
| A child theme can "overwrite any template, part, or pattern that exists in the parent theme" with a same-named file (patterns also by `Slug`); "Merge the child theme.json into the parent theme.json" with "The child theme takes precedence" | [Child themes](https://developer.wordpress.org/themes/advanced-topics/child-themes/), [`WP_Theme_JSON_Resolver::get_theme_data()`](https://developer.wordpress.org/reference/classes/wp_theme_json_resolver/get_theme_data/) | 2026-11-14 |
| Block template parts in classic themes "Starting in WordPress 6.1", with the `block-template-parts` theme support and `block_template_part()`; classic themes "have limited support for a `theme.json` file" | [Make Core, 2022-10-04](https://make.wordpress.org/core/2022/10/04/block-based-template-parts-in-traditional-themes/), [Developer Blog: hybrid themes](https://developer.wordpress.org/news/2024/12/bridging-the-gap-hybrid-themes/) | 2026-11-14 |

## Claims that are reasoning, not citation — labelled honestly

These are in the skill because they are true and useful, but they are **not** quotes from the handbook.
Do not present them as documented WordPress guidance:

- **"The plugin layer is the dominant WordPress attack surface."** Widely accepted and consistent with
  the security model (plugins run with full privileges), but this skill does not cite a study for it. If
  a decision hinges on it, source it properly.
- **`admin_init` and `wp_ajax_*` fire for any logged-in user, including a subscriber; `wp_ajax_nopriv_*`
  is reachable unauthenticated.** This follows from how those hooks are defined and is standard
  knowledge, but it is stated here from reasoning about the hook contract. **Verify against the Code
  Reference for the specific hook before relying on it in a security review** — it is a one-page check
  and the stakes are high.
- **"Most compromises exploit known, patched vulnerabilities."** A general security truism, not a
  WordPress-sourced statistic. Do not attach a number to it.
- **In `block-editor.md`:** that changing a static block's `save` marks existing posts invalid (the
  deprecation page implies it rather than stating it); that a dynamic block stores only its
  attributes; that `get_block_wrapper_attributes()` escapes its output (read from its source on the
  Code Reference page, not stated in prose); that Site Editor changes live in the database, not in
  theme files; and that a hybrid theme is the honest path for an established classic theme.
- **Also in `block-editor.md`, read from core source by the 2026-11-14 blind review, not handbook
  prose:** `get_block_wrapper_attributes()` escapes values with `esc_attr()` but writes names
  as given; `WP_Theme_JSON::merge()` replaces preset leaf arrays (`color.palette`,
  `typography.fontSizes`) instead of merging them; once a classic theme has a `theme.json`,
  `WP_Theme_JSON_Resolver::get_theme_data()` stops deriving some settings from theme supports.
  kses filtering of post content on save for users without `unfiltered_html`, and the
  `DISALLOW_UNFILTERED_HTML` constant, are standard core behavior stated from knowledge here; check
  the Code Reference before relying on them in a review.
- **Source conflict:** the Developer Blog's hybrid-themes post says some theme supports "will not
  work when a theme.json file is in place", while core maps `add_theme_support` values into
  theme.json (Block Editor Handbook). The skill follows the handbook and core.
- **Source tiers beyond the handbooks:** the Developer Blog (developer.wordpress.org/news), the
  user documentation (wordpress.org/documentation), and the releases page are WordPress.org's own,
  so tier-1 for WordPress behavior, but less exact than the handbooks.

## Deliberately not covered

- **SEO** — owned by `ref-sp-web-seo` and its `references/frameworks.md` (core sitemaps, archive
  thin content, and the headless Yoast canonical trap). Do not duplicate.
- **Performance/caching specifics, hosting, and plugin recommendations** — a large folklore surface with
  strong vendor interests. Left out rather than sourced badly. If it is needed, source it from primaries
  and tier it, per `ref-sp-web-seo`'s claim-tiering rule.
- **Specific third-party themes, such as Neve FSE.** Checked 2026-11-14: on wordpress.org it is
  Themeisle's "experimental sister theme of Neve" (version 1.1.9, updated 2026-11-04, 8,000+
  installs), a separate theme from Neve rather than an upgrade, and Neve Pro "does not work when
  Neve FSE is the active theme" ([wordpress.org](https://wordpress.org/themes/neve-fse/),
  [Themeisle docs](https://docs.themeisle.com/neve/neve-vs-neve-fse)). A portable skill has no
  reason to recommend one vendor's experimental theme; the method in `block-editor.md` applies to
  any block theme.
