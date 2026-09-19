---
name: ref-sp-agents-plugin-marketplaces
description: "Publish a repo's skills and MCP servers as an agent plugin distributed through a plugin marketplace, installable from Claude Code, OpenAI Codex, GitHub Copilot CLI, and VS Code: choosing between the Claude-format manifest and the portable Agent Plugins 1.0 schema, plugin.json and marketplace.json layout, manifest detection order per client, source types, the skills-path and caching rules, how visibility tiers map onto public/private/local hosting, and how releases and updates actually reach users. Use when: packaging skills as a plugin, creating or hosting a marketplace.json catalog, deciding which skills may be published, targeting Codex, Copilot CLI, or VS Code users, submitting a Claude plugin to OpenAI, cutting or versioning a plugin release, or debugging why an installed plugin is missing skills or not updating."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "release, git"
  shareable-skills.suggests: "ref-sp-agents-shareable-skills, ref-sp-dev-package-management"
---

# Plugin Marketplaces

## Purpose

Turn a repo that already holds skills into an **agent plugin** published through a **plugin
marketplace**, without leaking skills that were never meant to leave it.

A plugin is a **cross-client format**, not a Claude-only one. Claude Code, OpenAI Codex, GitHub
Copilot CLI, and VS Code all install plugins and all consume the same `SKILL.md` standard. What they
do **not** share is one manifest: there are two formats, and the choice between them determines
whether you can publish a subset of your skills at all. Start at
[Choose the manifest format](#choose-the-manifest-format).

This skill is scoped to **distributing skills and MCP servers**, which are the two component types
the portable standard actually covers. Hooks, commands, agents, rules, and LSP servers are plugin
components too, but Agent Plugins 1.0 excludes them as too client-specific, so they ship as
client-specific configuration rather than portable components; for authoring them see the repo's
hooks skill (`.agents/skills/ref-sp-agents-hooks/SKILL.md`). What this skill owns is the part that is
genuinely easy to get wrong: **which directories get published, how paths survive the install cache,
and how a release reaches an existing user.**

## When to use this skill

- Packaging an existing skills directory as a plugin.
- Creating a `marketplace.json` catalog, or choosing where to host it.
- Deciding which skills are allowed into a published plugin.
- Making one published plugin installable from Claude Code, Copilot CLI, and VS Code.
- Cutting a release, or choosing between pinned and rolling versioning.
- Debugging an installed plugin that is missing skills, or that will not update.

## Scope boundaries

This skill owns **publishing** — the format choice, the manifests, the publish set, the install
cache, the release. It is one of two ways skills leave a repo; pick by how the consumer gets them.

- `ref-sp-agents-skills-management` — the other way out: linking and syncing skills into a consuming
  repo from a source it already has. Use that when the consumer is a repo you control; use this when
  the consumer *installs* the skills from a marketplace.
- `ref-sp-agents-shareable-skills` — owns the visibility tiers this skill's manifest must respect,
  and the validator that enforces the two against each other. It decides what *may* be published;
  this skill decides how.
- `ref-sp-dev-semantic-versioning` and `ref-sp-dev-package-management` — what a version number means
  and how it stays in sync across manifests. This skill only owns why a stale plugin version freezes
  users.
- `ref-sp-agents-hooks` — owns authoring hooks themselves, including the Codex platform and the
  repo-level versus plugin-bundled distinction. This skill owns only how a plugin carries one.
- **Skills and MCP servers** are the two component types Agent Plugins 1.0 standardizes, so they are
  in scope here. LSP servers, agents, commands, and rules are excluded from v1 as too client-specific
  and ship as `extensions` data; consult the upstream client references for their schemas.

## The mental model

Three nested things, often conflated:

| Thing | What it is | Where it lives |
| --- | --- | --- |
| **Skill** | A directory with a `SKILL.md`. | `<skills-root>/<skill-name>/` |
| **Plugin** | A self-contained directory of components. Bundles skills. | Its **plugin root** |
| **Marketplace** | A catalog listing plugins and where to fetch them. | `.claude-plugin/marketplace.json` at a git repo root |

Users add a marketplace once, then install plugins from that catalog. A marketplace is **not** a
central registry — it is a JSON file in a git repo, so a marketplace is exactly as private as its
hosting.

**Your skills already have the right shape.** Clients read only `name`, `description`, and
`disable-model-invocation` from `SKILL.md` frontmatter and **ignore unrecognized `metadata.*` keys**,
so a repo's own governance metadata (ownership, domain, visibility, dependencies) rides along inside a
published plugin untouched. Nothing needs stripping.

## Choose the manifest format

Decide this first. It changes where the manifest goes, which clients see the plugin, and whether
publishing a subset of your skills is expressible at all.

| | Claude format | Agent Plugins 1.0 |
| --- | --- | --- |
| Manifest | `.claude-plugin/plugin.json` | `plugin.json` at the plugin root |
| Reaches | Claude Code, Copilot CLI, VS Code | Codex, Copilot CLI, VS Code |
| Skills location | `skills/` by default, or any path named in the `skills` field | `skills/` only, fixed |
| Publish a subset | Yes, by enumerating paths | **No.** The schema is closed; there is no `skills` field |
| MCP servers | `mcpServers` field, path or inline | `mcp.json` at the plugin root |
| Hooks, commands, agents | First-class manifest fields | Excluded from v1; client-specific `extensions` only |

**Claude Code does not read a root `plugin.json`**, and Codex does not read `.claude-plugin/plugin.json`
outside the submission portal. So there is no single manifest that reaches all four clients:

- **Targeting Claude, Copilot, and VS Code:** ship the Claude format alone. `.claude-plugin/` is last
  in the other two search orders, so one manifest set covers all three.
- **Adding Codex:** ship a root `plugin.json` with the Agent Plugins `$schema` as well, or submit the
  Claude-format archive through the OpenAI portal, which converts it.
- **Shipping both:** legitimate and sometimes necessary, but it makes Copilot and VS Code switch to
  Agent Plugins semantics, because the root manifest wins their search order. Accept that the
  enumeration-based publish set stops applying there.

The Agent Plugins entry is gated on the **exact** `$schema` string
`https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`. A root `plugin.json` without it is read
as a legacy Copilot-format manifest instead. Details in
[`./references/agent-plugins-spec.md`](./references/agent-plugins-spec.md).

## Critical rules

These are where publishing goes wrong. Everything else is detail.

### 1. Under the Claude format, skills do not have to live in `skills/`

`plugin.json` and marketplace plugin entries both accept a **`skills`** field — a path or array of
paths (`"skills": ["./.agents/skills/"]`). Paths resolve **relative to the plugin root**, and Claude
requires the `./` prefix. So a repo whose skills sit somewhere unconventional does **not** need to
move them: make the repo root the plugin root and point `skills` at the existing directory.

**This is a Claude-format affordance only.** Agent Plugins discovers `skills/` and nothing else, and
the OpenAI submission portal requires "at least one valid skill at `skills/<skill-name>/SKILL.md`"
even when accepting a Claude-format archive. Any route that reaches Codex needs the skills physically
under `skills/` at the plugin root.

### 2. How the publish set is enforced depends on the format

This is the rule that decides what actually ships, and it has two completely different answers.

**Claude format — enumeration.** The default `skills/` directory is normally always scanned, and
paths in `skills` load *alongside* it. The exception is what makes subsets possible: when a
marketplace entry's `source` resolves to the **marketplace root** (`"source": "./"`), the listed
paths become **the complete set**, and other directories do not load. Listing the container directory
itself, or the plugin root, keeps the full scan. If none of the listed paths exist, the default scan
runs instead.

```jsonc
"source": "./",
"skills": ["./skills/code-review", "./skills/docs"]   // exactly these two ship
```

**Agent Plugins — filesystem contents.** The schema is closed. The permitted top-level fields are
`$schema`, `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`,
`keywords`, and `extensions`, and a manifest carrying anything else is **invalid**, not merely
ignored. There is no `skills` field to enumerate with. Every immediate subdirectory of `skills/` that
holds a `SKILL.md` ships, and the spec forbids reaching outside: "the filesystem-resolved path MUST
remain within the filesystem-resolved plugin root," which rules out symlinking to skills stored
elsewhere in the repo.

So publishing a subset under Agent Plugins means **staging copies** of exactly the publishable skills
into the plugin root. That is more work than a generated manifest list, and a stronger guarantee: an
excluded skill is absent from the artifact rather than merely unlisted.

Verification status differs too. The replace-versus-add behavior is **documented for Claude Code**
and **unresolved for Copilot CLI and VS Code**, whose docs state only that `skills` defaults to
`skills/`. It does not apply to Agent Plugins at all. Since enumeration is what enforces a visibility
policy under the Claude format, prove it with a real install before publishing to those clients.

One structural mitigation: a repo with **no** `skills/` directory at the plugin root makes the
default scan find nothing, so add-versus-replace stops mattering. That protection ends as soon as a
staged `skills/` directory exists, at which point the staging filter becomes the enforcement point.

### 3. Nothing may traverse outside the plugin root

Plugins are copied into a version cache on install — for Claude,
`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`; other clients use their own cache
locations, listed in the compatibility reference. Any path that reaches upward through a
parent-directory segment (`..`) to something like a shared utils folder does **not** work after
installation, because those files are never copied into the cache. Symlinks are the escape hatch, and
their behavior depends on where the target resolves:

| Symlink target | Behavior on install |
| --- | --- |
| Within the plugin's own directory | Preserved as a relative symlink |
| Elsewhere within the same marketplace | **Dereferenced** — content is copied in |
| Outside the marketplace | **Skipped**, for security |

Prefer naming the real paths in `skills` over building a symlink farm.

Agent Plugins states the containment rule more strictly, and on the **resolved** path: "the
filesystem-resolved path MUST remain within the filesystem-resolved plugin root." A symlink pointing
outside the plugin root resolves outside it, so the dereferencing escape hatch above does not carry
over. Under that format the content has to be inside the plugin root, which is why staging exists.
A dev-time symlink farm remains fine, because nothing installs from the checkout; it is the published
artifact that must satisfy containment.

### 4. A stale `version` silently freezes your users

A plugin's version resolves from the **first** of these that is set:

1. `version` in `plugin.json`
2. `version` in the marketplace entry
3. the git commit SHA of the plugin's source

Two traps follow, and both fail *silently*:

- **Setting `version` pins the plugin.** If `plugin.json` says `"version": "1.0.0"`, pushing new
  commits without changing that string ships **nothing** to existing users — the client sees the same
  version and keeps the cached copy. Bump it every release, or omit it entirely.
- **Never set `version` in both `plugin.json` and the marketplace entry.** `plugin.json` always wins,
  with no warning, so a stale manifest can mask the version you set in the catalog.

The ban is on the **plugin entry** inside `marketplace.json`'s `plugins` array. A `version` under the
catalog's own top-level `metadata` is a different field describing the catalog, and setting it
alongside `plugin.json.version` is correct, not a conflict. The two look identical in a grep for
`"version"` across `.claude-plugin/`, which is a good way to talk yourself into "fixing" a manifest
that was already right — check which object the field sits in before touching it.

Wire the version into the release tool rather than bumping it by hand. In this repo, Commitizen's
`version_files` in `pyproject.toml` rewrites `.claude-plugin/plugin.json:version` and
`.claude-plugin/marketplace.json:version` alongside `package.json` and `VERSION`, so one `cz bump`
keeps every manifest on the same number. A version a human has to remember to bump is a version that
silently freezes users.

### Enforce the publish set mechanically, do not trust it

Whichever format you ship, one artifact decides what reaches the world: the `skills` list under the
Claude format, or the contents of the staged `skills/` directory under Agent Plugins. Neither is
checked by the plugin format itself, so a `repo-local` skill added to the list ships, and a renamed
folder silently drops out.

Validate it. The sharing-spec validator (`ref-sp-agents-shareable-skills`,
`scripts/validate-sharing.mts <skills-root> --all`) cross-checks the manifest against the catalog: it
errors on a non-public skill being listed, on a dangling path, and on listing the container while
non-public skills live inside it; it warns when a public skill is missing from the manifest. Run it
before cutting a release. For a staged plugin root, assert the same property on the staged directory
after the copy step, because the manifest no longer describes the publish set.

## Cross-client compatibility

Four clients install plugins, and **no single manifest reaches all four**:

| Client | Manifest search order |
| --- | --- |
| Claude Code | `.claude-plugin/plugin.json`. Nothing else. |
| Copilot CLI | Agent Plugins root `plugin.json` → `.plugin/plugin.json` → `plugin.json` → `.github/plugin/plugin.json` → `.claude-plugin/plugin.json` |
| VS Code | Agent Plugins root `plugin.json` → Copilot-format `plugin.json` → `.claude-plugin/plugin.json` → `.plugin/plugin.json` |
| Codex / ChatGPT | Root `plugin.json` (Agent Plugins). `.codex-plugin/plugin.json` is a compatibility fallback |

**A repo laid out for Claude Code is installable from Copilot CLI and VS Code**, because
`.claude-plugin/` is last in both of their orders. Shipping a second `.github/plugin/` copy is
duplication, not compatibility. Third-party posts recommending both are working from the wrong
detection order.

**Codex is the exception**, and reaching it takes a deliberate second step: a root `plugin.json`
carrying the Agent Plugins `$schema`, or an archive submitted through the OpenAI portal, which
accepts `.claude-plugin/plugin.json` and converts it to `.codex-plugin/plugin.json`.

The **catalog** is better behaved than the manifest. `.claude-plugin/marketplace.json` is read by all
four, so keep one catalog there regardless of which plugin manifests you ship.

What differs per client — install commands, default marketplaces, VS Code's `chat.plugins.*`
settings, Codex's new-session requirement and missing IDE support, enterprise-managed plugins,
install cache locations, the OpenAI submission route, and the component types each client supports —
is in [`./references/cross-agent-compat.md`](./references/cross-agent-compat.md).

## Publishing procedure

1. **Choose the format** for the clients you intend to reach — see
   [Choose the manifest format](#choose-the-manifest-format). Everything below branches on it.
2. **Decide the publish set.** Filter skills by the repo's visibility policy — see
   [Visibility mapping](#visibility-mapping). A published plugin must never carry a skill the repo
   marks as local-only.
3. **Choose the plugin root.** Under the Claude format, simplest is the repo root, which then doubles
   as the marketplace root and makes the plugin entry's `source` `"./"`. Under Agent Plugins, or for
   the OpenAI portal, the plugin root is a **staged directory** holding `plugin.json` and a `skills/`
   containing copies of exactly the publishable skills, because neither route can enumerate a subset
   or resolve outside the root.
4. **Write the manifests.** Claude format: `.claude-plugin/plugin.json` plus
   `.claude-plugin/marketplace.json`, with only `plugin.json` inside `.claude-plugin/` and component
   directories at the plugin root. Agent Plugins: root `plugin.json` with the canonical `$schema`,
   plus `mcp.json` if the plugin ships MCP servers. See
   [`./references/manifests.md`](./references/manifests.md) for the Claude schemas, all `source`
   types, and `strict` mode, and
   [`./references/agent-plugins-spec.md`](./references/agent-plugins-spec.md) for the portable one.
5. **Generate the publish set, do not hand-maintain it.** Under the Claude format, derive the
   enumerated paths from the visibility metadata the skills already carry, commit the generated
   manifests, and add a drift check to CI so adding a skill without regenerating fails the build.
   Under Agent Plugins, the equivalent is the staging step: derive what gets copied from the same
   metadata, and assert the staged directory afterwards.
6. **Choose the release model** — see [Releasing](#releasing).
7. **Prove the install before announcing it.** Add the marketplace, install, confirm the expected
   skill count, and confirm no local-only skill leaked. Do this **once per client the marketplace
   claims to support**. Then check the always-on cost: every published skill's `description` loads
   into **every session**, so the publish set is a token budget, not just a policy question.

The Claude and Copilot flows have a **non-interactive CLI equivalent**, so the proof can be scripted
rather than driven through slash commands in a session. Codex does not: installation runs through the
`/plugins` browser or the ChatGPT apps, and bundled skills only appear after starting a new session,
so budget for a manual check there.

```bash
# Claude Code
claude plugin marketplace add <owner>/<repo>      # add the catalog
claude plugin marketplace list                    # catalogs currently configured
claude plugin install <plugin>@<marketplace>      # note: marketplace NAME, not repo
claude plugin list                                # what is installed, and ignored-folder warnings
claude plugin details <plugin>@<marketplace>      # components, descriptions, token cost
/plugin marketplace update                        # refresh it later
/reload-plugins                                   # pick up non-skill component changes in-session

# Copilot CLI
copilot plugin marketplace add <owner>/<repo>
copilot plugin install <plugin>@<marketplace>
copilot plugin list
```

**The `@` suffix is the marketplace's `name` field, not the repo.** A catalog added as
`<owner>/<repo>` installs as `<plugin>@<name-from-marketplace.json>`, and the two are usually
different strings. Read the name out of the manifest rather than guessing it from the add command.

Skills namespace as `/<plugin>:<skill>`, so the plugin name is a user-visible prefix on every skill.
Keep it short. This is also why a skill's own owner-prefix stays useful: it lets the same directories
be consumed both as plain skills and as plugin skills with no rename.

## Releasing

**There is no build artifact.** For the git-based source types, the client clones the repo and copies
the plugin directory into its cache. Nothing is compiled, bundled, or uploaded. "Releasing" is
therefore purely a versioning decision:

| Model | How | When to choose it |
| --- | --- | --- |
| **Rolling** | Omit `version` entirely; every commit to the tracked ref is a new version, keyed by commit SHA. | Internal or actively-developed plugins. Release == merge. |
| **Pinned** | `plugin.json.version` is bumped on every release. | The repo already has real releases — a version file, a changelog, a conventional-commit bump tool. The plugin manifest becomes **one more manifest in the existing version-sync set**, and the release flow is the one the repo already has. |

Pick **pinned** whenever the repo already versions itself; wire the plugin version into the existing
bump rather than maintaining a second, divergent version. Users then receive the release on their next
marketplace update or background auto-update.

One subtlety with `"source": "./"`: the content served is whatever the marketplace clone's ref holds,
so a *fresh* install between releases serves newer default-branch content under the older version
label. Existing users correctly stay cached until the version bumps, so this is a label skew, not a
correctness bug. For a hard-pinned channel, give the plugin entry an explicit git source with a
`ref` on a release tag instead of `"./"`, at the cost of bumping that ref every release.

Stable/latest channels are built the same way: two marketplaces pointing at different refs of the same
repo. **Each channel must resolve to a different version**, or the client treats them as identical and
skips the update.

Full detail — version resolution, auto-update tokens, channels, cache lifetime:
[`./references/releasing.md`](./references/releasing.md).

## Visibility mapping

A repo that already tiers its skills for sharing maps straight onto the hosting model. The tiers below
use this repo's vocabulary (`repo-local` / `organization` / `public`, owned by the sharing spec);
substitute the equivalent tiers of whatever policy the repo runs.

| Tier | Marketplace form | Mechanism |
| --- | --- | --- |
| `public` | Public git repo; optionally submit to a community marketplace. | `/plugin marketplace add <owner>/<repo>` |
| `organization` | **Private** git repo. | `extraKnownMarketplaces` (Claude) or `chat.plugins.marketplaces` (VS Code) pre-registers it for teammates; background auto-update needs a token env var, since credential helpers are not available at startup. |
| `repo-local` | Never published. A local `directory`/`file` source stays fully offline if you want it loadable at all. | Must be **excluded** from the published `skills` list. |

The tier is enforced by **what the artifact contains**: the enumerated paths under the Claude format,
the staged `skills/` directory under Agent Plugins. No client has a notion of skill-level
visibility — each publishes whatever the manifest lists. That makes the generator in step 4 the actual
enforcement point, and the CI drift check the thing that keeps it honest.

See [`./references/visibility-and-hosting.md`](./references/visibility-and-hosting.md) for private-repo
credentials, `extraKnownMarketplaces`, air-gapped sources, and the public marketplaces.

## Gotchas

- **A plugin bundling many skills costs tokens in every session**, because all their descriptions load
  at discovery. Bundling everything into one plugin keeps intra-repo skill dependencies from crossing a
  plugin boundary, which is usually the right trade — but it makes description discipline a
  distribution concern, not just a style one. Measured on this repo's first publish: **47 skills,
  ~4,710 always-on tokens**, so budget roughly **100 tokens per published skill** and treat an
  outlier description as a real cost. `claude plugin details` prints the per-skill breakdown, which is
  the fastest way to find the descriptions worth trimming.
- **`marketplace add` writes `extraKnownMarketplaces` into user settings.** The manual add and the
  org-wide pre-registration described under [Visibility mapping](#visibility-mapping) are not two
  mechanisms — pre-registering is just shipping the entry the add command would have written.
- **It clones over SSH when git is configured for SSH**, not the HTTPS path the credential docs
  centre on. For a private-repo marketplace that changes which credential has to work: interactive
  installs go through `ssh-agent` and `known_hosts`, while background auto-update still needs the
  token env var, because it runs without either.
- **`strict: false` plus a `plugin.json` that declares components is a hard load failure.** Choose one
  authority: the manifest (`strict: true`, the default) or the marketplace entry (`strict: false`).
- **Relative `source` paths break in URL-distributed marketplaces.** If users add the marketplace by a
  direct URL to `marketplace.json`, only that file is fetched, so `"./…"` cannot resolve. Use a git or
  npm source for URL-based distribution.
- **Components inside `.claude-plugin/` are not found.** Only `plugin.json` goes there.
- **An unknown top-level field is fatal under Agent Plugins, harmless under the Claude format.** The
  portable schema is closed, so a stray `skills` or `hooks` key makes the manifest invalid rather than
  ignored. Client-specific data belongs under `extensions.<reverse domain>`.
- **A root `plugin.json` changes which semantics Copilot and VS Code use.** It wins their search
  order, so adding one to reach Codex silently switches those two off the enumeration-based publish
  set and onto wholesale `skills/` discovery.
- **Codex needs a new session after install.** Bundled skills do not appear in the session that
  installed the plugin, which reads as a broken install if you do not expect it.
- **Codex has no plugin support in the IDE extension**, only the CLI and the ChatGPT apps.
- **The OpenAI portal rejects Claude-isms.** Live artifacts and `user_config` expansion do not
  transfer, local MCP servers must be redeployed behind public HTTPS, and skill text wants
  provider-neutral wording such as "the model" rather than naming one vendor.
- **Editing a `SKILL.md` takes effect immediately; other components do not.** Run `/reload-plugins`.
- **Do not write state into the plugin directory.** Its path changes on every update. Use the plugin's
  persistent data directory.
- **A project-level skill of the same name shadows the plugin's.** Copilot CLI and VS Code resolve
  skills and agents first-found, with project-level components winning over plugin ones.

## Validation

Before announcing a marketplace:

- The format matches the clients being claimed, and each claimed client's detection order actually
  finds the manifest you ship.
- The publish set matches the repo's visibility policy — no local-only skill is enumerated under the
  Claude format, and none is present in a staged `skills/` directory.
- The manifests are generated, committed, and covered by a drift check in CI.
- `version` appears in exactly one place, and the release flow bumps it.
- A real install from the hosted marketplace produces the expected skill count, in **each client the
  marketplace claims to support**.
- Skills still validate against the repo's own skill and sharing validators — publishing changes
  packaging, not authoring standards.

## References

- [`./references/manifests.md`](./references/manifests.md) — the Claude-format `plugin.json` and
  `marketplace.json` schemas, every `source` type, path-behavior rules, `strict` mode.
- [`./references/agent-plugins-spec.md`](./references/agent-plugins-spec.md) — the portable Agent
  Plugins 1.0 schema, `mcp.json`, fixed component discovery, path containment, client conformance,
  and why publishing a subset becomes a staging problem.
- [`./references/cross-agent-compat.md`](./references/cross-agent-compat.md) — per-client manifest
  detection order, catalog locations, commands, settings, install locations, default marketplaces,
  the OpenAI submission route, enterprise-managed plugins, and the client-specific fields.
- [`./references/releasing.md`](./references/releasing.md) — version resolution, update and
  auto-update, release channels, the install cache.
- [`./references/visibility-and-hosting.md`](./references/visibility-and-hosting.md) — public, private,
  org-wide, and offline hosting; credentials and tokens.
- Upstream, authoritative and worth re-reading when a detail matters. This area moves: the portable
  standard is newer than the client-specific formats, and client support for it arrives unevenly, so
  re-read rather than trusting a cached summary.
  <https://agent-plugins.org/specification>,
  <https://code.claude.com/docs/en/plugins>,
  <https://code.claude.com/docs/en/plugins-reference>,
  <https://code.claude.com/docs/en/plugin-marketplaces>,
  <https://developers.openai.com/plugins/build/plugins>,
  <https://developers.openai.com/plugins/guides/submit-claude-plugin>,
  <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference>,
  <https://code.visualstudio.com/docs/agent-customization/agent-plugins>.
- `ref-sp-agents-shareable-skills` — the sharing spec whose visibility tiers gate what may be published.
- `ref-sp-agents-hooks` — authoring the hooks a plugin may carry, including Codex.
- `ref-sp-dev-package-management` — multi-manifest version sync, which the plugin manifest joins.
