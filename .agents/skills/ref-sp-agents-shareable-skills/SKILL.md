---
name: ref-sp-agents-shareable-skills
description: "The sharing spec for skills: owner-prefix naming, domain registry, visibility tiers, hard vs soft dependencies, vendoring vs forking, and its validator. Use when naming a skill, setting its sharing metadata, or vendoring one from another repo."
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
---

# Shareable Skills (Sharing Spec)

How a repo names, scopes, shares, and vendors its skills: the metadata layer. The mechanism is
portable; the values shown (owner prefix, owner, domain registry) are this repo's. Whether a skill
is any *good* is `ref-sp-agents-skills-authoring`; moving it is `ref-sp-agents-skills-management`
(linking) or `ref-sp-agents-plugin-marketplaces` (publishing); walking one skill through these
rules is `tool-sp-make-skill-shareable`.

The full normative spec is `./references/spec.md`. Read it when you need exact rules, examples, or
`belongs-when` questions for a domain; the sections below are the always-needed summary.

## Canonical schema

Every portability field nests under the `metadata.shareable-skills.` namespace as a **string** (the
Agent Skills spec treats `metadata` as a string→string map — no YAML lists or nested objects; the
dot is part of the flat key name, not YAML nesting). Conceptual lists are comma-delimited. `license`
is the **only** exception — it uses the spec's top-level `license` field, not `metadata`.

```yaml
license: "MIT"                                           # top-level; required iff public
metadata:
  shareable-skills.owner-prefix: "sp"                    # short token used in the name
  shareable-skills.owner: "swiftpostlabs/agentic-tools"  # canonical home — the repo, not just the org
  shareable-skills.domain: "agents"                      # from the domain registry; hard-validated
  shareable-skills.tags: "ci, github"                    # advisory grouping; any tag passes
  shareable-skills.visibility: "organization"            # repo-local | organization | public
  shareable-skills.requires: "ref-sp-dev-git-commits"    # hard deps; missing => validator fails
  shareable-skills.suggests: "ref-sp-dev-docs-authoring" # soft deps; may be absent
  # vendored copies only (owner stays upstream): shareable-skills.vendored-sha, .vendored-time
  # forks only: shareable-skills.forked-from
```

## Naming grammar

- refs: `ref-<owner-prefix>-<domain>-<topic>[-template]`
- tools: `tool-<owner-prefix>-<verb>[-<topic>]` (first topic segment is an action verb)
- `template` is a reserved topic suffix marking an app-level scaffold/blueprint, never a `template-` type prefix.
- The name is derived from and validated against `shareable-skills.owner-prefix` +
  `shareable-skills.domain`; mismatch is a failure.
- The owner prefix is on every skill for collision avoidance, which is what lets vendoring be a
  pure copy with no rename. Read `./references/spec.md` §2.
- Never encode shareability, namespace, or vendoring status in the name; that is metadata.

## Domain and tags

- `shareable-skills.domain` is one token naming the skill's **primary subject**, drawn from the
  growing domain registry (`./references/registry.json`). Unknown domain => hard fail, with a
  "vocabulary is growing, open an issue" note.
- A domain mixes a stack axis (`py`, `js`, `rust`, …) and a concern axis (`db`, `baas`, `ops`,
  `agents`, `dev`, `biz`, `ai`, `llm`, `ml`, `nlp`, `data`, `seo`, …). Pick the primary subject;
  push the other axis into `tags`.
- Key distinctions: `db` = database *concepts* (not products); `baas` = managed backend products you
  build on (Supabase, Firebase, Appwrite); `ops` = operational *activities* (CI, deploy).
  `baas` vs `ops` = subject vs activity. Read `./references/spec.md` §4 for `belongs-when`
  questions and the full list.
- `tags` are advisory: any tag passes, unknown tags get a soft nudge only.

## Dependencies

- `shareable-skills.requires` = hard deps the skill genuinely needs; validator fails if missing;
  reference them from the body via `$SKILLS_FOLDER/<name>`. Keep the list short or split the skill.
- `shareable-skills.suggests` = soft deps: optional/richer info that may be absent; reference by name only.
- A skill must not hard-depend on a **lower-visibility** skill (order: `repo-local` < `organization`
  < `public`). A `public` skill may require only `public`; an `organization` skill may require
  `organization` or `public`; `repo-local` may require anything. This keeps every hard dependency at
  least as portable as the skill that needs it.

## Visibility

Prefer `organization` or `public` when the skill moves to another repo with light adaptation and no
repo-only wrappers; `repo-local` when it depends on this repo's scripts, policies, layout, or
adoption workflow. Rather than marking a broadly useful skill `repo-local` because one section is
repo-tied, split it.

- `repo-local` — this repo only; the linker rejects export.
- `organization` — org-wide; symlink from `~/.claude/skills` into projects, or a **privately hosted**
  marketplace.
- `public` — anywhere + marketplace; **requires `license`**.
- Operational model: your own org/public skills = symlink from home; foreign skills you consume =
  vendor-copy with provenance. Read `./references/spec.md` §6.
- **Publishing to a plugin marketplace is one more export destination**, gated by these same tiers.
  No client has a notion of skill-level visibility — a plugin publishes exactly what its manifest
  enumerates — so the tier is only enforced by generating that list from
  `shareable-skills.visibility` and drift-checking it. The packaging, hosting, and release mechanics
  are owned by `ref-sp-agents-plugin-marketplaces`; do not restate them here.

## Vendoring vs forking

- **Symlink** = the skill is the source; no provenance metadata.
- **Vendor** = copy that respects upstream: `shareable-skills.owner` stays upstream, add
  `shareable-skills.vendored-sha` + `shareable-skills.vendored-time`, keep the name identical (so
  drift checks work), and add a read-only body banner. Do not edit a vendored skill — route the
  change upstream. Run `./scripts/check-vendored-drift.mts` to detect edited or stale copies.
- **Fork** = you take ownership: a new skill with your own owner-prefix and name, plus optional
  `shareable-skills.forked-from`. Read `./references/spec.md` §7–§8.

## Validation

```sh
node ./scripts/validate-sharing.mts <skill-dir>
node ./scripts/validate-sharing.mts .agents/skills --all   # this repo: yarn validate:sharing
```

It enforces everything above: the name grammar, a registered domain, resolvable `requires` at
least as visible as the skill, `license` on `public` skills, and upstream ownership plus a
read-only banner on vendored copies. Strictness comes from the `phase` in
`./references/registry.json`. It is separate from the skill-quality validator; `yarn validate`
runs both.

### Plugin manifest check (`--all` only)

If the repo publishes a plugin (`.claude-plugin/plugin.json`), the validator also checks that
manifest against the catalog. This matters because **the manifest's `skills` list is where the
visibility tiers are actually enforced**: with a marketplace-root source the enumerated paths are the
complete published set, and nothing else stops a `repo-local` skill from shipping. Severity follows
the stakes:

- **Error** — a listed skill is not `public`. Publishing leaks a skill that was never meant to leave,
  and installs are cached on users' machines, so it cannot be recalled.
- **Error** — a listed path is not a skill. Dangling entries silently drop from the published plugin.
- **Error** — the manifest lists the skills *container* while non-public skills exist inside it.
  Listing the container publishes everything in it, tier metadata notwithstanding.
- **Warning** — a `public` skill is missing from the manifest. It will not ship, but a skill can be
  legitimately in flight before its first release, and an omission is recoverable where a leak is not.

A repo with no `.claude-plugin/plugin.json` is unaffected. The manifest's semantics are owned by
`ref-sp-agents-plugin-marketplaces`; this validator only enforces that they agree with the tiers.

## References

- `./references/spec.md`: the full spec, when the summary above isn't enough.
- `./references/registry.json`: domains, tags, aliases, and the validator phase, when choosing a
  domain.
- `./references/checklist.md`: a pass before finalising a skill's sharing metadata.
- `./scripts/check-vendored-drift.mts`: flags vendored copies that were edited or whose upstream
  moved.
