# Sharing-Spec Checklist

Use this when deciding whether a skill conforms to the sharing spec and can be exported. It covers
the sharing spec only; general skill quality is checked separately via
`.agents/skills/ref-sp-agents-skills-authoring/SKILL.md`. See `./spec.md` for the full rules.

> During migration, skills may still carry legacy keys (`agentic-tools-category`,
> `shareable-skills.*`) and un-renamed names. Check against the phase the repo is currently in
> rather than assuming the fully migrated state.

## Naming

- Does the `name` follow the grammar: `ref-<owner-prefix>-<scope>-[template-]<topic>` or
  `tool-<owner-prefix>-<verb>[-<topic>]`?
- Does the `name` match `owner-prefix` + `scope` in metadata, and equal the folder name?
- Is shareability / namespace / vendoring status kept out of the name (in metadata instead)?

## Metadata

- Are `owner-prefix`, `owner`, `scope`, and `visibility` present (target schema)?
- Is `scope` a registered scope? If not, is opening a registry issue the right move rather than
  inventing an unregistered one?
- Are `tags` used for the secondary axis (the one that is not the primary subject)?
- Is `visibility` correct: `repo-local`, `organization`, or `public`?
- If `visibility: public`, is `license` set?

## Dependencies

- Does `requires` list only hard dependencies the skill genuinely needs to work?
- Does every `requires` entry resolve to an existing skill, and none of them to a `repo-local`
  skill when this skill is shareable?
- Is optional/related material in `suggests` rather than `requires`?
- If `requires` is growing, should the skill be split into a smaller shared core and a repo-local
  layer?

## Vendoring / forking

- If this is a **vendored** copy: does `owner` still point upstream, are `vendored-sha` and
  `vendored-time` present, is the name identical to upstream, and is there a read-only body banner?
- If this is a **fork**: does it use your own owner-prefix and name, with `forked-from` recording
  provenance?
- Are repo-specific commands, paths, and wrappers clearly identified so export decisions are honest?

## Typical fixes

- Mark a skill `repo-local` when it depends on this repo's concrete scripts or policies.
- Split a mixed skill so the reusable core becomes `organization`/`public` and the repo-specific
  layer stays `repo-local`.
- Move optional neighbors from `requires` into `suggests`.
- Add a short reason inline when future reviewers would otherwise re-discover the portability
  boundary.
- Add the missing `license` before flipping a skill to `public`.
