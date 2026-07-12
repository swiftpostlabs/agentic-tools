# Releasing, updating, and the install cache

Load this when cutting a release, wiring versioning into an existing release flow, or debugging a
plugin that will not update.

## There is no build artifact

For the git-based source types (`github`, `url`, `git-subdir`, and relative paths inside a git-hosted
marketplace), Claude **clones the repo and copies the plugin directory into a local cache**. Nothing is
compiled, bundled, tarred, or uploaded. The `npm` source type is the one exception: it installs a
published npm package via `npm install`, which does require publishing.

So for the common case, "releasing" is **only** a versioning decision. The deliverable is a commit.

## Version resolution

Claude resolves a plugin's version from the **first** of these that is set:

1. `version` in the plugin's `plugin.json`
2. `version` in the plugin's marketplace entry
3. the git commit SHA of the plugin's source

The resolved version determines the **cache path** and **update detection**: if it matches what the
user already has, `/plugin update` and auto-update **skip the plugin entirely**.

### Two silent failure modes

- **A stale pinned version freezes users.** With `"version": "1.0.0"` in `plugin.json`, pushing new
  commits without changing that string ships nothing — Claude sees the same version and keeps the
  cached copy. Bump on every release, or omit the field.
- **Declaring `version` in both places masks one.** `plugin.json` always wins, without warning, so a
  forgotten manifest version silently overrides the marketplace entry. Keep `version` in exactly one
  place.

## Choosing a model

### Rolling (SHA-based)

Omit `version` everywhere. Every commit to the tracked ref is a new version. This is the simplest
setup for internal or actively-developed plugins, and release becomes "merge to the default branch".

Cost: no changelog story, no way for a user to say which version they run, no stable/latest split
without extra refs.

### Pinned (recommended when the repo already versions itself)

`plugin.json.version` carries a real version. If the repo already has a version file, a changelog, and
a conventional-commit bump tool, **the plugin manifest is simply one more manifest in the existing
version-sync set** — alongside, for example, a language package manifest and a project version file.

Wire it into the existing bump so it cannot drift:

1. Bump the repo version with the tool the repo already uses.
2. Regenerate the manifests so `plugin.json.version` picks up the new value.
3. Commit and push (and tag, if the repo tags releases).

Users receive it on the next `/plugin marketplace update` or background auto-update.

Do **not** maintain the plugin version by hand as a second, independent number. That is how the stale-
pin failure above happens.

### The `"source": "./"` label skew

When the plugin's source is the marketplace root, the content served is whatever the marketplace
clone's ref currently holds. So a **fresh** install performed between releases serves newer
default-branch content under the **older** version label. Existing users are unaffected — they
correctly stay on the cached version until it bumps — so this is a labeling skew, not a correctness
bug.

If a hard-pinned channel matters, give the plugin entry an explicit git source pinned to a release
tag instead of `"./"`:

```jsonc
"source": { "source": "github", "repo": "acme/agent-skills", "ref": "v1.4.0" }
```

Cost: that `ref` must be bumped on the default branch on every release.

## Release channels

Support "stable" and "latest" by publishing **two marketplaces pointing at different refs or SHAs of
the same repo**, then assigning them to different user groups via managed settings.

```jsonc
// stable marketplace
{ "name": "acme-stable", "plugins": [
  { "name": "acme-skills",
    "source": { "source": "github", "repo": "acme/agent-skills", "ref": "stable" } }
]}

// latest marketplace
{ "name": "acme-latest", "plugins": [
  { "name": "acme-skills",
    "source": { "source": "github", "repo": "acme/agent-skills", "ref": "latest" } }
]}
```

**Each channel must resolve to a different version.** With explicit versions, `plugin.json` must
declare a different `version` at each pinned ref. If you omit `version`, the distinct commit SHAs
already distinguish them. If two refs resolve to the same version string, Claude treats them as
identical and skips the update.

## The install cache

- Plugins are copied to `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
- Each installed version is a separate directory. On update or uninstall the previous version is marked
  orphaned and removed **about 7 days later**, so concurrent sessions holding the old version keep
  working. Glob and Grep skip orphaned directories.
- The plugin root path **changes on every update**. Never write state into it — use the plugin's
  persistent data directory, which survives updates, for caches, installed dependencies, and generated
  files.
- When a plugin updates mid-session, hooks, monitors, and MCP/LSP servers keep using the old path until
  `/reload-plugins` (monitors need a full restart). Edits to a `SKILL.md` take effect immediately;
  changes to other components do not.

## Renaming or removing a plugin

Use the marketplace's `renames` map to migrate existing users automatically: former plugin `name` →
current name, or `null` if the plugin was removed. Without it, existing installs simply break.

## Update commands

```bash
/plugin marketplace update      # refresh the catalog
/plugin update                  # update installed plugins (skips if version is unchanged)
/reload-plugins                 # re-read non-skill components in the current session
claude plugin list              # installed plugins; warns about ignored default folders
claude plugin details <plugin>  # components and descriptions — use to audit the always-on token cost
```
