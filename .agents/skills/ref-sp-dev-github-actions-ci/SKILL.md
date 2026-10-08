---
name: ref-sp-dev-github-actions-ci
description: "Writing and hardening GitHub Actions workflows: triggers, job graphs, matrices, concurrency, least-privilege tokens, action pinning, untrusted PRs, caching, and OIDC package publishing. Use when creating or reviewing .github/workflows files."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "ci, github"
---

# GitHub Actions CI

Defaults for `.github/workflows/*.yml`. The Dependabot config that opens dependency PRs is
`ref-sp-dev-github-dependabot`; what a release should contain is `ref-sp-dev-package-management` and
`ref-sp-dev-semantic-versioning`. Agent file-access policy is a different surface
(`ref-sp-agents-security`).

## Triggers and filters

- Use `push` and `pull_request` as the default CI triggers.
- Add `workflow_dispatch` only when operators need a manual entry point.
- Use branch filters and path filters to keep expensive workflows scoped to the files they actually protect.
- Remember that skipped workflows can leave required checks pending; do not overfit path filters on required status checks.
- Use `schedule` for recurring maintenance or verification jobs, not as a substitute for ordinary CI triggers.

## Jobs, matrices, and concurrency

- Keep jobs focused enough that a failed job points directly at the broken concern.
- Use `needs` to make ordering explicit instead of relying on naming or YAML position.
- Use matrices for real support boundaries such as operating system, runtime version, or package manager mode.
- Keep matrix size intentional; do not explode combinations just because the feature exists.
- Use workflow-level or job-level `concurrency` to cancel stale runs on the same branch or environment.
- Prefer `cancel-in-progress: true` for ordinary branch CI and queueing only for workflows where first-in-first-out ordering matters.

## Permissions, tokens, and secrets

- Set `permissions` explicitly instead of relying on broad defaults.
- Prefer workflow-level `permissions: read-all` or a minimal explicit map, then elevate specific jobs only when needed.
- Treat `GITHUB_TOKEN` as a real credential; even if an action can read `github.token` implicitly, it should still receive only the narrow permissions it needs.
- Prefer OIDC or other short-lived credentials over long-lived cloud secrets when the platform supports it.
- Use environment protections and required reviewers for sensitive deployment secrets.
- Never assume secrets are available on forked pull requests or Dependabot-triggered workflow runs.
- Prefer registry trusted publishing through OIDC over stored publish tokens, and grant
  `id-token: write` only to the job that mints the registry token.
- For npm, keep provenance on where supported, and use `npm stage publish` when a maintainer must
  approve the package before it goes live.
- Match the registry's trusted-publisher rule exactly: repository, workflow filename, environment name when used, and supported runner type all matter.

## Third-party actions and reusable workflows

- Pin third-party actions and reusable workflows to a full commit SHA by default.
- Audit third-party actions and reusable workflows before granting them access to secrets or write permissions.
- Treat tag pins as a convenience tradeoff, not as an immutable security boundary.
- Keep local actions and reusable workflows in the repository only when the reuse boundary is real; otherwise keep the workflow simple.

## Untrusted input and pull requests

- Avoid `pull_request_target` for untrusted PR code unless the workflow is intentionally limited to metadata-only operations and never checks out or executes attacker-controlled code.
- Prefer `pull_request` for normal validation of contributor changes.
- When inline shell must consume untrusted event input, pass it through environment variables rather than interpolating it directly into shell source.
- Prefer an action or dedicated script over large inline shell when the logic touches untrusted input.
- Treat `workflow_run` as privileged when it is used after an untrusted validation workflow; it can access secrets and write tokens even when the triggering workflow could not. Do not download or execute untrusted artifacts without validation.
- When a workflow auto-merges Dependabot (or other) PRs, put the `gh pr merge` step in its own job gated by `needs:` on the build/test job, and grant `contents: write` + `pull-requests: write` on that job alone. The build/test job executes untrusted dependency code and must stay read-only; do not raise the whole workflow's permissions just to reach the merge step.

## Runners and caching

- Prefer GitHub-hosted runners for general CI because they provide cleaner isolation by default.
- Use self-hosted runners only when the hardware, network, or toolchain need is concrete and the trust boundary is controlled.
- Avoid self-hosted runners for public-repo workflows that execute untrusted PR code.
- Prefer first-party setup actions with built-in dependency caching; otherwise use `actions/cache`
  with explicit keys and paths, never the whole workspace.
- For release publishing jobs, keep caching conservative and follow registry-specific requirements; npm trusted publishing and provenance require supported cloud CI and runner combinations.
- Keep `defaults.run.shell` and `defaults.run.working-directory` explicit when they materially improve consistency.

## Gotchas

- Dependabot pull request workflows run with a read-only token and no secrets, similar to forked PR restrictions.
- A `gh pr merge` step failing with `Resource not accessible by integration (mergePullRequest)` lacks token scope — it needs `contents: write` + `pull-requests: write` on that job. A different failure, `Auto merge is not allowed for this repository (enablePullRequestAutoMerge)`, is the repo's "Allow auto-merge" setting being off, not a token problem; see `ref-sp-dev-github-dependabot`.
- `paths` and `paths-ignore` cannot be combined on the same event; use `paths` with negative patterns when you need both include and exclude behavior.
- `branches` and `branches-ignore` cannot be combined on the same event.
- `queue: max` and `cancel-in-progress: true` are mutually exclusive in `concurrency`.
- Dependabot can update GitHub Actions referenced with repository syntax such as `actions/checkout@v6` or SHA pins, but not local `./.github/...` references or `docker://` action references.
- npm trusted publishing requires a recent npm CLI and supported Node version; staged publishing requires an even newer npm CLI and cannot stage a package that has never been published before.
- npm trusted publishing can generate provenance automatically for supported public package/public repository publishes, but private repository and unsupported provider cases need an explicit decision.

## Before finishing

- Any write step in a PR workflow (such as auto-merge) runs in its own `needs`-gated job with job-scoped write
  permissions, never in a job that runs untrusted PR code.
- npm workflows state whether they publish directly, with provenance, or staged for 2FA approval.

## References

- GitHub Actions Workflow Syntax: <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>
- GitHub `GITHUB_TOKEN` Guidance: <https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication>
- GitHub Actions Secure Use Reference: <https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions>
- Read `./references/checklist.md` for a quick workflow review pass.
- Read `./references/security-and-structure.md` when the workflow touches permissions, forks, self-hosted runners, or third-party actions.
