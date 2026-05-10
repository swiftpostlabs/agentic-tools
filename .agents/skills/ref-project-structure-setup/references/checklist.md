# Review Checklist

- The top-level folder choice matches the responsibility: packaged product code, repo maintenance, agent guidance, or provider routing.
- `pyproject.toml` keeps installed entrypoints under `[project.scripts]` and dev workflows under `[tool.poe.tasks]`.
- The package directory matches the normalized import path, even if the distribution name uses dashes.
- Repo-local helper scripts stay in `scripts/` unless they become part of the packaged product surface.
- Skill support files live beside their `SKILL.md` under `references/`, `assets/`, `evals/`, or `scripts/`.
- Thin provider stubs keep routing back to the main project instructions instead of duplicating rules.