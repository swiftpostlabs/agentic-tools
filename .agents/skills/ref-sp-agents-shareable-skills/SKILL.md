---
name: ref-sp-agents-shareable-skills
description: "Normative spec for how a repo names, describes, scopes, shares, and vendors skills: owner-prefix naming grammar, the domain registry, visibility tiers, dependency semantics, vendoring vs forking, and the sharing-spec validator. Use when: naming or renaming a skill, setting owner/domain/visibility/tags, recording hard vs soft skill dependencies, vendoring or forking a skill from another repo, or validating a skill for export."
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
---

# Shareable Skills (Sharing Spec)

## Purpose

Define the single normative spec for how a repo **names**, **describes in frontmatter**, **scopes**,
**shares**, **vendors**, and **validates for export** its skills. This is the source of truth for
that standardization; other skills point here instead of restating it. The mechanism is portable —
any repo can adopt it — while the concrete values it fills in (owner prefix, owner, domain registry)
are that repo's own. The values shown throughout are this repo's instantiation.

This skill owns the **sharing-spec** rules. It does **not** own general skill-quality rules
(trigger quality, structure, progressive disclosure) — those belong to the repo's skill-authoring
skill (`ref-sp-agents-skills-authoring` here). The two are complementary and independent; neither
hard-depends on the other (see the spec's "Relationship" section).

> **Schema status (this repo):** the migration is complete here. Every skill is owner-prefix renamed,
> all portability fields live under the `metadata.shareable-skills.*` namespace, and the validator
> runs at Phase 3 (hard-fail). A repo adopting this spec fresh starts at whatever phase it sets in
> its registry. `./references/spec.md` §9 keeps this repo's migration history.

## When to use this skill

- Naming or renaming a skill (owner-prefix / domain / template / topic grammar).
- Setting `shareable-skills.owner`, `shareable-skills.domain`, `shareable-skills.tags`,
  `shareable-skills.visibility`, or the top-level `license`.
- Recording hard (`requires`) vs soft (`suggests`) skill dependencies.
- Deciding `repo-local` vs `organization` vs `public`.
- Vendoring or forking a skill from another repo, including provenance and read-only handling.
- Validating a skill against the sharing spec before linking, exporting, or publishing.

## Read this first

**`./references/spec.md` is the full normative spec.** Load it whenever you need the exact rules.
The sections below are the always-needed summary; the spec has the detail and examples.

## Canonical schema (summary)

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

## Naming grammar (summary)

- refs: `ref-<owner-prefix>-<domain>-<topic>[-template]`
- tools: `tool-<owner-prefix>-<verb>[-<topic>]` (first topic segment is an action verb)
- `template` is a reserved topic suffix marking an app-level scaffold/blueprint, never a `template-` type prefix.
- The name is derived from and validated against `shareable-skills.owner-prefix` +
  `shareable-skills.domain`; mismatch is a failure.
- The owner prefix is on every skill for collision avoidance, which is what lets vendoring be a
  pure copy with no rename. Read `./references/spec.md` §2.

## Domain and tags (summary)

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

## Dependencies (summary)

- `shareable-skills.requires` = hard deps the skill genuinely needs; validator fails if missing;
  reference them from the body via `$SKILLS_FOLDER/<name>`. Keep the list short or split the skill.
- `shareable-skills.suggests` = soft deps: optional/richer info that may be absent; reference by name only.
- A skill must not hard-depend on a **lower-visibility** skill (order: `repo-local` < `organization`
  < `public`). A `public` skill may require only `public`; an `organization` skill may require
  `organization` or `public`; `repo-local` may require anything. This keeps every hard dependency at
  least as portable as the skill that needs it.

## Visibility (summary)

- `repo-local` — this repo only; the linker rejects export.
- `organization` — org-wide; symlink from `~/.claude/skills` into projects.
- `public` — anywhere + marketplace; **requires `license`**.
- Operational model: your own org/public skills = symlink from home; foreign skills you consume =
  vendor-copy with provenance. Read `./references/spec.md` §6.

## Vendoring vs forking (summary)

- **Symlink** = the skill is the source; no provenance metadata.
- **Vendor** = copy that respects upstream: `shareable-skills.owner` stays upstream, add
  `shareable-skills.vendored-sha` + `shareable-skills.vendored-time`, keep the name identical (so
  drift checks work), and add a read-only body banner. Do not edit a vendored skill — route the
  change upstream. Run `./scripts/check-vendored-drift.mts` to detect edited or stale copies.
- **Fork** = you take ownership: a new skill with your own owner-prefix and name, plus optional
  `shareable-skills.forked-from`. Read `./references/spec.md` §7–§8.

## Defaults

- Prefer `organization`/`public` when the skill moves to another repo with light adaptation and
  without dragging repo-only wrappers. Prefer `repo-local` when it depends on this repo's specific
  scripts, policies, layout, or adoption workflow.
- Keep `shareable-skills.requires` short. Prefer splitting a mixed skill over marking a broadly
  useful core `repo-local` because one section is repo-tied.
- Do not encode shareability, namespace, or vendoring status in the name — those live in metadata.

## Validation (sharing-spec validator only)

Run `./scripts/validate-sharing.mts` (TypeScript, needs Node >= 22). It reads the domain registry
from `./references/registry.json` and the `phase` there controls strictness (now Phase 3, hard-fail):

```sh
node ./scripts/validate-sharing.mts <skill-dir>
# point it at the skills root with --all (in this repo, .agents/skills):
node ./scripts/validate-sharing.mts .agents/skills --all
# a repo may wrap it in a package-manager script; this repo exposes:
yarn validate:sharing        # or `yarn validate` to run both validators
```

This validator checks the **sharing spec** and is separate from the general skill-quality validator
owned by the repo's skill-authoring skill (`ref-sp-agents-skills-authoring` here, `validate-skill.mts`).
Run both when a skill should be good *and* shareable.

- `name` matches `type + owner-prefix + domain (+ template) + topic` and equals the folder name.
- `shareable-skills.domain` exists in the registry (else hard fail); unknown `shareable-skills.tags`
  warn only.
- Every `shareable-skills.requires` entry resolves to an existing skill; no skill hard-depends on a
  lower-visibility skill (`repo-local` < `organization` < `public`).
- `shareable-skills.visibility: public` carries a top-level `license`.
- Vendored copies keep `shareable-skills.owner` upstream and carry a read-only body banner.
- Legacy keys are no longer accepted (Phase 3). Full rules in `./references/spec.md` §10.

## References

- `./references/spec.md` — the full normative spec (load for exact rules, examples, migration).
- `./references/checklist.md` — quick pass before finalizing sharing metadata on a skill.
- `./scripts/validate-sharing.mts` — the sharing-spec validator (TypeScript, Node >= 22).
- `./scripts/check-vendored-drift.mts` — flags vendored copies that were edited or whose upstream advanced.
- `./references/registry.json` — the domains/tags/aliases registry and validator `phase`.
- `ref-sp-agents-skills-authoring` — general skill-quality authoring (complementary).
- `tool-sp-make-skill-shareable` — guided shareability decision for a skill.
- `.agents/tasks/skill-standardization-spec/README.md` — decision log and rationale (local, may be absent).
