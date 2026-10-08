---
name: ref-sp-dev-github-dependabot
description: "Configuring .github/dependabot.yml and automating Dependabot PRs: ecosystems and directories, schedules, grouping, allow and ignore rules, private registries, Actions updates, and making auto-merge actually work. Use when creating or tuning Dependabot."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "github"
---

# GitHub Dependabot

Defaults that keep dependencies current without flooding reviewers. The workflows that run on
Dependabot PRs are `ref-sp-dev-github-actions-ci`; what a version range permits is
`ref-sp-dev-semantic-versioning`; keeping manifests in step after an update is
`ref-sp-dev-package-management`.

## Base file shape

- The config lives at `.github/dependabot.yml` and starts with `version: 2`.
- Define `updates` explicitly; each block should clearly own one ecosystem and directory or set of directories.
- Don't let two update blocks for the same ecosystem and target branch cover the same directories.

## Ecosystems and directories

- Use `directory` for one manifest root and `directories` only when a multi-directory update block is truly warranted.
- Keep directory values repo-root-relative.
- For GitHub Actions, use `package-ecosystem: github-actions` with `directory: "/"`; Dependabot will scan workflow files under `.github/workflows` and root action definitions.
- Use separate update blocks when different ecosystems or dependency surfaces need different schedules, grouping, or labels.

## Scheduling and update volume

- Prefer `weekly` as the default schedule.
- Add `day`, `time`, and `timezone` when the review process needs predictable update windows.
- Use `open-pull-requests-limit` to match human review capacity.
- Use `cooldown` when high-churn packages create constant PR churn and delayed uptake is acceptable.
- If the repo is severely outdated, temporarily tighten schedules, then relax them once the backlog is under control.

## Grouping, allow, and ignore

- Use `groups` to combine low-risk updates into fewer PRs.
- Prefer group names that describe the review unit, such as `dev-dependencies`, `github-actions`, or `infrastructure`.
- Use `dependency-type`, `patterns`, and `update-types` to make groups predictable.
- Use `ignore` for genuinely blocked upgrades or known noisy ranges, not as a substitute for doing
  upgrade work forever, and note why next to the rule.
- Remember that if a dependency matches both `allow` and `ignore`, it is ignored.
- Use `open-pull-requests-limit: 0` only as an explicit temporary disable, not as a quiet way to forget that the ecosystem exists.

## Commit and PR shaping

- Use `commit-message` settings when the repo expects a consistent PR and commit style.
- Keep labels, assignees, and milestones aligned with the review process instead of accepting whatever the defaults happen to generate.
- Use `pull-request-branch-name.separator` only when it solves a concrete branch naming or tooling issue.
- Use `dependabot/fetch-metadata` or the GitHub API when automation needs to distinguish direct production dependencies, development dependencies, patch updates, minor updates, or major updates.
- Prefer enabling GitHub auto-merge for approved low-risk PR classes over force-merging directly; branch protection and required checks should remain the gate.
- Keep auto-merge policies narrow, such as patch-only development dependencies or grouped GitHub Actions updates, until the repo has evidence that broader automation is safe.

## Making auto-merge actually work

Enabling Dependabot auto-merge with `gh pr merge --auto` needs **three** independent things in place. Missing any one fails only part of the time, which makes it look flaky rather than broken:

- **Write-scoped workflow token** — `contents: write` + `pull-requests: write` on the merging job (job design owned by `ref-sp-dev-github-actions-ci`). Missing → `GraphQL: Resource not accessible by integration (mergePullRequest)`.
- **The repo "Allow auto-merge" setting** — Settings → General → Pull Requests. Off → `GraphQL: Auto merge is not allowed for this repository (enablePullRequestAutoMerge)`. This is a repository setting, not YAML; no workflow change can fix it.
- **A branch protection rule with an unmet requirement** — auto-merge can only be *enabled* on a PR that cannot merge immediately (a required status check or review still pending, or "require branches up to date" / "require linear history" leaving it behind base). With nothing to wait on, there is no deferred merge to enable.

`gh pr merge --auto` takes one of two paths depending on PR state, which is why a missing setting can appear to "sometimes work":

- **Immediately mergeable** → direct `mergePullRequest`. Needs only the token, not the setting. A lone Dependabot PR usually hits this and succeeds.
- **Not immediately mergeable** (behind base after another PR merged, a lockfile conflict, a pending required check) → `enablePullRequestAutoMerge`. Needs the token *and* the setting. Concurrent Dependabot PRs routinely hit this, so "it fails only when two race" points at the setting being off, not at the YAML.

## Private registries and restricted ecosystems

- Put registry definitions in top-level `registries` and reference them from specific `updates` blocks.
- Store registry credentials in repository or organization secrets, not plaintext config.
- Use `replaces-base` carefully because it changes how the ecosystem resolves packages.
- Avoid enabling insecure external code execution unless the package manager truly needs it and the security tradeoff is understood.

## Actions and workflow dependencies

- Keep GitHub Actions dependencies under Dependabot coverage when the repository uses external actions or reusable workflows.
- Prefer repository-style action references that Dependabot can update.
- Remember that local `./.github/...` references and `docker://` action references are not updated by Dependabot at all.
- Treat Actions updates as part of CI maintenance, not as a separate afterthought.

## Dependabot release automation

- If the repo uses Changesets or another explicit release-intent model, decide whether dependency updates should create user-visible release notes before adding automation.
- For routine dependency maintenance, prefer a generic patch changeset only when the package itself should publish because dependency versions changed.
- Use `pull_request_target` only for metadata-only operations such as labels, comments, or writing a simple release-intent file; never install dependencies or run code from the Dependabot branch in that privileged context.
- Avoid adding a fine-grained PAT solely for Dependabot automerge unless the native `GITHUB_TOKEN`, branch protection, and auto-merge model cannot express the required workflow.

## Gotchas

- Forks do not automatically enable Dependabot version updates just because the file exists; the fork owner must enable them.
- `target-branch` affects version updates only; security updates still target the default branch.
- `groups` combine matching dependencies in the first matching group, so ordering matters.
- `directory` and `directories` are not interchangeable; use the plural form only when the ecosystem supports it and the grouping is intentional.
- Auto-generating release-intent files for dependency updates can create noisy releases if every dev-only update publishes a package version.
- Auto-merge is silently disabled if someone without write access pushes to the PR head branch or switches its base — for example a fork contributor pushing after a maintainer enabled it.

## Before finishing

- Auto-merge automation conditions on actor, repository, dependency metadata, update type, and
  dependency scope before approving or enabling auto-merge.
- All three auto-merge prerequisites are in place (above).

## References

- Dependabot Options Reference: <https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference>
- Configuring Dependabot Version Updates: <https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates>
- About Dependabot Version Updates: <https://docs.github.com/en/code-security/dependabot/dependabot-version-updates>
- Automating Dependabot with GitHub Actions (the auto-merge workflow pattern): <https://docs.github.com/en/code-security/dependabot/working-with-dependabot/automating-dependabot-with-github-actions>
- Automatically merging a pull request (auto-merge prerequisites and auto-disable rules): <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request>
- Managing auto-merge for pull requests (the "Allow auto-merge" repo setting): <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-auto-merge-for-pull-requests-in-your-repository>
- Read `./references/checklist.md` for a quick Dependabot review pass.
- Read `./references/config-patterns.md` when deciding how to split ecosystems, group updates, or wire private registries.
