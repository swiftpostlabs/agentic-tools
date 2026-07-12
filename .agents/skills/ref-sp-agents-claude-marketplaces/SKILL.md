---
name: ref-sp-agents-claude-marketplaces
description: "Publish a repo's skills to Claude Code as a plugin distributed through a plugin marketplace: plugin.json and marketplace.json layout, source types, the skills-path and caching rules, how visibility tiers map onto public/private/local hosting, and how releases and updates actually reach users. Use when: packaging skills as a Claude Code plugin, creating or hosting a marketplace.json catalog, deciding which skills may be published, cutting or versioning a plugin release, or debugging why an installed plugin is missing skills or not updating."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "release, git"
  shareable-skills.suggests: "ref-sp-agents-shareable-skills, ref-sp-dev-package-management"
---

# Claude Plugin Marketplaces

## Purpose

Turn a repo that already holds skills into a **Claude Code plugin** published through a **plugin
marketplace**, without restructuring the repo and without leaking skills that were never meant to
leave it.

This skill is scoped to **distributing skills**. It is not a general plugin-authoring guide: hooks,
MCP servers, LSP servers, agents, and monitors are plugin components too, but they are out of scope
here — consult the upstream reference for those. What this skill owns is the part that is genuinely
easy to get wrong: **which directories get published, how paths survive the install cache, and how a
release reaches an existing user.**

## When to use this skill

- Packaging an existing skills directory as a Claude Code plugin.
- Creating a `marketplace.json` catalog, or choosing where to host it.
- Deciding which skills are allowed into a published plugin.
- Cutting a release, or choosing between pinned and rolling versioning.
- Debugging an installed plugin that is missing skills, or that will not update.

## The mental model

Three nested things, often conflated:

| Thing | What it is | Where it lives |
| --- | --- | --- |
| **Skill** | A directory with a `SKILL.md`. | `<skills-root>/<skill-name>/` |
| **Plugin** | A self-contained directory of components. Bundles skills. | Its **plugin root** |
| **Marketplace** | A catalog listing plugins and where to fetch them. | `.claude-plugin/marketplace.json` at a git repo root |

Users run `/plugin marketplace add <owner>/<repo>` once, then install plugins from that catalog.
A marketplace is **not** a central registry — it is a JSON file in a git repo, so a marketplace is
exactly as private as its hosting.

**Your skills already have the right shape.** Claude reads only `name`, `description`, and
`disable-model-invocation` from `SKILL.md` frontmatter and **ignores unrecognized `metadata.*` keys**,
so a repo's own governance metadata (ownership, domain, visibility, dependencies) rides along inside a
published plugin untouched. Nothing needs stripping.

## Critical rules

These four are where publishing goes wrong. Everything else is detail.

### 1. Skills do not have to live in `skills/`

`plugin.json` and marketplace plugin entries both accept a **`skills`** field — a path or array of
paths (`"skills": ["./.agents/skills/"]`). All paths must be **relative to the plugin root and start
with `./`**. So a repo whose skills sit somewhere unconventional does **not** need to move them: make
the repo root the plugin root and point `skills` at the existing directory.

### 2. `skills` normally *adds*, but a marketplace-root source makes it *replace*

This is the rule that decides what actually ships:

- Normally, the default `skills/` directory is **always scanned**, and paths in `skills` load
  *alongside* it.
- **Exception:** when a marketplace entry's `source` resolves to the **marketplace root**
  (`"source": "./"`), the listed paths become **the complete set** — other directories do not load.
  Listing the container directory itself, or the plugin root, keeps the full scan. If none of the
  listed paths exist, the default scan runs instead.

Consequence: with a marketplace-root source, **enumerating individual skill directories is the only
mechanism for publishing a subset.** Pointing at the container publishes everything in it.

```jsonc
"source": "./",
"skills": ["./skills/code-review", "./skills/docs"]   // exactly these two ship
```

### 3. Nothing may traverse outside the plugin root

Plugins are copied into a version cache on install
(`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`). Any path that reaches upward through a
parent-directory segment (`..`) to something like a shared utils folder does **not** work after
installation, because those files are never copied into the cache. Symlinks are the escape hatch, and
their behavior depends on where the target resolves:

| Symlink target | Behavior on install |
| --- | --- |
| Within the plugin's own directory | Preserved as a relative symlink |
| Elsewhere within the same marketplace | **Dereferenced** — content is copied in |
| Outside the marketplace | **Skipped**, for security |

Prefer naming the real paths in `skills` over building a symlink farm.

### 4. A stale `version` silently freezes your users

Claude resolves a plugin's version from the **first** of these that is set:

1. `version` in `plugin.json`
2. `version` in the marketplace entry
3. the git commit SHA of the plugin's source

Two traps follow, and both fail *silently*:

- **Setting `version` pins the plugin.** If `plugin.json` says `"version": "1.0.0"`, pushing new
  commits without changing that string ships **nothing** to existing users — Claude sees the same
  version and keeps the cached copy. Bump it every release, or omit it entirely.
- **Never set `version` in both `plugin.json` and the marketplace entry.** `plugin.json` always wins,
  with no warning, so a stale manifest can mask the version you set in the catalog.

## Publishing procedure

1. **Decide the publish set.** Filter skills by the repo's visibility policy — see
   [Visibility mapping](#visibility-mapping). A published plugin must never carry a skill the repo
   marks as local-only.
2. **Choose the plugin root.** Simplest is the repo root, which then doubles as the marketplace root;
   the plugin entry's `source` becomes `"./"`.
3. **Write the manifests.** `.claude-plugin/plugin.json` (the plugin) and
   `.claude-plugin/marketplace.json` (the catalog). Only `plugin.json` belongs inside
   `.claude-plugin/` — component directories live at the plugin root. See
   [`./references/manifests.md`](./references/manifests.md) for both schemas, all `source` types, and
   `strict` mode.
4. **Generate the skills list, do not hand-write it.** Enumerated paths must track the catalog, and a
   hand-maintained list drifts the moment someone adds a skill. Derive it from the visibility metadata
   the skills already carry, commit the generated manifests, and add a drift check to CI so adding a
   skill without regenerating fails the build.
5. **Choose the release model** — see [Releasing](#releasing).
6. **Prove the install before announcing it.** Add the marketplace, install, confirm the expected
   skill count, and confirm no local-only skill leaked. Then check the always-on cost: every published
   skill's `description` loads into **every session**, so the publish set is a token budget, not just a
   policy question.

```bash
/plugin marketplace add <owner>/<repo>     # add the catalog
/plugin marketplace update                 # refresh it later
claude plugin list                         # what is installed, and ignored-folder warnings
claude plugin details <plugin>             # components and their descriptions
/reload-plugins                            # pick up non-skill component changes in-session
```

Skills namespace as `/<plugin>:<skill>`, so the plugin name is a user-visible prefix on every skill.
Keep it short. This is also why a skill's own owner-prefix stays useful: it lets the same directories
be consumed both as plain skills and as plugin skills with no rename.

## Releasing

**There is no build artifact.** For the git-based source types, Claude clones the repo and copies the
plugin directory into the cache. Nothing is compiled, bundled, or uploaded. "Releasing" is therefore
purely a versioning decision:

| Model | How | When to choose it |
| --- | --- | --- |
| **Rolling** | Omit `version` entirely; every commit to the tracked ref is a new version, keyed by commit SHA. | Internal or actively-developed plugins. Release == merge. |
| **Pinned** | `plugin.json.version` is bumped on every release. | The repo already has real releases — a version file, a changelog, a conventional-commit bump tool. The plugin manifest becomes **one more manifest in the existing version-sync set**, and the release flow is the one the repo already has. |

Pick **pinned** whenever the repo already versions itself; wire the plugin version into the existing
bump rather than maintaining a second, divergent version. Users then receive the release on their next
`/plugin marketplace update` or background auto-update.

One subtlety with `"source": "./"`: the content served is whatever the marketplace clone's ref holds,
so a *fresh* install between releases serves newer default-branch content under the older version
label. Existing users correctly stay cached until the version bumps, so this is a label skew, not a
correctness bug. For a hard-pinned channel, give the plugin entry an explicit git source with a
`ref` on a release tag instead of `"./"`, at the cost of bumping that ref every release.

Stable/latest channels are built the same way: two marketplaces pointing at different refs of the same
repo. **Each channel must resolve to a different version**, or Claude treats them as identical and
skips the update.

Full detail — version resolution, auto-update tokens, channels, cache lifetime:
[`./references/releasing.md`](./references/releasing.md).

## Visibility mapping

A repo that already tiers its skills for sharing maps straight onto Claude's hosting model. The tiers
below use this repo's vocabulary (`repo-local` / `organization` / `public`, owned by the sharing spec);
substitute the equivalent tiers of whatever policy the repo runs.

| Tier | Marketplace form | Mechanism |
| --- | --- | --- |
| `public` | Public git repo; optionally submit to the community marketplace. | `/plugin marketplace add <owner>/<repo>` |
| `organization` | **Private** git repo. | `extraKnownMarketplaces` in settings pre-registers it for teammates; background auto-update needs a token env var, since credential helpers are not available at startup. |
| `repo-local` | Never published. A local `directory`/`file` source stays fully offline if you want it loadable at all. | Must be **excluded** from the published `skills` list. |

The tier is enforced by **what you enumerate**, nothing else. Claude has no notion of skill-level
visibility — it publishes whatever the manifest lists. That makes the generator in step 4 the actual
enforcement point, and the CI drift check the thing that keeps it honest.

See [`./references/visibility-and-hosting.md`](./references/visibility-and-hosting.md) for private-repo
credentials, `extraKnownMarketplaces`, air-gapped sources, and the public Anthropic marketplaces.

## Gotchas

- **A plugin bundling many skills costs tokens in every session**, because all their descriptions load
  at discovery. Bundling everything into one plugin keeps intra-repo skill dependencies from crossing a
  plugin boundary, which is usually the right trade — but it makes description discipline a
  distribution concern, not just a style one.
- **`strict: false` plus a `plugin.json` that declares components is a hard load failure.** Choose one
  authority: the manifest (`strict: true`, the default) or the marketplace entry (`strict: false`).
- **Relative `source` paths break in URL-distributed marketplaces.** If users add the marketplace by a
  direct URL to `marketplace.json`, only that file is fetched, so `"./…"` cannot resolve. Use a git or
  npm source for URL-based distribution.
- **Components inside `.claude-plugin/` are not found.** Only `plugin.json` goes there.
- **Editing a `SKILL.md` takes effect immediately; other components do not.** Run `/reload-plugins`.
- **Do not write state into the plugin directory.** Its path changes on every update. Use the plugin's
  persistent data directory.

## Validation

Before announcing a marketplace:

- The published skill list matches the repo's visibility policy — no local-only skill is enumerated.
- The manifests are generated, committed, and covered by a drift check in CI.
- `version` appears in exactly one place, and the release flow bumps it.
- A real install from the hosted marketplace produces the expected skill count.
- Skills still validate against the repo's own skill and sharing validators — publishing changes
  packaging, not authoring standards.

## References

- [`./references/manifests.md`](./references/manifests.md) — `plugin.json` and `marketplace.json`
  schemas, every `source` type, path-behavior rules, `strict` mode.
- [`./references/releasing.md`](./references/releasing.md) — version resolution, update and
  auto-update, release channels, the install cache.
- [`./references/visibility-and-hosting.md`](./references/visibility-and-hosting.md) — public, private,
  org-wide, and offline hosting; credentials and tokens.
- Upstream, authoritative and worth re-reading when a detail matters:
  <https://code.claude.com/docs/en/plugins>,
  <https://code.claude.com/docs/en/plugins-reference>,
  <https://code.claude.com/docs/en/plugin-marketplaces>.
- `ref-sp-agents-shareable-skills` — the sharing spec whose visibility tiers gate what may be published.
- `ref-sp-dev-package-management` — multi-manifest version sync, which the plugin manifest joins.
