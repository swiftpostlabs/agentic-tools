# Shareable Skill Checklist

Use this checklist when deciding whether an existing skill should be exported or kept local.

- Does the skill declare `shareable-skills.visibility` as `shareable` or `repo-local`?
- If the skill is `repo-local`, is the reason obvious or recorded in `shareable-skills.reason`?
- If the skill is `shareable`, can it move to another repo with only light adaptation?
- Does `shareable-skills.requires` include only hard dependencies rather than optional related skills?
- Does every dependency name in `shareable-skills.requires` exist and resolve to a `shareable` skill?
- If the dependency list is growing, should the skill be split into a smaller shared core and a repo-local layer?
- Are repo-specific commands, paths, and wrappers still clearly identified so export decisions are honest?
- Is there a dry-run or equivalent check showing the linker can resolve the skill and its dependencies?

Typical fixes:

- Mark a skill `repo-local` when it depends on this repo's concrete scripts or policies.
- Split a mixed skill so the reusable guidance becomes `shareable` and the repo-specific layer stays local.
- Remove optional neighbors from `shareable-skills.requires`.
- Add a short `shareable-skills.reason` when future reviewers would otherwise be forced to rediscover the portability boundary.
