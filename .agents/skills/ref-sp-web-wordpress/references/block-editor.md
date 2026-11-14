# Blocks, Block Themes, and Full Site Editing

Read this when writing a block, a block theme, or `theme.json`, or moving a classic theme toward
blocks. The security gates in `../SKILL.md` apply unchanged; this file says where they bite. Every
claim is sourced in `./sources.md`.

Contents: blocks; security in blocks; nesting and patterns; tooling; `theme.json`; block themes;
child themes; hybrid themes.

## Blocks

- **`block.json` is the canonical way to register a block.** Only `name` and `title` are required.
  Use `apiVersion: 3` (WordPress 6.3+); from WordPress 7.1 the post editor is always iframed,
  whatever the `apiVersion`.
- **Register on both server and client.** PHP registration reads `block.json`
  (`register_block_type()` for one block; `wp_register_block_types_from_metadata_collection()` with
  a generated manifest is the recommended way for several, since 6.8). The editor side uses
  `registerBlockType()` in JS.
- **Static or dynamic.** A static block's markup is produced by its `save` function and stored in
  the post. A dynamic block renders on the server on every request, through a `render` file named
  in `block.json` (6.1+) or a `render_callback` passed at registration.
- **Changing a static block's `save` breaks existing posts.** Stored markup that no longer matches
  is flagged invalid in the editor; add a deprecation (the old `save` and attributes) so old content
  migrates. A dynamic block whose `save` returns nothing stores only its attributes and avoids this;
  one that saves `<InnerBlocks.Content />` or fallback markup does not.

## Security in blocks

- **A dynamic block's render is ordinary PHP output.** Escape it late, as `../SKILL.md` gate 3 says;
  the handbook's examples do (`esc_html( get_the_title( ... ) )`).
- **Block attributes are user input.** They live in post content, which any author or contributor
  can write. Only users with `unfiltered_html` (administrators and editors on a single site; super
  admins only, on multisite) may post raw HTML or script. Validate attributes in PHP before use.
- **A static block's saved HTML is not escaped when the page is shown.** For users without
  `unfiltered_html`, WordPress filters post content through kses (its HTML allow-list) on save; that
  filter is the only protection. `define( 'DISALLOW_UNFILTERED_HTML', true )` takes the capability
  from everyone, administrators included.
- **Use `get_block_wrapper_attributes()`** for the wrapper's attributes in a dynamic render, so
  block supports (colors, spacing, classes) apply. It escapes values, not attribute names: never put
  untrusted names in its extra attributes.
- **A block that saves or fetches data** through its own REST route needs a `permission_callback`
  that checks a capability. `apiFetch` sends a nonce on its own, which proves the request came from
  the user, not that the user may make it (gates 1 and 2).
- **Interactivity API** state and context are printed into the page for the browser: never put
  secrets or unchecked input in them. Its details are outside this reference.

## Nesting and patterns

- **`InnerBlocks`** (or `useInnerBlocksProps`) nests other blocks inside one; save the children with
  `<InnerBlocks.Content />`.
- **Theme patterns:** a PHP file in the theme's `patterns/` folder registers automatically when its
  header is valid. Give it at least `Title`, `Slug`, and `Categories`.
- **Synced patterns** are what reusable blocks became in 6.3: still stored as the `wp_block` post
  type, so editing one changes it everywhere it is used.

## Tooling

The editor is a React app, built separately from the theme's PHP.

- `@wordpress/scripts`: `wp-scripts build` for production, `wp-scripts start` to rebuild on change,
  `build-blocks-manifest` (6.7+) for the multi-block manifest.
- `@wordpress/create-block` scaffolds a block plugin; `--variant dynamic` gives a dynamic block.

## theme.json

- **The configuration surface** for block settings and styles, in block and classic themes alike.
  Use schema `version: 3` (6.6+). Top-level keys: `settings`, `styles`, `customTemplates`,
  `templateParts`, `patterns`.
- **Cascade, lowest to highest priority:** WordPress defaults, the theme's `theme.json`, a child
  theme's `theme.json`, then the user's choices in the Site Editor.
- **It supersedes `add_theme_support()` for block features.** Existing declarations are mapped into
  it (`editor-color-palette` becomes `settings.color.palette`), and `theme.json` wins where both set
  a value.

## Block themes

- `style.css` is required, and `templates/index.html` is what makes WordPress treat a theme as a
  block theme; it is the only required template.
- Templates are HTML files of block markup in `templates/`, following the usual template hierarchy
  (`single.html`, `archive.html`, ...). Shared pieces such as the header live in `parts/`.
- `functions.php` shrinks to registration and hooks; layout moves into templates and styling into
  `theme.json`.

## Child themes of block themes

The rule in `../SKILL.md` holds: never edit the parent, use a child theme. What a child can override
differs from a classic theme:

- **Templates, parts, and patterns:** add a file with the same name as the parent's (a pattern also
  needs the same `Slug`), and the child's wins.
- **`theme.json`:** merged with the parent's, the child's values taking precedence. Write only the
  settings that change, but note that preset lists such as `settings.color.palette` and
  `settings.typography.fontSizes` are replaced, not merged: a child that adds one color drops the
  parent's whole palette, so copy the parent's entries it keeps.
- **Site Editor changes are stored in the database**, not in either theme's files, and outrank both.
  Export them to files before treating the theme folder as the source of truth.

## Hybrid themes

A classic theme can adopt block features one at a time: a `theme.json` (with more limited support
than in a block theme), and block template parts since 6.1, by declaring
`add_theme_support( 'block-template-parts' )`, placing parts in `parts/`, and printing them with
`block_template_part( 'footer' )`. This is the honest path for an established classic theme; a
rewrite as a block theme is a project of its own.

Adding a `theme.json` can change how a classic theme looks: once the file exists, WordPress stops
deriving some settings from the theme's `add_theme_support()` calls, such as whether core's default
palette and font sizes appear. Compare the editor and the site before and after, and declare in
`theme.json` the presets the theme relies on.
