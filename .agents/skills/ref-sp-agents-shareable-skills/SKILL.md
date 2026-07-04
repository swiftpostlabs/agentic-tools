---
name: ref-sp-agents-shareable-skills
description: "Normative spec for how this repo names, describes, scopes, shares, and vendors skills: owner-prefix naming grammar, the scope registry, visibility tiers, dependency semantics, vendoring vs forking, and the sharing-spec validator. Use when: naming or renaming a skill, setting owner/scope/visibility/tags, recording hard vs soft skill dependencies, vendoring or forking a skill from another repo, or validating a skill for export."
metadata:
  owner-prefix: "sp"
  owner: "swiftpostlab/agentic-tools"
  scope: "agents"
  visibility: "organization"
---

# Shareable Skills (Sharing Spec)

## Purpose

Define the single normative spec for how skills in this repo are **named**, **described in
frontmatter**, **scoped**, **shared**, **vendored**, and **validated for export**. This is the
source of truth for the standardization; other skills point here instead of restating it.

This skill owns the **sharing-spec** rules. It does **not** own general skill-quality rules
(trigger quality, structure, progressive disclosure) — those belong to
.agents/skills/ref-sp-agents-skills-authoring/SKILL.md. The two are complementary and independent; neither
hard-depends on the other (see the spec's "Relationship" section).

> **Migration status:** the repo is mid-migration to this spec. Existing skills still use the
> legacy keys `metadata.agentic-tools-category` and `metadata.shareable-skills.*` and are not yet
> renamed with an owner prefix. `./references/spec.md` describes the target schema and the staged
> path to it. Do not bulk-rename or hard-fail validation ahead of the phase that allows it.

## When to use this skill

- Naming or renaming a skill (owner-prefix / scope / template / topic grammar).
- Setting `owner`, `scope`, `tags`, `visibility`, or `license` metadata.
- Recording hard (`requires`) vs soft (`suggests`) skill dependencies.
- Deciding `repo-local` vs `organization` vs `public`.
- Vendoring or forking a skill from another repo, including provenance and read-only handling.
- Validating a skill against the sharing spec before linking, exporting, or publishing.

## Read this first

**`./references/spec.md` is the full normative spec.** Load it whenever you need the exact rules.
The sections below are the always-needed summary; the spec has the detail, examples, and the
legacy→target key mapping.

## Canonical schema (summary)

All custom fields nest under `metadata` as **strings** (the Agent Skills spec treats `metadata` as
a string→string map — no YAML lists or nested objects). Conceptual lists are comma-delimited.

```yaml
metadata:
  owner-prefix: "sp"                         # short token used in the name
  owner: "swiftpostslabs/agentic-tools"      # canonical home — the repo, not just the org
  scope: "agents"                            # from the scopes registry; hard-validated
  tags: "ci, github"                         # advisory grouping; any tag passes
  visibility: "organization"                 # repo-local | organization | public
  license: "MIT"                             # required iff visibility: public
  requires: "ref-sp-dev-git-commits"         # hard deps; missing => validator fails
  suggests: "ref-sp-dev-docs-authoring"      # soft deps; may be absent
  # vendored copies only (owner stays upstream): vendored-sha, vendored-time
  # forks only: forked-from
```

## Naming grammar (summary)

- refs: `ref-<owner-prefix>-<scope>-[template-]<topic>`
- tools: `tool-<owner-prefix>-<verb>[-<topic>]` (first topic segment is an action verb)
- `template` is a reserved kind-segment right after scope, never a `template-` type prefix.
- The name is derived from and validated against `owner-prefix` + `scope`; mismatch is a failure.
- The owner prefix is on every skill for collision avoidance, which is what lets vendoring be a
  pure copy with no rename. Read `./references/spec.md` §2.

## Scope and tags (summary)

- `scope` is one token naming the skill's **primary subject**, drawn from the growing scopes
  registry (`./references/registry.json`). Unknown scope => hard fail, with a "vocabulary is
  growing, open an issue" note.
- Scope mixes a stack axis (`py`, `js`, `rust`, …) and a domain axis (`db`, `platform`, `ops`,
  `agents`, `dev`, `biz`, `ai`, `llm`, `ml`, `nlp`, `data`, `seo`, …). Pick the primary subject;
  push the other axis into `tags`.
- Key distinctions: `db` = database *concepts* (not products); `platform` = managed products you
  build on (Supabase, Firebase, AWS, Vercel); `ops` = operational *activities* (CI, deploy).
  `platform` vs `ops` = subject vs activity. Read `./references/spec.md` §4 for `belongs-when`
  questions and the full list.
- `tags` are advisory: any tag passes, unknown tags get a soft nudge only.

## Dependencies (summary)

- `requires` = hard deps the skill genuinely needs; validator fails if missing; reference them from
  the body via `$SKILLS_FOLDER/<name>`. Keep the list short or split the skill.
- `suggests` = soft deps: optional/richer info that may be absent; reference by name only.
- A shareable (organization/public) skill must not hard-depend on a `repo-local` skill.

## Visibility (summary)

- `repo-local` — this repo only; the linker rejects export.
- `organization` — org-wide; symlink from `~/.claude/skills` into projects.
- `public` — anywhere + marketplace; **requires `license`**.
- Operational model: your own org/public skills = symlink from home; foreign skills you consume =
  vendor-copy with provenance. Read `./references/spec.md` §6.

## Vendoring vs forking (summary)

- **Symlink** = the skill is the source; no provenance metadata.
- **Vendor** = copy that respects upstream: `owner` stays upstream, add `vendored-sha` +
  `vendored-time`, keep the name identical (so drift checks work), and add a read-only body banner.
  Do not edit a vendored skill — route the change upstream.
- **Fork** = you take ownership: a new skill with your own owner-prefix and name, plus optional
  `forked-from`. Read `./references/spec.md` §7–§8.

## Defaults

- Prefer `organization`/`public` when the skill moves to another repo with light adaptation and
  without dragging repo-only wrappers. Prefer `repo-local` when it depends on this repo's specific
  scripts, policies, layout, or adoption workflow.
- Keep `requires` short. Prefer splitting a mixed skill over marking a broadly useful core
  `repo-local` because one section is repo-tied.
- Do not encode shareability, namespace, or vendoring status in the name — those live in metadata.

## Validation (sharing-spec validator only)

Run `./scripts/validate-sharing.mts` (TypeScript, needs Node >= 22). It reads the scope registry
from `./references/registry.json` and the `phase` there controls strictness during migration:

```sh
node ./scripts/validate-sharing.mts <skill-dir>
node ./scripts/validate-sharing.mts .agents/skills --all
# from the repo root, the whole catalog via yarn:
yarn validate:sharing        # or `yarn validate` to run both validators
```

This validator checks the **sharing spec** and is separate from the general skill-quality validator
owned by ref-sp-agents-skills-authoring (`validate-skill.mts`). Run both when a skill should be good *and*
shareable.

- `name` matches `type + owner-prefix + scope (+ template) + topic` and equals the folder name.
- `scope` exists in the registry (else hard fail); unknown `tags` warn only.
- Every `requires` entry resolves to an existing skill; a shareable skill does not hard-depend on a
  `repo-local` skill.
- `visibility: public` carries a `license`.
- Vendored copies keep `owner` upstream and carry a read-only body banner.
- During migration, legacy keys and un-renamed names are tolerated per the current phase; hard-fail
  only at Phase 3. Full rules in `./references/spec.md` §10.

## References

- `./references/spec.md` — the full normative spec (load for exact rules, examples, migration).
- `./references/checklist.md` — quick pass before finalizing sharing metadata on a skill.
- `./scripts/validate-sharing.mts` — the sharing-spec validator (TypeScript, Node >= 22).
- `./references/registry.json` — the scopes/tags/aliases registry and migration `phase`.
- .agents/skills/ref-sp-agents-skills-authoring/SKILL.md — general skill-quality authoring (complementary).
- .agents/skills/tool-sp-make-skill-shareable/SKILL.md — guided shareability decision for a skill.
- `.agents/tasks/skill-standardization-spec/README.md` — decision log and rationale (local, may be absent).
