---
name: tool-sp-create-skill
description: "Guided intake for creating one new skill: scope, name, description, visibility, and a minimal first draft. Use when adding a skill, scaffolding a skill folder, or turning repeated guidance into a skill."
argument-hint: "Skill goal, preferred name if known, whether the skill should be reference-style or tool-style, and any intended domain grouping"
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.requires: "ref-sp-agents-skills-authoring"
---

# Create Skill

Creates one new skill that follows `ref-sp-agents-skills-authoring` (read it first). If an existing
skill should cover the request, use `tool-sp-maintain-skills` instead; to change an existing
skill's portability, `tool-sp-make-skill-shareable`.

## Steps

1. Check the existing skills for overlap. If one already covers most of it, stop and ask whether to
   extend that skill instead: every skill costs listing budget.
2. Ask only what the request leaves open (questions below), a few at a time.
3. Name it per the sharing spec (`ref-sp-agents-shareable-skills`): `ref-` for guidance,
   `tool-` for a workflow the user invokes. Take the domain from that skill's
   `references/registry.json`; open a registry issue rather than inventing a domain.
4. Set `visibility` (`public` needs a top-level `license`), `requires` for hard skill dependencies,
   `suggests` for optional ones. Metadata values are comma-separated strings, not lists.
5. Draft from the authoring skill's `references/template.md`: one `SKILL.md`, a 150–300 character
   description, only the sections the content needs.
6. Add `references/`, `scripts/`, or `assets/` only when the draft needs them.
7. Run `yarn validate` (both validators) and fix the findings.

## Questions

- **Goal:** what repeated task or failure should this skill fix?
- **Role:** reference guidance or a user-invoked workflow?
- **Domain and visibility:** which registered domain; public, organization, or repo-local?
- **Triggers:** what would a user say when they need it?
- **Out of scope:** what neighbouring work should it leave to other skills?
- **Dependencies:** which skills must it rely on, and which are just helpful?

## Gotchas

- Mentioning commands does not make a skill a `tool-`. Most skills are references.
- Shareability and owner go in metadata, never in the name.
- Keep the first version narrow; adjacent workflows belong in their own skill unless inseparable.
- Replace example paths and script names borrowed from another repo with synthetic ones.
