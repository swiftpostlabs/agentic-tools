# Sharing-Spec Checklist

Use this when deciding whether a skill conforms to the sharing spec and can be exported. It covers
the sharing spec only; general skill quality is checked separately via
`.agents/skills/ref-sp-agents-skills-authoring/SKILL.md`. See `./spec.md` for the full rules.

> All portability fields live under the `metadata.shareable-skills.*` namespace (e.g.
> `metadata.shareable-skills.domain`); `license` is top-level. The validator runs at Phase 3
> (hard-fail) and no longer accepts legacy keys.

## Naming

- Does the `name` follow the grammar: `ref-<owner-prefix>-<domain>-[template-]<topic>` or
  `tool-<owner-prefix>-<verb>[-<topic>]`?
- Does the `name` match `shareable-skills.owner-prefix` + `shareable-skills.domain` in metadata, and
  equal the folder name?
- Is shareability / namespace / vendoring status kept out of the name (in metadata instead)?

## Metadata

- Are `shareable-skills.owner-prefix`, `shareable-skills.owner`, `shareable-skills.domain`, and
  `shareable-skills.visibility` present?
- Is `shareable-skills.domain` a registered domain? If not, is opening a registry issue the right
  move rather than inventing an unregistered one?
- Are `shareable-skills.tags` used for the secondary axis (the one that is not the primary subject)?
- Is `shareable-skills.visibility` correct: `repo-local`, `organization`, or `public`?
- If `shareable-skills.visibility: public`, is the top-level `license` set?

## Dependencies

- Does `shareable-skills.requires` list only hard dependencies the skill genuinely needs to work?
- Does every `shareable-skills.requires` entry resolve to an existing skill, and none of them to a
  `repo-local` skill when this skill is shareable?
- Is optional/related material in `shareable-skills.suggests` rather than `shareable-skills.requires`?
- If `shareable-skills.requires` is growing, should the skill be split into a smaller shared core and
  a repo-local layer?

## Vendoring / forking

- If this is a **vendored** copy: does `shareable-skills.owner` still point upstream, are
  `shareable-skills.vendored-sha` and `shareable-skills.vendored-time` present, is the name identical
  to upstream, and is there a read-only body banner?
- If this is a **fork**: does it use your own owner-prefix and name, with `shareable-skills.forked-from`
  recording provenance?
- Are repo-specific commands, paths, and wrappers clearly identified so export decisions are honest?

## Typical fixes

- Mark a skill `repo-local` when it depends on this repo's concrete scripts or policies.
- Split a mixed skill so the reusable core becomes `organization`/`public` and the repo-specific
  layer stays `repo-local`.
- Move optional neighbors from `shareable-skills.requires` into `shareable-skills.suggests`.
- Add a short reason inline when future reviewers would otherwise re-discover the portability
  boundary.
- Add the missing `license` before flipping a skill to `public`.
