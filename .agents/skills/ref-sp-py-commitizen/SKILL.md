---
name: ref-sp-py-commitizen
description: "Python Commitizen release workflow guidance. Use when: configuring commitizen in pyproject.toml, choosing version providers, generating changelogs, validating conventional commits, or designing Commitizen-led release commands for Python or mixed Python/Node repos."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "py"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "release"
  shareable-skills.requires: "ref-sp-dev-package-management, ref-sp-dev-git-commits"
---

# Python Commitizen

## Purpose

Guide agents through using the Python `commitizen` package as the owner for conventional commits, semantic version bumps, changelog generation, release tags, and version-file updates.

## When to use this skill

- Adding or reviewing `[tool.commitizen]` in `pyproject.toml`.
- Choosing a Commitizen `version_provider` for a Python, uv, mixed Python/Node, or tag-derived release workflow.
- Designing `cz bump`, `cz changelog`, `cz check`, or project wrapper commands.
- Debugging version drift, missing release tags, changelog ranges, or conventional-commit parsing.
- Deciding whether Commitizen should replace custom version or changelog scripts.
- Deciding whether a mixed Python/Node repo should keep Commitizen or move to an explicit release-intent workflow such as Changesets.

## Scope Boundaries

- Use `.agents/skills/ref-sp-dev-package-management/SKILL.md` for general package metadata, changelog ownership, and multi-manifest release policy.
- Use `.agents/skills/ref-sp-dev-semantic-versioning/SKILL.md` for bump meaning, prerelease stability, and dependency-range decisions.
- Use `.agents/skills/ref-sp-dev-git-commits/SKILL.md` for commit grouping, commit bodies, and day-to-day commit message quality.
- Use this skill for Commitizen-specific commands, configuration, and failure modes.

## Default Position

Prefer Commitizen when a repo already wants conventional commits and generated changelogs. Let it own the normal release-prep step instead of maintaining separate custom version writers, unless the repo needs behavior Commitizen cannot express.

For Python projects using uv, prefer `version_provider = "uv"` so Commitizen updates both `project.version` in `pyproject.toml` and the matching package version in `uv.lock`. Use `version_files` for additional secondary files such as `package.json:version` or `VERSION`.

For mixed Python/Node repositories, Commitizen can remain the release owner when one stable bump, one changelog, and one tag describe the whole project. Consider Changesets or another explicit-intent tool only when per-change release summaries, monorepo package-level bumps, or commit-history-independent release notes solve a real workflow problem.

## Core Configuration

Keep Commitizen configuration in `pyproject.toml` for Python projects unless the repo already has a deliberate standalone Commitizen config file.

```toml
[dependency-groups]
dev = [
  "commitizen>=4.16.0",
]

[tool.commitizen]
name = "cz_conventional_commits"
version_provider = "uv"
version_scheme = "semver2"
version_files = ["package.json:version", "VERSION"]
changelog_file = "CHANGELOG.md"
major_version_zero = true
bump_message = "chore(release): $current_version -> $new_version"
tag_format = "v$version"
```

Adjust the example to the repo. A pure Python uv package may not need `package.json:version` or `VERSION`. A Python-only package that does not need npm-compatible semver prerelease syntax can use the default PEP 440 scheme instead of `semver2`.

## Version Provider Selection

| Provider | Use when | Notes |
| --- | --- | --- |
| `uv` | Python project uses uv and commits `uv.lock` | Updates `pyproject.toml` and `uv.lock`; preferred for uv projects. |
| `pep621` | Modern Python project uses `project.version` without uv lock syncing | Updates `pyproject.toml` only. |
| `poetry` | Older Poetry-oriented project needs `tool.poetry.version` | Prefer `pep621` for Poetry 2+ unless Poetry-specific behavior is required. |
| `npm` | Node package owns the version | Updates npm manifests; useful outside Python-first repos. |
| `scm` | Version comes from Git tags via setuptools-scm or similar | Read-only for files; `cz bump` creates tags but does not update version files. |
| `commitizen` | The Commitizen config itself should store the version | Flexible, but can create a second version source if the package manager also has a version field. |

`version_files` can be combined with any provider to update extra version-bearing files during a bump.

## Command Patterns

Wrap Commitizen commands in the repo's task runner when possible so contributors use one stable interface.

| Command | What it does | When to use |
| --- | --- | --- |
| `cz commit` | Opens the interactive conventional-commit prompt. | When creating commits manually and the repo wants guided commit messages. |
| `cz check --message "..."` | Validates one commit message. | In hooks, CI checks, or review tooling. |
| `cz bump --get-next --yes` | Prints the next version without editing files. | In release previews, dashboards, or CI metadata. |
| `cz bump --dry-run --check-consistency --increment PATCH --yes` | Shows the bump, tag, and changelog changes without writing. | Before choosing or confirming a release bump. |
| `cz bump --check-consistency --increment PATCH --changelog --yes` | Updates versions, changelog, commit, and tag. | Normal stable release preparation. |
| `cz changelog --dry-run <version>` | Shows changelog output for a version or range. | When checking changelog parsing before release. |
| `cz version -p` | Prints the project version from Commitizen's configured provider. | In scripts and CI tag checks. |

Use `--yes` for non-interactive automation. Use `--check-consistency` before real bumps when `version_files` are configured so drift is caught early.

## Release Workflow Pattern

For a Commitizen-led stable release flow:

1. Validate the repo first: tests, lint, type-check, and any version drift check.
2. Preview the bump with `cz bump --dry-run --check-consistency --increment <major|minor|patch> --yes`.
3. Run the real prep command with `cz bump --check-consistency --increment <major|minor|patch> --changelog --yes`.
4. Review the version-file changes, `CHANGELOG.md`, release commit, and tag.
5. Push the release commit and tag.
6. Let tag-triggered CI publish packages when trusted publishing is configured.

Use project tasks such as `release-prepare-preview`, `release-prepare`, and `release-publish` when the repo defines them. Prefer pushing a tag to CI over publishing from a developer machine when the registry supports trusted publishing.

Commitizen should prepare the release; registry authentication should normally belong to the release workflow. For PyPI and npm, prefer trusted publishers with OIDC over stored publish tokens, and keep `id-token: write` scoped to the CI jobs that publish.

## Changelog Guidance

Commitizen changelogs depend on parseable commit history and matching release tags.

- Use conventional commits that make sense as release notes.
- Keep `changelog_file = "CHANGELOG.md"` unless the repo has a strong reason to use another Markdown file.
- Use `cz bump --changelog` or `update_changelog_on_bump = true` so the changelog and version bump happen together.
- Use `cz changelog --dry-run` to inspect generated entries before trusting a new config.
- For existing projects adopting Commitizen, define the initial tag or `changelog_start_rev` intentionally so old non-conforming commits do not pollute generation.

## Gotchas

- Commitizen needs a sensible baseline tag to generate release ranges. If a project starts at `0.1.0`, create or preserve the matching baseline tag before relying on future generated changelogs.
- `version_provider = "scm"` reads from Git and does not update files; do not pair it with expectations that `pyproject.toml`, lockfiles, or package manifests will be rewritten.
- `--get-next` can fail when no eligible commits are found. Use an explicit `--increment` or `--allow-no-commit` when a deliberate bump is needed without eligible commits.
- `--allow-no-commit` can still create a changelog entry when changelog generation is enabled. Use it deliberately, not as a default escape hatch.
- `major_version_zero = true` keeps breaking changes in the `0.x` development line from bumping to `1.0.0`; remove it deliberately when the project is ready for stable major version semantics.
- `--check-consistency` catches drift, but if a bump command partially changed files before failing, inspect and restore only those attempted bump changes before retrying. Do not use broad destructive git commands.
- Commitizen-generated changelogs are only as good as the commit history. If the team routinely needs richer per-change release notes before merge, that is a reason to evaluate an explicit-intent workflow rather than adding fragile commit-message rules.

## Validation

- `cz version -p` returns the same version users see in the package metadata.
- `cz bump --dry-run --check-consistency --increment <part> --yes` previews the expected next version and tag.
- Every file in `version_files` contains the current version before a real bump.
- The generated changelog uses the intended tag format and commit range.
- Release docs or task names make clear whether Commitizen prepares the release, publishes it, or both.
- Publishing workflows use trusted publishing or document why stored registry tokens remain necessary.

## References

- Commitizen docs: `https://commitizen-tools.github.io/commitizen/`
- Bump command: `https://commitizen-tools.github.io/commitizen/commands/bump/`
- Changelog command: `https://commitizen-tools.github.io/commitizen/commands/changelog/`
- Configuration file: `https://commitizen-tools.github.io/commitizen/config/configuration_file/`
- Version providers: `https://commitizen-tools.github.io/commitizen/config/version_provider/`
- Commit message guidance: `https://commitizen-tools.github.io/commitizen/tutorials/writing_commits/`
