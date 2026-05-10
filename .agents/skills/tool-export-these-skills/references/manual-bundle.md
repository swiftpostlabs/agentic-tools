# Manual Bundle Or Copied Skill Folders

Use this mode when the target cannot link skills directly and needs actual copied files.

## Default workflow

1. Select only `shareable` skills unless the user explicitly wants repo-specific content.
2. Add every hard dependency from `shareable-skills.requires`.
3. Copy the full skill folder for each selected skill, including `SKILL.md`, `references/`, `assets/`, `evals/`, and `scripts/` when present.
4. Preserve frontmatter and relative `./references/...` links.
5. Tell the user which repo-specific placeholders or commands still need adaptation in the target.

## Output to provide

- The exact skill folders to copy.
- Any dependencies that came along and why.
- Any repo-local skills that were intentionally excluded.
- A short checklist for validating the copied bundle in the target repo.

## Core rule

Do not summarize a skill when the user needs an actual reusable skill folder. Export the whole folder structure or choose a different mode.
