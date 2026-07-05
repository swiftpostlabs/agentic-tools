# Adoption Checklist

Use this checklist when transplanting this repo's skills and AI-policy tooling into another repository.

## Project Mode

- Did you identify whether the target is an existing repo, a Python script/tool repo, a Python application repo, an AI-security-only adoption, or another case?
- If the mode was unclear, did you ask instead of assuming?
- Did you recommend the full Python UV starter only for the greenfield Python application case, not for lightweight script or retrofit cases?

## Skills

- Did you copy `ref-sp-agents-skills-authoring` before or alongside other skills so the target repo has a standard for skill quality?
- Did you copy only the generic skills that actually match the target repo's stack and domains?
- Did you avoid copying repo-specific skills unchanged into the target repo?
- If the target repo has analogous packages or layers, did you create its own repo-specific skills instead?
- Did you update commands, package names, frameworks, file paths, and examples to match the target repo?
- Did you update the target repo's top-level instructions so the copied skills are discoverable?
- If you copied the top-level instructions, did you preserve the source `## Personality` section verbatim rather than paraphrasing it?
- If the target repo already existed, did you prefer selective adoption over wholesale copying?

## AI Security

- Did you copy `.agents/config.json` as the source of truth?
- Did you copy the agents-policy generator or an adapted equivalent?
- Did you add the relevant entrypoints or task-runner commands for syncing policy?
- Did you regenerate `.aiexclude`, `.claude/settings.json`, and `.vscode/settings.json` instead of treating them as hand-edited source files?
- Did you update `.claude/CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` or the target repo's equivalent entry points to reference the shared policy model?

## Final Checks

- Are there any stale names from this repo left that do not belong in the target repo?
- Does the policy sync command run successfully in the target repo?
- Does a post-sync `git diff --exit-code -- .aiexclude .claude/settings.json .vscode/settings.json` pass cleanly?
- Is the target repo's skill system now simpler and more discoverable than a raw copy-paste would have been?
