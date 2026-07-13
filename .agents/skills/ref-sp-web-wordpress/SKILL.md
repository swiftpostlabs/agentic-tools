---
name: ref-sp-web-wordpress
description: "Build on WordPress correctly: the sanitize-input / check-capability / escape-output security model that prevents most WordPress vulnerabilities, hooks as the extension mechanism instead of editing core, safe database access with prepared statements, child themes, and the REST API for headless frontends. Use when: writing or reviewing a WordPress plugin or theme, handling form or request data in PHP, adding an admin action or AJAX/REST endpoint, querying the WordPress database, deciding how to extend WordPress without modifying core, auditing a WordPress site's security or update posture, or building a headless WordPress backend."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "web"
  shareable-skills.tags: "security, backend"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-web-seo, ref-sp-db-security"
---

# WordPress

## Purpose

Build and audit WordPress the way WordPress documents it: extend through hooks rather than editing
core, and treat every request as hostile until it has passed the three security gates. Most WordPress
vulnerabilities are not exotic — they are a missing capability check or an unescaped output in a
plugin, and they are entirely preventable with documented APIs.

## When to use this skill

- Writing or reviewing a WordPress **plugin or theme**.
- Handling form, query-string, or request data in PHP.
- Adding an admin action, an AJAX handler, or a REST endpoint.
- Querying the database directly.
- Deciding how to change behaviour without editing core or a parent theme.
- Auditing a WordPress site's security or update posture.
- Building a **headless** WordPress backend.

**Route elsewhere when:** the question is **SEO** — sitemaps, canonicals, archives, or headless
WordPress + Next.js metadata. That is owned by `.agents/skills/ref-sp-web-seo/SKILL.md` and its
`references/frameworks.md`, which carries the headless canonical trap. Do not duplicate it here.

## The security model — three gates, all three required

WordPress states the principles plainly:

> "Don't trust any data. Don't trust user input, third-party APIs, or data in your database without
> verification."

> "Escape as late as possible." — "Sanitation is okay, but validation/rejection is better." — "Rely on
> the WordPress API."

Every request that changes state must pass **all three** gates. Missing any one is the shape of almost
every WordPress plugin CVE.

### Gate 1 — Is this user allowed? (`current_user_can()`)

**This is authorization, and nothing else substitutes for it.** WordPress is explicit:

> "Nonces should never be relied on for authentication, authorization, or access control. Protect your
> functions using `current_user_can()`, and always assume nonces can be compromised."

Check the *capability*, not the role (`current_user_can( 'edit_post', $post_id )`, not
`$user->role === 'editor'`). Capabilities are the documented model; roles are a bundle of them.

### Gate 2 — Did this request really come from that user? (nonces)

Nonces defend against **CSRF** — a forged request made on the user's behalf. They do **not** authorize
anything, and (despite the name) they are **not single-use**:

> nonces "do not protect against replay attacks because they aren't checked for one-time use."

| Function | Use |
| --- | --- |
| `wp_nonce_field()` | Add a hidden nonce input to a form |
| `wp_nonce_url()` | Add a nonce to an action URL |
| `wp_create_nonce()` | Get a nonce for a custom flow (e.g. JS) |
| `wp_verify_nonce()` | Verify one anywhere |
| `check_admin_referer()` | Verify on admin screens |
| `check_ajax_referer()` | Verify in AJAX handlers |

### Gate 3 — Sanitize on input, escape on output

**Sanitize when data comes in.** Prefer *validating and rejecting* over cleaning:
`sanitize_text_field()`, `sanitize_textarea_field()`, `sanitize_email()`, `sanitize_user()`,
`sanitize_url()`, `sanitize_key()`, `sanitize_file_name()`, `absint()`, `wp_kses()` /
`wp_kses_post()` when some HTML must survive.

**Escape when data goes out — and escape *late*,** at the point of printing, not on the way in:

| Function | Context |
| --- | --- |
| `esc_html()` | Text inside an HTML element |
| `esc_attr()` | Anything printed into an attribute |
| `esc_url()` | Every URL, including `href` and `src` |
| `esc_textarea()` | Content of a `<textarea>` |
| `esc_js()` | Inline JavaScript |
| `wp_kses_post()` | Content that may legitimately contain post HTML |

Escaping and translating in one call: `esc_html__()`, `esc_html_e()`, `esc_attr__()`.

**Why late escaping** (WordPress's own reasoning): output "can be deemed safe for output at a glance,"
and it "makes it easier to do automatic code scanning." Escaping early and then passing the value
around means nobody downstream can tell whether it is safe.

**Escape even data from your own database.** It was user input once.

## Database access

Never concatenate input into SQL. Use `$wpdb->prepare()`:

```php
$rows = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT id, title FROM {$wpdb->prefix}things WHERE status = %s AND author_id = %d",
        $status,
        $author_id
    )
);
```

- Placeholders: **`%s`** string, **`%d`** integer, **`%f`** float, **`%i`** identifier (table/column
  name — WordPress 6.2+).
- **"All placeholders MUST be left unquoted in the query string."** Writing `'%s'` with your own quotes
  is a bug: `prepare()` adds them.
- Prefer the high-level APIs first — `WP_Query`, `get_posts()`, `get_option()`, the metadata APIs.
  Dropping to `$wpdb` should be a deliberate choice, not a default.

For the general principles behind this, see `.agents/skills/ref-sp-db-security/SKILL.md`.

## Hooks: the extension mechanism

Hooks are how "one piece of code interacts with / modifies another piece of code at specific,
pre-defined spots." They are the reason you never have to edit core.

- **Actions** *do* something at a point in execution and return nothing (`add_action` / `do_action`).
- **Filters** *receive a value, modify it, and must return it* (`add_filter` / `apply_filters`). A
  filter that returns nothing silently destroys the value — this is a classic bug.
- Filters should be side-effect free; actions are where side effects belong.

**Never modify WordPress core.** Core updates overwrite it, and an un-updatable WordPress is a security
liability. The same applies to a parent theme: use a **child theme** so updates do not erase your
changes.

## Headless WordPress

- The **REST API** (`/wp-json/`) exposes posts, pages, taxonomies, and other types, and it "implements
  the same authentication restrictions" as WordPress itself — public content is public, private content
  requires authentication. It is also what powers the block editor.
- **WPGraphQL** is the common GraphQL alternative.
- WordPress notes you "do not need to use the REST API to build a WordPress theme or plugin" — it is
  for decoupled frontends, apps, and the editor, not a mandatory layer.
- **Lock down the CMS origin.** A publicly reachable headless backend serving the same content as the
  frontend is a full-site duplicate and an expanded attack surface.

**Headless SEO is not covered here** — canonicals, sitemaps, and Yoast's same-domain assumption live in
`.agents/skills/ref-sp-web-seo/references/frameworks.md`. Read it before shipping a headless build; the
default configuration tells Google your CMS is the canonical site.

## Defaults

- **Extend with hooks; never patch core or a parent theme.**
- **Use the WordPress API rather than hand-rolling** sanitization, escaping, or SQL escaping.
- **Prefer validation over sanitization** — reject bad input instead of cleaning it.
- **Prefer `WP_Query` and the core APIs over raw `$wpdb`.**
- **Keep the plugin surface small.** Every plugin is code you did not write running with full
  privileges; the plugin layer is the dominant WordPress attack surface. Justify each one.
- **Keep core, themes, and plugins updated.** Most compromises exploit known, patched vulnerabilities.

## Gotchas

- **A nonce is not a permission check.** The single most common WordPress security bug is an endpoint
  that verifies a nonce and forgets `current_user_can()`. The nonce proves the *request* is genuine, not
  that the *user* is allowed.
- **Nonces are not one-time and expire on a clock.** They do not stop replay.
- **A filter callback that forgets to `return` silently nukes the value.** WordPress will not warn you.
- **`admin_init` and `wp_ajax_*` run for any logged-in user** — including a subscriber. Registering an
  action there is not a permission check.
- **`wp_ajax_nopriv_*` is reachable by anyone, unauthenticated.** Be certain that is what you meant.
- **Escaping is not sanitizing, and doing one does not excuse the other.** They happen at different
  ends of the request.
- **Editing theme files through the admin editor** is a code-execution vector and defeats version
  control. Disable it (`DISALLOW_FILE_EDIT`).

## Validation

Before shipping WordPress code, confirm:

- Every state-changing endpoint checks a **capability** *and* verifies a **nonce**.
- Every input is sanitized (or, better, validated and rejected).
- Every output is escaped, **at the point of output**, with the function matching its context.
- Every SQL query with a variable in it goes through `$wpdb->prepare()`, placeholders unquoted.
- No core or parent-theme file was modified.
- Every filter callback returns a value.

## References

- `./references/sources.md` — provenance for every claim above, with the exact WordPress handbook page.
  Read it before asserting a specific; the function set and the coding standards do change.
- `.agents/skills/ref-sp-web-seo/references/frameworks.md` — WordPress **SEO**: core sitemaps, the
  archive/thin-content problem, and the headless canonical trap.
- `.agents/skills/ref-sp-db-security/SKILL.md` — the general database-security principles behind
  `$wpdb->prepare()` and least-privilege access.
