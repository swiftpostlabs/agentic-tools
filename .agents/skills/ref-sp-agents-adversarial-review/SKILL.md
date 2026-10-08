---
name: ref-sp-agents-adversarial-review
description: "Why and how a change should be reviewed by an agent separated from its author, with a find-fault mandate and an objective oracle, across skills, code, security, and end-to-end dimensions. Use when designing a review or judging whether a change is safe to accept."
license: "MIT"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.tags: "verification, security, testing, review"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-agents-verification-discipline, ref-sp-dev-playwright-cli"
---

# Adversarial Review

The method behind reviewing a change with a reviewer that is **not its author**. To run a review,
use `tool-sp-run-adversarial-review`. An agent checking its own claims is
`ref-sp-agents-verification-discipline`; this skill adds the separation, and the reviewer applies
that discipline to its own findings. The security dimension here reviews the change for introduced
risk, which is unrelated to the agent's own file-access policy (`ref-sp-agents-security`).

## Separation is the mechanism

- **Different agent, fresh context.** The reviewer doesn't carry the author's justifications,
  assumptions, or attachment to the approach.
- **Opposed mandate.** The author wants the change accepted; the reviewer is told to find what is
  wrong with it. State that mandate explicitly, or the reviewer drifts back to confirming.
- **What it defeats:** self-preferential bias. An agent grading its own output rates it higher than
  an independent grader, and same-context self-review inherits every blind spot that produced the
  defect.

A "review" in the author's context with a confirm-it-works framing is a checklist, and it misses the
defects that matter most. If the reviewer reads the author's context, rationale, or self-assessment,
the independence is gone even when the topology looks right.

## The oracle comes first

A verdict is only as good as its **oracle**: a source of truth that is objective, outside the
changeset, and not editable by the agent doing the work. Without one, review (and especially
fan-out to many reviewers) launders unchecked output as checked. Fix the oracle before adding
reviewers.

| Dimension | Oracle | Strength |
| --- | --- | --- |
| skills | the repo's skill validators, plus cross-skill coherence | strong for structure, judgment for coherence |
| code | the repo's skills and guidelines, plus the stated task scope | partly objective |
| security | dependency advisories, secret scanners, static analysis, design review | weak, judgment-heavy |
| end-to-end | the app's real behaviour when run | strong where the app runs |

Name each dimension's oracle before trusting its verdict. With a weak oracle, lower the confidence
and label the verdict as judgment: "no issues found by these checks", never "secure" or
"correct". The skills dimension judges against the bars set by `ref-sp-agents-skills-authoring`
and `ref-sp-agents-shareable-skills`; it doesn't redefine them. What each dimension checks and how
it fails: `./references/dimensions.md`.

## Provider support

Detect the harness's capability rather than assuming a version
(`./references/provider-support.md` has the dated map):

- **Claude Code:** native subagents for a separated reviewer, plus automated fan-out and grading.
- **Gemini CLI, Copilot CLI, VS Code:** separated subagent reviewers; a human plays grader.
- **No subagents:** a fresh session with cleared context, human-mediated. Weaker, but the reviewer
  still doesn't carry the author's context.

Separation works everywhere; only the automation on top is Claude-specific.

## Security is gated

Passive review (static and design review, dependency and secret scanning) is always in scope.
Active testing (exploits, fuzzing, pentesting a live target) only against systems the operator owns
or is explicitly authorized to test, with that authorization recorded; never against third-party
services, shared staging, or production without it. When authorization is missing or unclear, stop,
report the passive findings, and name the active test that would settle the question.

## Gotchas

- **A green badge can be a skipped check.** Skipped and passing tests look the same. Confirm the
  oracle actually ran over the change: tests executed, not filtered out; the validator covered the
  touched files.
- **End-to-end that never runs the app proves nothing.** Passing unit tests and a green type-check
  are the author's oracle. The reviewer observes real behaviour.
- **Hold the review to the chosen dimensions.** The code dimension exists to catch scope creep; the
  review must not commit it either.
- **Cite the argument, not the numbers.** The best-known account of agents-at-scale review (the Bun
  Zig-to-Rust rewrite) is largely a vendor self-report with contested outcomes. The reasoning above
  stands on its own; its success figures don't.
