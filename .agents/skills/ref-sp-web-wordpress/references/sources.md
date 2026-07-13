# Sources and Verification

Provenance for `../SKILL.md`, organized by section. Nearly everything here is **tier-1: WordPress's own
developer handbook**, which is the right authority for how to build on WordPress — and, unlike the SEO
domain, WordPress is not an interested party describing a competitor's behaviour. It is describing its
own documented API.

**Last full verification: 2026-07-13.**

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

## Deliberately not covered

- **SEO** — owned by `.agents/skills/ref-sp-web-seo/references/frameworks.md` (core sitemaps, archive
  thin content, and the headless Yoast canonical trap). Do not duplicate.
- **Performance/caching specifics, hosting, and plugin recommendations** — a large folklore surface with
  strong vendor interests. Left out rather than sourced badly. If it is needed, source it from primaries
  and tier it, per `.agents/skills/ref-sp-web-seo/SKILL.md`'s claim-tiering rule.
- **Block editor / block theme development** — real and documented
  (<https://developer.wordpress.org/block-editor/>), but a large surface of its own. A candidate for a
  future expansion rather than a thin section here.
