---
name: ref-github-actions-ci
description: "Portable GitHub Actions CI guidance for workflow triggers, job design, permissions, matrix strategy, concurrency, caching, and workflow hardening. Use when: creating or reviewing .github/workflows/*.yml files, setting up CI or reusable workflows, or securing workflow tokens, actions, and runner choices."
metadata:
  shareable-skills.visibility: "shareable"
---

# GitHub Actions CI

## Purpose

Provide portable defaults for building maintainable and secure GitHub Actions CI workflows without turning every repository into a pile of ad hoc YAML.

## When to use this skill

- Creating or reviewing `.github/workflows/*.yml` files.
- Designing CI triggers, job graphs, or matrix coverage.
- Choosing runner types, action pinning, or token permissions.
- Hardening workflows that process pull requests, forks, or deployment credentials.

## Defaults

- Keep workflows in `.github/workflows` with clear names and narrow triggers.
- Prefer `push` plus `pull_request` for CI, and add `workflow_dispatch` only when manual execution is genuinely useful.
- Prefer path and branch filters that reflect repository boundaries, but avoid over-filtering required checks.
- Set `permissions` deliberately and keep `GITHUB_TOKEN` least-privileged by default.
- Use workflow-level `concurrency` for branch-scoped CI so stale runs are cancelled rather than piling up.
- Prefer small jobs with explicit `needs` over one giant job that hides failure boundaries.
- Prefer GitHub-hosted runners unless a self-hosted runner solves a concrete need that justifies its security and maintenance cost.
- Prefer pinning third-party actions and reusable workflows to full commit SHAs; use version tags only when the trust and drift tradeoff is intentional.
- Prefer first-party setup actions with built-in dependency caching when available, and use `actions/cache` only with explicit keys and paths.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Define workflow triggers | Choose `on`, branch filters, path filters, schedules, and manual inputs deliberately. | CI becomes noisy or fragile when workflows fire on every event without boundaries. | When adding or reviewing a workflow entry point. | The workflow runs when the repo needs it and stays quiet otherwise. |
| Design the job graph | Split jobs, matrices, `needs`, and outputs around real failure and reuse boundaries. | CI is easier to debug when each job owns one concern and reports failures clearly. | When a workflow mixes validation, packaging, and deployment behavior. | Workflow runs stay understandable and parallelism is intentional. |
| Harden workflow execution | Set token permissions, action pinning, secret flow, runner choice, and PR trust boundaries. | Most Actions incidents come from over-privileged tokens, unpinned dependencies, or untrusted PR execution. | When the workflow touches secrets, comments, deployments, or third-party actions. | The workflow can do its job without quietly expanding the attack surface. |

## Core Rules

### Triggers and filters

- Use `push` and `pull_request` as the default CI triggers.
- Add `workflow_dispatch` only when operators need a manual entry point.
- Use branch filters and path filters to keep expensive workflows scoped to the files they actually protect.
- Remember that skipped workflows can leave required checks pending; do not overfit path filters on required status checks.
- Use `schedule` for recurring maintenance or verification jobs, not as a substitute for ordinary CI triggers.

### Jobs, matrices, and concurrency

- Keep jobs focused enough that a failed job points directly at the broken concern.
- Use `needs` to make ordering explicit instead of relying on naming or YAML position.
- Use matrices for real support boundaries such as operating system, runtime version, or package manager mode.
- Keep matrix size intentional; do not explode combinations just because the feature exists.
- Use workflow-level or job-level `concurrency` to cancel stale runs on the same branch or environment.
- Prefer `cancel-in-progress: true` for ordinary branch CI and queueing only for workflows where first-in-first-out ordering matters.

### Permissions, tokens, and secrets

- Set `permissions` explicitly instead of relying on broad defaults.
- Prefer workflow-level `permissions: read-all` or a minimal explicit map, then elevate specific jobs only when needed.
- Treat `GITHUB_TOKEN` as a real credential; even if an action can read `github.token` implicitly, it should still receive only the narrow permissions it needs.
- Prefer OIDC or other short-lived credentials over long-lived cloud secrets when the platform supports it.
- Use environment protections and required reviewers for sensitive deployment secrets.
- Never assume secrets are available on forked pull requests or Dependabot-triggered workflow runs.

### Third-party actions and reusable workflows

- Pin third-party actions to a full commit SHA by default.
- Audit third-party actions and reusable workflows before granting them access to secrets or write permissions.
- Treat tag pins as a convenience tradeoff, not as an immutable security boundary.
- Keep local actions and reusable workflows in the repository only when the reuse boundary is real; otherwise keep the workflow simple.

### Untrusted input and pull requests

- Avoid `pull_request_target` for untrusted PR code unless the workflow is intentionally limited to metadata-only operations and never checks out or executes attacker-controlled code.
- Prefer `pull_request` for normal validation of contributor changes.
- When inline shell must consume untrusted event input, pass it through environment variables rather than interpolating it directly into shell source.
- Prefer an action or dedicated script over large inline shell when the logic touches untrusted input.

### Runners and caching

- Prefer GitHub-hosted runners for general CI because they provide cleaner isolation by default.
- Use self-hosted runners only when the hardware, network, or toolchain need is concrete and the trust boundary is controlled.
- Avoid self-hosted runners for public-repo workflows that execute untrusted PR code.
- Cache dependency installs intentionally and with stable keys; do not cache the whole workspace blindly.
- Keep `defaults.run.shell` and `defaults.run.working-directory` explicit when they materially improve consistency.

## Gotchas

- Dependabot pull request workflows run with a read-only token and no secrets, similar to forked PR restrictions.
- `paths` and `paths-ignore` cannot be combined on the same event; use `paths` with negative patterns when you need both include and exclude behavior.
- `branches` and `branches-ignore` cannot be combined on the same event.
- `queue: max` and `cancel-in-progress: true` are mutually exclusive in `concurrency`.
- Dependabot can update GitHub Actions referenced with repository syntax such as `actions/checkout@v6` or SHA pins, but not local `./.github/...` references or `docker://` action references.

## Validation

- Workflow triggers match the repo boundary without leaving required checks accidentally pending.
- Jobs and matrices reflect real verification or release boundaries.
- Token permissions and secret access are least-privileged.
- Third-party actions are pinned and reviewed appropriately.
- Pull request workflows do not mix untrusted code execution with write tokens or secrets.

## References

- GitHub Actions Workflow Syntax: <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>
- GitHub `GITHUB_TOKEN` Guidance: <https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication>
- GitHub Actions Secure Use Reference: <https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions>
- Read `./references/checklist.md` for a quick workflow review pass.
- Read `./references/security-and-structure.md` when the workflow touches permissions, forks, self-hosted runners, or third-party actions.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for CI workflow prompts.
- Review `./evals/evals.json` when validating output quality for workflow design and hardening guidance.
