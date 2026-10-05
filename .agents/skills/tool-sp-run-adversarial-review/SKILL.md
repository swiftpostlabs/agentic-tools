---
name: tool-sp-run-adversarial-review
description: "Run an adversarial review of a change with a reviewer separated from the author, across chosen dimensions: skills, code and scope, security, end-to-end. Use when asked to red-team, independently verify, or adversarially review a change."
argument-hint: "Which dimensions to review (skills / code / security / e2e, or all), the change or diff under review, and any authorization for active security testing"
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.tags: "verification, security, testing, review"
  shareable-skills.visibility: "public"
  shareable-skills.requires: "ref-sp-agents-adversarial-review"
  shareable-skills.suggests: "ref-sp-dev-playwright-cli, ref-sp-agents-verification-discipline"
---

# Run Adversarial Review

The runnable recipe for `ref-sp-agents-adversarial-review`, which holds the method and the depth
per dimension; read it first. On Claude Code, the built-in `/code-review` or `/security-review` is
enough for a quick single-dimension pass. Use this recipe for a portable, multi-dimension review
with an explicitly separated reviewer.

## Steps

1. **Probe the harness** for the strongest separation available: a subagent per dimension, or
   failing that a fresh session with cleared context. Detect it; don't assume.
2. **Probe the repo.** Get the diff (branch vs base, or working changes) and the **stated task
   scope**: without it, scope review has no oracle. Find the repo's real validate, lint, type-check,
   and test commands, its instruction files, and its skills, including vendored ones.
3. **Pick dimensions:** whatever the user named; ask if they named none.
4. For each dimension:
   1. Name its **oracle**, the objective source of truth here, and how strong it is.
   2. Start a **separated reviewer** with an opposed mandate: "find what is wrong with this change;
      do not confirm it works."
   3. Run the dimension's checks with the repo's own commands.
   4. Collect findings, each with location, what is wrong, evidence, and severity.
5. **Report** using `./references/report-template.md`: grouped by dimension, most severe first,
   oracle and its strength stated for each.

## Dimensions

- **skills:** run the skill validators on touched skills. Then check that cross-references
  resolve, guidance isn't duplicated or contradictory, and in a consumer repo that local skills
  don't contradict, re-implement, or drift from the vendored skills they extend, and that vendored
  copies weren't edited locally.
- **code:** conformance to the repo's skills and linters, and **scope**: unrelated edits,
  opportunistic refactors, formatting churn hiding behaviour changes, dependencies the task didn't
  call for.
- **security:** passive by default: review the diff and design, check dependency advisories, scan
  for secrets added to source, logs, fixtures, or output, and look for weakened controls.
- **e2e:** run the software; reading its tests is not enough. Web: drive the touched smoke path in a
  real browser via `ref-sp-dev-playwright-cli`, watching console and network. CLI: run the built
  entrypoint with normal and edge arguments and check exit codes and output. Library or service:
  call the public surface through a minimal harness.

## Security authorization

Active testing (pentest, fuzzing a live target) only against systems the operator owns or is
explicitly authorized to test, with that authorization recorded. Never against third-party, shared
staging, or production. If authorization is missing or unclear, stop, report the passive findings,
and name the active test that would settle the question.

## Gotchas

- If the reviewer inherits the author's context or rationale, it isn't separated, whatever the
  topology looks like. If no separation is possible, say the review was not adversarial.
- With a weak oracle, say "no issues found by these checks", never "secure" or "correct".
- Hold the review to the chosen dimensions; don't let it grow its own scope.

## Before finishing

- Findings are concrete (location, evidence, severity), not a pass/fail stamp.
- The e2e dimension ran the software.
- Apply `ref-sp-agents-verification-discipline` to the findings before reporting them.
