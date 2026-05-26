---
name: ref-github-dependabot
description: "Portable Dependabot guidance for dependabot.yml configuration, ecosystem selection, schedules, grouping, ignore or allow rules, private registries, and GitHub Actions updates. Use when: creating or reviewing .github/dependabot.yml, tuning update volume, or deciding how version and security updates should be grouped and scoped."
metadata:
  agentic-tools-category: "github"
  shareable-skills.visibility: "shareable"
---

# GitHub Dependabot

## Purpose

Provide portable defaults for configuring Dependabot so repositories stay current without drowning maintainers in low-signal update pull requests.

## When to use this skill

- Creating or revising `.github/dependabot.yml`.
- Choosing which ecosystems and directories Dependabot should monitor.
- Reducing PR noise with schedules, grouping, cooldowns, or open PR limits.
- Configuring updates for GitHub Actions, private registries, or multi-directory repositories.
- Automating safe Dependabot PR handling, such as metadata-driven labels, approvals, automerge, or release-intent file generation.

## Defaults

- Keep the config in `.github/dependabot.yml` and start it with `version: 2`.
- Add one `updates` block per ecosystem and directory boundary unless multi-directory grouping is intentional.
- Prefer `weekly` schedules by default; use `daily` only when catching up or when the ecosystem genuinely requires faster movement.
- Keep `open-pull-requests-limit` intentional so Dependabot does not swamp the review queue.
- Use `groups` to reduce noisy one-dependency-at-a-time PR streams, especially for development dependencies or low-risk patch updates.
- Use `package-ecosystem: github-actions` with `directory: "/"` when workflows depend on external actions or reusable workflows.
- Keep private registry credentials in Dependabot registry configuration and secrets, never hard-coded in the file.
- Use `ignore` and `allow` narrowly and document why when blocking major upgrades or noisy packages.
- Let required CI and branch protection decide whether Dependabot PRs can merge; automation should enable auto-merge only after metadata, update type, and dependency scope match the policy.
- If the release workflow requires explicit release-intent files, generate dependency-update changesets or release notes only through metadata-only automation that does not execute PR code.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Define update boundaries | Choose ecosystems, directories, and target branches deliberately. | Dependabot becomes noisy or incomplete when ecosystems overlap or scan the wrong roots. | When first enabling Dependabot or expanding it to more manifests. | Every maintained dependency surface has one clear configuration owner. |
| Tune PR volume | Set schedules, groups, cooldowns, and open-PR limits. | Good automation should reduce toil, not create an unread queue. | When Dependabot is either too noisy or too stale. | Update flow matches the team’s review capacity. |
| Secure non-public dependencies | Configure registries, credentials, and Actions updates safely. | Private registries and workflow dependencies fail silently or dangerously when wired casually. | When the repo depends on private packages or GitHub Actions updates. | Dependabot can resolve the real dependency graph without leaking credentials. |
| Automate PR handling | Fetch Dependabot metadata and apply labels, approvals, auto-merge, or release-intent files under tight conditions. | Dependency automation should remove routine toil without granting broad write paths to untrusted changes. | When low-risk update classes have a clear merge policy. | Dependabot PRs receive predictable handling while required checks remain authoritative. |

## Core Rules

### Base file shape

- Keep the config at `.github/dependabot.yml`.
- Start the file with `version: 2`.
- Define `updates` explicitly; each block should clearly own one ecosystem and directory or set of directories.
- Do not overlap directories across multiple update blocks for the same ecosystem and target branch unless the split is intentional and non-overlapping.

### Ecosystems and directories

- Use `directory` for one manifest root and `directories` only when a multi-directory update block is truly warranted.
- Keep directory values repo-root-relative.
- For GitHub Actions, use `package-ecosystem: github-actions` with `directory: "/"`; Dependabot will scan workflow files under `.github/workflows` and root action definitions.
- Use separate update blocks when different ecosystems or dependency surfaces need different schedules, grouping, or labels.

### Scheduling and update volume

- Prefer `weekly` as the default schedule.
- Add `day`, `time`, and `timezone` when the review process needs predictable update windows.
- Use `open-pull-requests-limit` to match human review capacity.
- Use `cooldown` when high-churn packages create constant PR churn and delayed uptake is acceptable.
- If the repo is severely outdated, temporarily tighten schedules, then relax them once the backlog is under control.

### Grouping, allow, and ignore

- Use `groups` to combine low-risk updates into fewer PRs.
- Prefer group names that describe the review unit, such as `dev-dependencies`, `github-actions`, or `infrastructure`.
- Use `dependency-type`, `patterns`, and `update-types` to make groups predictable.
- Use `ignore` for genuinely blocked upgrades or known noisy ranges, not as a substitute for doing upgrade work forever.
- Remember that if a dependency matches both `allow` and `ignore`, it is ignored.
- Use `open-pull-requests-limit: 0` only as an explicit temporary disable, not as a quiet way to forget that the ecosystem exists.

### Commit and PR shaping

- Use `commit-message` settings when the repo expects a consistent PR and commit style.
- Keep labels, assignees, and milestones aligned with the review process instead of accepting whatever the defaults happen to generate.
- Use `pull-request-branch-name.separator` only when it solves a concrete branch naming or tooling issue.
- Use `dependabot/fetch-metadata` or the GitHub API when automation needs to distinguish direct production dependencies, development dependencies, patch updates, minor updates, or major updates.
- Prefer enabling GitHub auto-merge for approved low-risk PR classes over force-merging directly; branch protection and required checks should remain the gate.
- Keep auto-merge policies narrow, such as patch-only development dependencies or grouped GitHub Actions updates, until the repo has evidence that broader automation is safe.

### Private registries and restricted ecosystems

- Put registry definitions in top-level `registries` and reference them from specific `updates` blocks.
- Store registry credentials in repository or organization secrets, not plaintext config.
- Use `replaces-base` carefully because it changes how the ecosystem resolves packages.
- Avoid enabling insecure external code execution unless the package manager truly needs it and the security tradeoff is understood.

### Actions and workflow dependencies

- Keep GitHub Actions dependencies under Dependabot coverage when the repository uses external actions or reusable workflows.
- Prefer repository-style action references that Dependabot can update.
- Remember that local `./.github/...` references and `docker://` action references are not Dependabot-updateable in the same way.
- Treat Actions updates as part of CI maintenance, not as a separate afterthought.

### Dependabot release automation

- If the repo uses Changesets or another explicit release-intent model, decide whether dependency updates should create user-visible release notes before adding automation.
- For routine dependency maintenance, prefer a generic patch changeset only when the package itself should publish because dependency versions changed.
- Use `pull_request_target` only for metadata-only operations such as labels, comments, or writing a simple release-intent file; never install dependencies or run code from the Dependabot branch in that privileged context.
- Avoid adding a fine-grained PAT solely for Dependabot automerge unless the native `GITHUB_TOKEN`, branch protection, and auto-merge model cannot express the required workflow.

## Gotchas

- Forks do not automatically enable Dependabot version updates just because the file exists; the fork owner must enable them.
- `target-branch` affects version updates only; security updates still target the default branch.
- `groups` combine matching dependencies in the first matching group, so ordering matters.
- `directory` and `directories` are not interchangeable; use the plural form only when the ecosystem supports it and the grouping is intentional.
- Dependabot can update GitHub Actions referenced by repository syntax, but not arbitrary local action paths or `docker://` references.
- Dependabot PR workflows are constrained like forked PRs: assume no ordinary Actions secrets and a limited token unless the workflow deliberately uses a trusted event.
- `pull_request_target` runs with the base repository context. It is useful for Dependabot metadata automation, but unsafe if it checks out and runs PR-controlled code.
- Auto-generating release-intent files for dependency updates can create noisy releases if every dev-only update publishes a package version.

## Validation

- The file uses `version: 2` and one clear update block per dependency surface.
- Ecosystem and directory scopes do not overlap accidentally.
- PR volume matches review capacity through schedules, grouping, and PR limits.
- Private registry access is explicit and credential handling stays secret-backed.
- Workflow dependencies are covered if the repository depends on GitHub Actions.
- Dependabot automation conditions on actor, repository, dependency metadata, update type, and dependency scope before approving or enabling auto-merge.
- Any generated changeset or release-intent file matches the package's real release policy and does not run untrusted PR code.

## References

- Dependabot Options Reference: <https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference>
- Configuring Dependabot Version Updates: <https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates>
- About Dependabot Version Updates: <https://docs.github.com/en/code-security/dependabot/dependabot-version-updates>
- Read `./references/checklist.md` for a quick Dependabot review pass.
- Read `./references/config-patterns.md` when deciding how to split ecosystems, group updates, or wire private registries.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for Dependabot prompts.
- Review `./evals/evals.json` when validating output quality for update-scope and PR-noise guidance.
