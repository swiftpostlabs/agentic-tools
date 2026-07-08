# Skill Standardization Spec

Normative reference for how skills in this repo are **named**, **described in frontmatter**,
**scoped**, **shared**, **vendored**, and **validated**. This is the single source of truth;
other skills (notably `ref-sp-agents-skills-authoring`) point here instead of restating these rules.

Rules are stated as requirements. Each carries a short *why* because several rules exist to
avoid concrete failure modes; the full rationale and decision log live in the local task brief
`.agents/tasks/skill-standardization-spec/README.md`.

> **Schema status (read first).** The migration to this spec is **complete**: every skill is
> owner-prefix renamed, all portability fields live under the `metadata.shareable-skills.*`
> namespace, and the validator runs at Phase 3 (**hard-fail**). This document describes that live
> schema; §9 is retained as the migration history. The legacy keys (`agentic-tools-category`, bare
> `metadata.<field>`, two-tier `shareable | repo-local` visibility) are retired — the validator no
> longer accepts them.

---

## 1. The problem this solves

The repo accumulated **three overlapping vocabularies** for the same concepts: the name prefix,
`metadata.agentic-tools-category`, and bare `metadata.<field>` keys. Three names for "domain" and
two for "deps" drift. This spec collapses them into **one canonical schema enforced by a
validator**, so metadata cannot lie.

**Hard platform constraint:** the Agent Skills spec treats `metadata` as a **string→string map**.
Custom *top-level* frontmatter keys are ignored by compliant loaders, and metadata values **cannot
be YAML lists or nested objects**. Therefore every custom field nests under `metadata` and is
string-encoded; conceptual lists are comma-delimited strings.

**One namespace for the portability fields.** Because `metadata` is a shared bag that the Agent
Skills spec and third-party tooling also write into, bare keys like `owner`, `scope`, `tags`, or
`license` can silently collide with spec-defined or other-tool keys. So every portability field is
prefixed: `metadata.shareable-skills.<field>` (a flat string key — the dot is part of the key name,
not YAML nesting). A search for `shareable-skills.` returns exactly the portability set as a unit,
and the prefix is self-documenting about which subsystem owns the field. The **only** exception is
`license`, which uses the spec's **top-level** `license` field (§3) — never `metadata`.

---

## 2. Name grammar

- **Reference skills:** `ref-<owner-prefix>-<domain>-<topic>[-template]`
- **Tool skills:** `tool-<owner-prefix>-<verb>[-<topic>]` — the first topic segment is an **action verb**.
- **Reserved token** `template` is an optional kind-**suffix** on the topic, marking an app-level
  scaffold/blueprint skill — guidance that scaffolds or prescribes a whole app or module, whether
  by describing the structure or carrying scaffold files (e.g. `ref-sp-js-next-template`).

The first segment is a **type axis** describing what the agent *does* with the skill:
`ref-` = read for knowledge, `tool-` = run to perform an action.

**Rules:**

- The `name` must satisfy the Agent Skills spec: 1–64 chars, lowercase letters/numbers/hyphens
  only, no leading/trailing hyphen, no consecutive hyphens, and it must equal the folder name.
- The `name` is **derived from and validated against** `metadata.shareable-skills.owner-prefix` +
  `metadata.shareable-skills.domain`. A mismatch is a validation failure. *Why:* metadata is
  canonical; the name is a checked projection of it, so the two cannot diverge.
- Tools carry `owner-prefix` but **not** `domain`, and lead with a verb. *Why:* tools are
  cross-cutting actions, not domain knowledge; refs are domain knowledge, so they carry a domain.
- Do **not** encode shareability, repo-namespace, or vendoring status in the name; those live in
  metadata. *Why:* the name is the discovery/trigger surface and must stay focused on what the
  skill does.
- `template` is a **topic suffix, not a `template-` type prefix**. Choose one mechanism, never
  both. *Why:* it stays `ref` (you read it to then scaffold); a suffix groups the app-level variant
  next to its topic (`ref-sp-js-next` vs `ref-sp-js-next-template`) without proliferating type prefixes.

**Why the owner prefix is on every skill:** collision avoidance. Because the prefix is baked in
*at creation*, a skill vendored into a foreign repo cannot collide with that repo's
`ref-acme-...` or `tool-sp-commit`. This is exactly what makes vendoring a **pure copy with no
rename** (§7); renaming on vendor would sever identity and break drift detection.

---

## 3. Frontmatter schema (canonical)

Every portability field nests under the `metadata.shareable-skills.` namespace and is a string.
Conceptual lists are comma-delimited. `license` is the **only** exception — it uses the spec's
top-level `license` field, not `metadata`.

```yaml
license: "MIT"                                              # top-level; REQUIRED iff public, soft otherwise
metadata:
  shareable-skills.owner-prefix: "sp"                       # short token used in the name
  shareable-skills.owner: "swiftpostlabs/agentic-tools"     # canonical home — the REPO, not just the org
  shareable-skills.domain: "agents"                         # from the domain registry (§4); HARD-validated
  shareable-skills.tags: "ci, github"                       # advisory grouping (§4); any tag passes
  shareable-skills.visibility: "organization"               # repo-local | organization | public (§6)
  shareable-skills.report-to: ""                            # optional upstream channel (§8)
  shareable-skills.requires: "ref-sp-dev-git-commits"       # HARD deps, comma-delimited; missing => fail (§5)
  shareable-skills.suggests: "ref-sp-dev-docs-authoring"    # SOFT deps, comma-delimited; may be absent (§5)
  # vendored copies only — owner stays UPSTREAM:
  shareable-skills.vendored-sha: "a1b2c3d"                  # source commit the copy was taken at (§7)
  shareable-skills.vendored-time: "2026-07-04"              # when it was vendored (§7)
  # forks only:
  shareable-skills.forked-from: "upstream/repo@sha"        # provenance when you take ownership (§7)
```

Field notes:

- **`owner-prefix` + `owner`** replace the ambiguous single "org" idea: prefix is the name token,
  `owner` is the canonical home. `owner` is the **repo** because `report-to` derivation and
  drift-checks resolve against a repo, not an org.
- **`domain`** (formerly `scope`) names the knowledge area (§4). It is renamed from `scope` because
  "scope" reads as a near-synonym of *visibility/reach* and, in npm, means the `@org/` namespace;
  `domain` unambiguously names the knowledge area.
- **`requires` vs `suggests`** — see §5.
- **`license`** is required the moment `visibility` is `public` because publishing needs an explicit
  license; below public it is a soft warning. It lives at the **top level** (the Agent Skills spec
  already defines `license` there) — never duplicate it inside `metadata`.

---

## 4. Domains and tags

**Domain** (`metadata.shareable-skills.domain`) is a single token in the name that names the skill's
**primary subject** — what a person would browse under to find it. It is an **open, growing,
registry-driven** vocabulary.

- The **domain registry** (this skill's `references/registry.json`) is the single source of truth. JSON is
  used (not YAML) so the TypeScript validators and any other tooling can read it without a parser
  dependency. Each domain entry carries a `description` and a `belongsWhen` question an agent can
  evaluate. Example:

  ```json
  {
    "phase": 3,
    "domains": {
      "rust": {
        "description": "The Rust language and toolchain.",
        "belongsWhen": "Is this mainly about Rust itself, not a feature/domain that merely uses Rust?"
      }
    },
    "reservedTokens": ["template"],
    "tags": ["ci", "github", "docs", "testing", "release"],
    "domainAliases": { "app": "js", "github": "dev", "supabase": "baas" },
    "aliases": {}
  }
  ```

  `phase` controls validator strictness (§9); `domainAliases` map legacy categories
  to target domains; `aliases` is the frozen old-name → new-name skill map (§9).

- A domain deliberately mixes two axes; pick the **primary subject** for the name and push the other
  axis into `tags`:
  - Stack/language axis: `py`, `js`, and on-demand `rust`, `cpp`, `java`, …
  - Domain/concern axis: `db`, `baas`, `ops`, `agents`, `dev` (catch-all), `biz`, `ai`,
    `llm`, `ml`, `nlp`, `data`, `seo`, …
- **Tiebreak (multi-axis):** choose the domain of the primary subject.
  - "Rust borrow/ownership patterns" → `rust`.
  - "Rust data-pipeline patterns" → `data`, `tags: rust`.
  The validator cannot judge this; tags make a wrong guess recoverable by search.

**Domain definitions that matter (with their `belongs-when`):**

- **`db`** — database *concepts* (modeling, normalization, transactions), language-agnostic. **Not**
  products. `belongs-when`: "Is this a general database concept, not a specific product?"
- **`baas`** — managed backend *products you build on* (Supabase, Firebase, Appwrite).
  `belongs-when`: "Is this about a specific managed backend platform, rather than a database
  concept, an operational activity, or a language?"
- **`ops`** — operational *activities* (CI, GitHub Actions, deploy, monitoring). `belongs-when`:
  "Is this an operational activity you perform, rather than a product or concept?"
  - `baas` vs `ops` = **subject vs activity.** "supabase-js CRUD" → `baas`, `tags: supabase`.
    "deploy to AWS via GitHub Actions" → `ops`, `tags: aws`. Never fold platforms into `ops` — it
    would turn `ops` into "anything cloud." If `baas` grows too broad, split it into
    `baas`/`cloud` later via the registry.
- **`agents`** — agent/skill/hook tooling and this skill system. `belongs-when`: "Is this about an
  *agent operating* a mechanism, rather than humans/teams managing work?"
- **`biz`** — humans/teams managing work and knowledge: task management incl. classification
  (engineering/bug/story), Jira, Trello, Notion, Obsidian, roadmaps.
  - Disambiguation vs `agents`: `ref-sp-agents-local-tasks` is about *agents* operating
    `.agents/tasks/` → `agents`. "How we triage in Jira" → `biz`.
- **AI family** (crisp, they overlap): `llm` = prompting/context/tool-use/agents-as-LLM;
  `ml` = classical training/modeling; `nlp` = language processing broadly; `ai` = catch-all for
  AI concepts with no sharper home (keep even alongside the others).
- **`dev`** — catch-all; absorbs today's leaked buckets (`git`, `github`, `docs`, `code`,
  `projects`) unless a sharper domain applies. Specifics go in `tags`.

**Validation strictness:**

- **Domain is hard-validated** against the registry; unknown domain → **fail**, with the growth
  note: *"`<domain>` isn't registered. The vocabulary is intentionally growing — open an issue
  explaining what and why it matters, then add it to the registry."* Fail, but with a door.
- **Tags are advisory** — any tag passes; emit at most a soft "new tag, consider adding to the
  registry" nudge. The tags registry is for autocomplete/consistency, not gatekeeping.

---

## 5. Dependency semantics

- **`requires`** — hard dependencies. The skill genuinely relies on another skill's instructions
  to work. Comma-delimited string of skill names. The validator **fails** if a required skill is
  missing. Reference a hard dep from the body via `$SKILLS_FOLDER/<skill-name>` (guaranteed
  co-located).
- **`suggests`** — soft dependencies. Richer/optional info that may be absent. Reference a soft dep
  **by name only** (resolve if present). An agent that finds it actually needs one may request it
  or simply proceed.
- Keep `requires` **short**. A growing hard-dependency list means the skill is scoped poorly and
  should be split, or a stable piece moved into a smaller shared dependency.
- Do not use `requires` for optional reading, related references, or nice-to-have neighbors — that
  is what `suggests` is for.
- A skill must not hard-depend on a **lower-visibility** skill. Visibility is ordered
  `repo-local` < `organization` < `public`, and every `requires` target must be at least as visible
  as the skill declaring it: `public` requires only `public`; `organization` requires `organization`
  or `public`; `repo-local` may require anything. This guarantees a skill's hard dependencies travel
  wherever the skill itself can go. (The older rule — "a shareable skill must not require a
  `repo-local` skill" — is the special case of this one.)

---

## 6. Visibility tiers

- **`repo-local`** — this repo/project only. Never leaves; the linker must reject exporting it.
- **`organization`** — applies across the org's projects. May be exported to home/global
  (`~/.claude/skills`) and symlinked into projects (single source, auto-updates). References
  `owner`.
- **`public`** — shareable in any project and publishable to a marketplace. **Requires `license`**
  (hard); the validator demands more of `public` than of `organization`.

*Why three tiers:* the old two-tier (`shareable | repo-local`) could not distinguish
"internal-to-org" from "publish-to-the-world," which carry different requirements and channels.

**Operational model:** your own `organization`/`public` skills = **symlink from home** (single
source, auto-updates); *foreign* skills you consume = **vendor-copy with provenance** (§7).
Vendoring only ever applies to `organization`/`public` skills; `repo-local` is unvendorable.

---

## 7. Vendoring vs forking

Two **distinct** operations. Keeping them distinct is what removes provenance redundancy.

- **Symlink** — the skill *is* the source. **No provenance metadata at all.** Used for your own
  `organization`/`public` skills consumed from `~/.claude/skills`.
- **Vendor (copy, respect upstream)** — `owner` **stays the upstream owner**. Add `vendored-sha`
  and `vendored-time`; their presence flags "this is a pinned copy of `owner`@sha." There is **no
  separate source key** — it would always duplicate `owner`. Under vendoring they can never differ;
  if they would, it is a fork.
  - **Keep the name identical to upstream on vendor.** *Why:* it is what makes the SHA-based drift
    check work (compare against upstream commits touching the skill's folder). Renaming would break
    it — the payoff of baking `owner-prefix` into the name from birth (§2).
  - **Read-only handling:** put a visible **body banner** at the top of a vendored skill —
    `> ⚠️ Vendored copy — do not edit. See metadata.owner; route changes upstream (§8).` — in
    addition to the metadata, because agents reliably read the body.
  - An agent that wants to change a vendored skill must **not** edit it; it records the intended
    edit and routes it upstream (§8).
- **Fork (you take ownership)** — this is a **new skill** with *your* `owner-prefix` and name, plus
  optional `forked-from: "upstream/repo@sha"`. Use this only when you deliberately diverge.

---

## 8. Reporting edits upstream (vendored skills)

- **Always write a local task** in the *consuming* repo's `.agents/tasks/` describing the intended
  edit, its motivation, and the upstream identity — as the audit trail — **regardless** of whether
  a machine-actionable channel exists. Ties into `.agents/skills/ref-sp-agents-local-tasks/SKILL.md`.
- **`report-to` (optional)** — a URI-scheme string (`mailto:...` or a tracker/issues URL). A
  machine picks the delivery channel by scheme, then tells the user how to send it.
- **Do not auto-derive `report-to` from `owner`.** Deriving `https://github.com/<owner>/issues`
  assumes `owner` is always a GitHub org/repo, which may not hold. So: local task always;
  `report-to` only when explicitly set.
- **Duties split:** local task = record; `report-to` = delivery. Not either/or.

---

## 9. Migration (history; completed)

> This section is **retained as history**. The migration is complete: the repo is at Phase 3, every
> skill is renamed, and all portability fields are namespaced under `metadata.shareable-skills.*`.
> Keep it as the rationale for why the `aliases` map is permanent and why renames must move all
> surfaces atomically — useful the next time a bulk rename is needed.

Renaming touches many **reference surfaces**; all must move atomically:

1. folder name (= skill name)
2. frontmatter `name:`
3. `requires`/`suggests` in *other* skills
4. `$SKILLS_FOLDER/<name>` paths in bodies
5. cross-links in skill bodies
6. the catalog in `AGENTS.md`, `GEMINI.md`, `.claude/CLAUDE.md`
7. the CLI/config that lists or links skills (`.agents/config.json`, `src/agentic_tools/features/skills`)

**Phases:**

- **Phase 0** — land this spec + the registry + a validator in **warn-only** mode. Nothing breaks.
- **Phase 1** — **frontmatter enrichment only** (additive, safe): add `owner-prefix`, `owner`,
  `domain`, `tags`, `visibility`; migrate legacy keys to the namespaced schema (§3). No renames → no
  breakage.
- **Phase 2** — bulk **rename** with a name-map, updating all 7 surfaces in one pass. Keep an
  **alias map** (old-name → new-name) the CLI honors so a missed reference resolves instead of
  hard-breaking. This includes `ref-swiftpost-*` → `ref-sp-<domain>-*` (the old `swiftpost` name
  signal for "repo-local" is now carried by `visibility: repo-local`).
- **Phase 3** — flip the validator to **hard-fail**.

**Aliases are permanent.** Keep a frozen `aliases:` section in the registry indefinitely — cheap
insurance for anyone who vendored a skill during the transition and still references old names.

### Consumer transition (two alias layers)

A repo that consumes these skills via the `agentic-tools skills` CLI is bridged across this schema
jump by **two** alias layers, so it keeps working without a manual migration:

1. **Name aliases** (registry `aliases`, above) — renamed skills still resolve. The `sync`/`link`
   flow self-heals the consumer's config old→new and regenerates its `.gitignore` to the new names.
   Migrating names is **our** burden, not the consumer's.
2. **Legacy metadata-key read-compat** (CLI only) — the CLI reads the namespaced
   `metadata.shareable-skills.*` schema but falls back to the old bare keys (`scope`→`domain`,
   `visibility`, `requires`, `reason`) and normalizes the old two-tier `visibility: shareable` →
   `organization`. The namespaced key always wins. This is a **frozen, closed** shim (it is exactly
   the pre-namespace schema and will not grow), kept only in the CLI reader — **not** in the
   sharing validator (§10), which stays Phase-3 strict for this repo's own skills.

   For a consumer's **own** (non-symlinked) skill still on the legacy schema, the CLI is lenient by
   tier: `repo-local`/`organization` get a migration **warning**, while `public` is an **error** at
   the export gate (a published skill must be on the current schema). Symlinked skills are exempt —
   they are ours to migrate.

The meta-skills eat their own dog food: they take the `sp` prefix and `agents` domain
(`ref-sp-agents-shareable-skills`, `ref-sp-agents-skills-authoring`).

---

## 10. Validation rules (the sharing-spec validator)

These are the **sharing-spec** rules — naming grammar, domain, visibility, deps, and vendoring. They
are validated by *this skill's* validator, `./scripts/validate-sharing.mts` (TypeScript, Node >= 22),
which reads this skill's `references/registry.json`. It is **separate from and non-overlapping with** the
general skill-quality validator owned by `ref-sp-agents-skills-authoring`
(`validate-skill.mts`: trigger quality, structure, progressive disclosure, and general `name`
well-formedness such as charset, length, and folder-match). A skill can be an excellent skill and
fail this spec, or vice versa; run both validators. See §11 for how the two skills relate.

All portability fields are read from the `metadata.shareable-skills.*` namespace; `license` is read
from the top level.

- `name` matches `type + owner-prefix + domain (+ optional template) + topic`, and equals the folder
  name → else **fail**. (General charset/length/folder-match well-formedness is the authoring
  validator's job; this check adds the grammar-vs-metadata projection on top.)
- `shareable-skills.domain` exists in the registry → else **fail** (with the growth note, §4).
- Each `shareable-skills.requires` entry resolves to an existing skill → else **fail** (§5).
- `shareable-skills.suggests` entries may be absent → never fails.
- No skill hard-depends on a lower-visibility skill (`repo-local` < `organization` < `public`) → else
  **fail** (§5, §6).
- `shareable-skills.visibility: public` has a top-level `license` → else **fail**; below public,
  missing license is a soft warn (§6).
- Unknown `shareable-skills.tags` → soft warn only, any tag passes (§4).
- Vendored copies (`shareable-skills.vendored-sha` present) keep `shareable-skills.owner` as upstream
  and carry a read-only body banner → else warn (§7).
- The validator runs at Phase 3 (**hard-fail**); legacy keys are no longer accepted (§9).

---

## 11. Relationship to `ref-sp-agents-skills-authoring`

The two meta-skills are **complementary but independent**, and neither hard-depends on the other.

- **`ref-sp-agents-skills-authoring`** owns *how to make a good skill in general, from the agent's
  perspective*: boundary, description/trigger quality, progressive disclosure, structure,
  evaluation. Its validator is `ref-sp-agents-skills-authoring/scripts/validate-skill.mts`.
- **`ref-sp-agents-shareable-skills`** (this spec) owns *how to name, share, and vendor a skill according to
  our standardization spec*: owner prefix, domain registry, visibility, deps semantics, vendoring.
  Its validator is `ref-sp-agents-shareable-skills/scripts/validate-sharing.mts`.
- The dependency between them is **soft (`suggests`), not hard (`requires`).** *Why:* you can
  author an excellent skill that is deliberately `repo-local` and never touches the sharing spec,
  and you can share a skill whose general quality is reviewed elsewhere. Forcing a hard dep would
  wrongly couple "make a good skill" to "share a skill our way."
- Run **both** validators when a skill should be both good *and* shareable; run only the authoring
  validator for a `repo-local` skill that never leaves.
