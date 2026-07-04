# Skill Standardization Spec

Normative reference for how skills in this repo are **named**, **described in frontmatter**,
**scoped**, **shared**, **vendored**, and **validated**. This is the single source of truth;
other skills (notably `ref-skills-authoring`) point here instead of restating these rules.

Rules are stated as requirements. Each carries a short *why* because several rules exist to
avoid concrete failure modes; the full rationale and decision log live in the local task brief
`.agents/tasks/skill-standardization-spec/README.md`.

> **Migration status (read first).** The repo is mid-migration to this spec. Current skills still
> use the legacy keys `metadata.agentic-tools-category` and `metadata.shareable-skills.*`, and are
> not yet renamed with an owner prefix. This document describes the **target** schema and the
> **staged** path to it (see §9). Do not bulk-rename or hard-fail validation until the phase that
> allows it. When authoring a *new* skill today, prefer the target schema where it does not break
> the legacy validator, and record intent when unsure.

---

## 1. The problem this solves

The repo accumulated **three overlapping vocabularies** for the same concepts: the name prefix,
`metadata.agentic-tools-category`, and `metadata.shareable-skills.*`. Three names for "scope" and
two for "deps" drift. This spec collapses them into **one canonical schema enforced by a
validator**, so metadata cannot lie.

**Hard platform constraint:** the Agent Skills spec treats `metadata` as a **string→string map**.
Custom *top-level* frontmatter keys are ignored by compliant loaders, and metadata values **cannot
be YAML lists or nested objects**. Therefore every custom field nests under `metadata` and is
string-encoded; conceptual lists are comma-delimited strings.

---

## 2. Name grammar

- **Reference skills:** `ref-<owner-prefix>-<scope>-[template-]<topic>`
- **Tool skills:** `tool-<owner-prefix>-<verb>[-<topic>]` — the first topic segment is an **action verb**.
- **Reserved token** `template` is an optional kind-segment placed **immediately after scope**
  (e.g. `ref-sp-dev-template-react-next`).

The first segment is a **type axis** describing what the agent *does* with the skill:
`ref-` = read for knowledge, `tool-` = run to perform an action.

**Rules:**

- The `name` must satisfy the Agent Skills spec: 1–64 chars, lowercase letters/numbers/hyphens
  only, no leading/trailing hyphen, no consecutive hyphens, and it must equal the folder name.
- The `name` is **derived from and validated against** `metadata.owner-prefix` + `metadata.scope`.
  A mismatch is a validation failure. *Why:* metadata is canonical; the name is a checked
  projection of it, so the two cannot diverge.
- Tools carry `owner-prefix` but **not** `scope`, and lead with a verb. *Why:* tools are
  cross-cutting actions, not domain knowledge; refs are domain knowledge, so they carry scope.
- Do **not** encode shareability, repo-namespace, or vendoring status in the name; those live in
  metadata. *Why:* the name is the discovery/trigger surface and must stay focused on what the
  skill does.
- `template` is a **name segment, not a `template-` type prefix**. Choose one mechanism, never
  both. *Why:* it still `ref` (you read it to then scaffold); a segment gives visible grouping
  (`ref-sp-dev-template-*` sort together) without proliferating type prefixes.

**Why the owner prefix is on every skill:** collision avoidance. Because the prefix is baked in
*at creation*, a skill vendored into a foreign repo cannot collide with that repo's
`ref-acme-...` or `tool-commit`. This is exactly what makes vendoring a **pure copy with no
rename** (§7); renaming on vendor would sever identity and break drift detection.

---

## 3. Frontmatter schema (canonical)

All custom fields nest under `metadata` and are strings. Conceptual lists are comma-delimited.

```yaml
metadata:
  owner-prefix: "sp"                            # short token used in the name
  owner: "swiftpostslabs/agentic-tools"         # canonical home — the REPO, not just the org
  scope: "agents"                               # from the scopes registry (§4); HARD-validated
  tags: "ci, github"                            # advisory grouping (§4); any tag passes
  visibility: "organization"                    # repo-local | organization | public (§6)
  license: "MIT"                                # REQUIRED iff visibility: public; soft otherwise
  report-to: ""                                 # optional upstream channel (§8)
  requires: "ref-sp-dev-git-commits"            # HARD deps, comma-delimited; missing => fail (§5)
  suggests: "ref-sp-dev-docs-authoring"         # SOFT deps, comma-delimited; may be absent (§5)
  # vendored copies only — owner stays UPSTREAM:
  vendored-sha: "a1b2c3d"                        # source commit the copy was taken at (§7)
  vendored-time: "2026-07-04"                    # when it was vendored (§7)
  # forks only:
  forked-from: "upstream/repo@sha"               # provenance when you take ownership (§7)
```

Field notes:

- **`owner-prefix` + `owner`** replace the ambiguous single "org" idea: prefix is the name token,
  `owner` is the canonical home. `owner` is the **repo** because `report-to` derivation and
  drift-checks resolve against a repo, not an org.
- **`requires` vs `suggests`** — see §5.
- **`license`** is required the moment `visibility` is `public` because publishing needs an
  explicit license; below public it is a soft warning.

### Legacy → target key mapping (during migration)

| Legacy key | Target key |
| --- | --- |
| `agentic-tools-category` | `scope` (richer, registry-driven) |
| `shareable-skills.visibility: shareable` | `visibility: organization` or `public` |
| `shareable-skills.visibility: repo-local` | `visibility: repo-local` |
| `shareable-skills.requires` | `requires` |
| `shareable-skills.reason` | keep as an inline note / `reason` where useful |

---

## 4. Scopes and tags

**Scope** is a single token in the name that names the skill's **primary subject** — what a person
would browse under to find it. It is an **open, growing, registry-driven** vocabulary.

- The **scopes registry** (this skill's `references/registry.json`) is the single source of truth. JSON is
  used (not YAML) so the TypeScript validators and any other tooling can read it without a parser
  dependency. Each scope entry carries a `description` and a `belongsWhen` question an agent can
  evaluate. Example:

  ```json
  {
    "phase": 0,
    "scopes": {
      "rust": {
        "description": "The Rust language and toolchain.",
        "belongsWhen": "Is this mainly about Rust itself, not a feature/domain that merely uses Rust?"
      }
    },
    "reservedTokens": ["template"],
    "tags": ["ci", "github", "docs", "testing", "release"],
    "scopeAliases": { "app": "js", "github": "dev", "supabase": "platform" },
    "aliases": {}
  }
  ```

  `phase` controls validator strictness during migration (§9); `scopeAliases` map legacy categories
  to target scopes; `aliases` is the frozen old-name → new-name skill map (§9).

- Scope deliberately mixes two axes; pick the **primary subject** for the name and push the other
  axis into `tags`:
  - Stack/language axis: `py`, `js`, and on-demand `rust`, `cpp`, `java`, …
  - Domain/concern axis: `db`, `platform`, `ops`, `agents`, `dev` (catch-all), `biz`, `ai`,
    `llm`, `ml`, `nlp`, `data`, `seo`, …
- **Tiebreak (multi-axis):** choose the scope of the primary subject.
  - "Rust borrow/ownership patterns" → `rust`.
  - "Rust data-pipeline patterns" → `data`, `tags: rust`.
  The validator cannot judge this; tags make a wrong guess recoverable by search.

**Scope definitions that matter (with their `belongs-when`):**

- **`db`** — database *concepts* (modeling, normalization, transactions), language-agnostic. **Not**
  products. `belongs-when`: "Is this a general database concept, not a specific product?"
- **`platform`** — managed third-party *products you build on* (Supabase, Firebase, AWS, GCP,
  Azure, Vercel, Netlify). `belongs-when`: "Is this about a specific managed platform/service,
  rather than a general concept or a language?"
- **`ops`** — operational *activities* (CI, GitHub Actions, deploy, monitoring). `belongs-when`:
  "Is this an operational activity you perform, rather than a product or concept?"
  - `platform` vs `ops` = **subject vs activity.** "supabase-js CRUD" → `platform`, `tags: supabase`.
    "deploy to AWS via GitHub Actions" → `ops`, `tags: aws`. Never fold platforms into `ops` — it
    would turn `ops` into "anything cloud." If `platform` grows too broad, split it into
    `baas`/`cloud` later via the registry.
- **`agents`** — agent/skill/hook tooling and this skill system. `belongs-when`: "Is this about an
  *agent operating* a mechanism, rather than humans/teams managing work?"
- **`biz`** — humans/teams managing work and knowledge: task management incl. classification
  (engineering/bug/story), Jira, Trello, Notion, Obsidian, roadmaps.
  - Disambiguation vs `agents`: `ref-agents-local-tasks` is about *agents* operating
    `.agents/tasks/` → `agents`. "How we triage in Jira" → `biz`.
- **AI family** (crisp, they overlap): `llm` = prompting/context/tool-use/agents-as-LLM;
  `ml` = classical training/modeling; `nlp` = language processing broadly; `ai` = catch-all for
  AI concepts with no sharper home (keep even alongside the others).
- **`dev`** — catch-all; absorbs today's leaked buckets (`git`, `github`, `docs`, `code`,
  `projects`) unless a sharper scope applies. Specifics go in `tags`.

**Validation strictness:**

- **Scope is hard-validated** against the registry; unknown scope → **fail**, with the growth
  note: *"`<scope>` isn't registered. The vocabulary is intentionally growing — open an issue
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
- A `shareable` (organization/public) skill must not hard-depend on a `repo-local` skill.

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
  a machine-actionable channel exists. Ties into `.agents/skills/ref-agents-local-tasks/SKILL.md`.
- **`report-to` (optional)** — a URI-scheme string (`mailto:...` or a tracker/issues URL). A
  machine picks the delivery channel by scheme, then tells the user how to send it.
- **Do not auto-derive `report-to` from `owner`.** Deriving `https://github.com/<owner>/issues`
  assumes `owner` is always a GitHub org/repo, which may not hold. So: local task always;
  `report-to` only when explicitly set.
- **Duties split:** local task = record; `report-to` = delivery. Not either/or.

---

## 9. Migration (staged; do not skip ahead)

Renaming touches many **reference surfaces**; all must move atomically:

1. folder name (= skill name)
2. frontmatter `name:`
3. `requires`/`suggests` in *other* skills
4. `$SKILLS_FOLDER/<name>` paths in bodies
5. cross-links in skill bodies
6. the catalog in `.github/copilot-instructions.md`, `GEMINI.md`, `.claude/CLAUDE.md`
7. the CLI/config that lists or links skills (`.agents/config.json`, `src/agentic_tools/features/skills`)

**Phases:**

- **Phase 0** — land this spec + the registry + a validator in **warn-only** mode. Nothing breaks.
- **Phase 1** — **frontmatter enrichment only** (additive, safe): add `owner-prefix`, `owner`,
  `scope`, `tags`, `visibility`; migrate legacy keys per the §3 table. No renames → no breakage.
- **Phase 2** — bulk **rename** with a name-map, updating all 7 surfaces in one pass. Keep an
  **alias map** (old-name → new-name) the CLI honors so a missed reference resolves instead of
  hard-breaking. This includes `ref-swiftpost-*` → `ref-sp-<scope>-*` (the old `swiftpost` name
  signal for "repo-local" is now carried by `visibility: repo-local`).
- **Phase 3** — flip the validator to **hard-fail**.

**Aliases are permanent.** Keep a frozen `aliases:` section in the registry indefinitely — cheap
insurance for anyone who vendored a skill during the transition and still references old names.

The meta-skills eat their own dog food: they take the `sp` prefix and `agents` scope
(`ref-sp-agents-shareable-skills`, `ref-sp-agents-skills-authoring`).

---

## 10. Validation rules (the sharing-spec validator)

These are the **sharing-spec** rules — naming grammar, scope, visibility, deps, and vendoring. They
are validated by *this skill's* validator, `./scripts/validate-sharing.mts` (TypeScript, Node >= 22),
which reads this skill's `references/registry.json`. It is **separate from and non-overlapping with** the
general skill-quality validator owned by `ref-skills-authoring`
(`validate-skill.mts`: trigger quality, structure, progressive disclosure, and general `name`
well-formedness such as charset, length, and folder-match). A skill can be an excellent skill and
fail this spec, or vice versa; run both validators. See §11 for how the two skills relate.

- `name` matches `type + owner-prefix + scope (+ optional template) + topic`, and equals the folder
  name → else **fail**. (General charset/length/folder-match well-formedness is the authoring
  validator's job; this check adds the grammar-vs-metadata projection on top.)
- `scope` exists in the registry → else **fail** (with the growth note, §4).
- Each `requires` entry resolves to an existing skill → else **fail** (§5).
- `suggests` entries may be absent → never fails.
- A `shareable` (organization/public) skill does not hard-depend on a `repo-local` skill → else
  **fail** (§5, §6).
- `visibility: public` has a `license` → else **fail**; below public, missing license is a soft
  warn (§6).
- Unknown `tags` → soft warn only, any tag passes (§4).
- Vendored copies (`vendored-sha` present) keep `owner` as upstream and carry a read-only body
  banner → else warn (§7).
- During migration, unknown legacy keys and un-renamed names are tolerated per the current phase
  (§9); the validator escalates to hard-fail only at Phase 3.

---

## 11. Relationship to `ref-skills-authoring`

The two meta-skills are **complementary but independent**, and neither hard-depends on the other.

- **`ref-skills-authoring`** owns *how to make a good skill in general, from the agent's
  perspective*: boundary, description/trigger quality, progressive disclosure, structure,
  evaluation. Its validator is `ref-skills-authoring/scripts/validate-skill.mts`.
- **`ref-shareable-skills`** (this spec) owns *how to name, share, and vendor a skill according to
  our standardization spec*: owner prefix, scope registry, visibility, deps semantics, vendoring.
  Its validator is `ref-shareable-skills/scripts/validate-sharing.mts`.
- The dependency between them is **soft (`suggests`), not hard (`requires`).** *Why:* you can
  author an excellent skill that is deliberately `repo-local` and never touches the sharing spec,
  and you can share a skill whose general quality is reviewed elsewhere. Forcing a hard dep would
  wrongly couple "make a good skill" to "share a skill our way."
- Run **both** validators when a skill should be both good *and* shareable; run only the authoring
  validator for a `repo-local` skill that never leaves.
