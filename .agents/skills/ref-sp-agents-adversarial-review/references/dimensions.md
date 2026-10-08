# Adversarial Review Dimensions

Depth for each selectable dimension: what the separated reviewer checks, the oracle its verdict rests
on, what a good result looks like, and the common failure modes. Load this when running or designing
a specific dimension; the skill's `SKILL.md` covers the method common to all of them.

## Skills consistency

**What the reviewer checks.** Whether a repo's skill catalog holds together:

- Structural conformance — each skill passes the repo's skill-quality and sharing-spec validators
  (frontmatter, required sections, naming grammar, domain, visibility, dependency direction).
- Cross-reference integrity — every skill a skill points to actually exists and resolves; no dangling
  `requires`/`suggests`, no broken repo-root-relative paths.
- Coherence — no two skills give contradictory guidance for the same situation, and no rule is
  duplicated across skills instead of living in one owner.
- **Vendored/imported consistency** — in a consumer repo that pulls skills from an upstream source, the
  repo's *own* skills must be consistent **with the vendored ones**: a local skill that extends or sits
  beside a vendored skill must not contradict it, silently re-implement it, or drift from the contract
  the vendored skill defines. Check that vendored copies are unedited (edits belong upstream) and that
  local skills reference them rather than forking their guidance by accident.

**Oracle.** The repo's skill validators are the objective part (structural pass/fail). Coherence and
vendored-consistency are judgment — treat them as reviewed opinion, not checked fact.

**Good result.** Validators pass on every touched skill; cross-references resolve; each rule has one
owner; local skills and vendored skills tell the same story where they overlap.

**Failure modes.** A locally-edited vendored copy (drift that breaks upstream updates); two skills that
both claim ownership of a rule; a consumer skill whose advice quietly diverges from the vendored skill
it was meant to extend; a `requires` pointing at a skill that was renamed or removed.

## Code conformance and scope

**What the reviewer checks.**

- Conformance — does the change follow the repo's own guidelines and skills (naming, typing, structure,
  testing, commit conventions) rather than a generic style?
- Scope — does the diff do **only** what the task asked? Flag unrelated edits, opportunistic refactors,
  reformatting that buries the real change, and new dependencies the task did not call for.
- Intent drift — does the implementation actually do what was requested, or a nearby thing that looked
  easier?

**Oracle.** The repo's skills/guidelines (objective where a validator or linter encodes them; judgment
where they are prose) and the **stated task scope**. Without a clear task statement, scope review has
no oracle — get the intended scope first.

**Good result.** The diff maps one-to-one to the task; every change traces to a requirement; conventions
hold; no smuggled changes.

**Failure modes.** "While I was in here…" refactors; a new dependency added for convenience; a change
that passes tests but solves a different problem than the one asked; formatting churn that hides a
behavioral change.

## Security

**What the reviewer checks.**

- Introduced vulnerabilities — injection (SQL, command, template), missing authorization/authentication
  checks, unsafe deserialization, path traversal, SSRF, insecure defaults.
- Secret handling — no credentials, tokens, or keys added to source, logs, fixtures, or output; no new
  code path that serializes or prints a secret.
- Dependency risk — new or bumped dependencies checked against advisories; unexpected transitive additions.
- Soundness — does the change weaken an existing control (widen a permission, relax a check, disable a
  guard)?

**Oracle.** The objective parts are dependency advisories, secret scanners, and static analyzers.
Design/threat review is judgment. This dimension has the **weakest** oracle — be explicit that
"no issues found" means "none found by these checks," never "secure."

**Authorization gate.** Passive review (static, design, dependency, secret) is always allowed. Active
testing — running exploits, fuzzing, pentesting a live target — is allowed **only** against systems the
operator owns or is explicitly authorized to test. Absent recorded authorization, stop and report the
passive findings plus the active test that would settle the open question.

**Good result.** No introduced vulnerability, no secret exposure, no weakened control, dependencies
clear of known advisories — each stated as checked-by-what, with residual unknowns named.

**Failure modes.** A secret in a test fixture; an authorization check removed "temporarily"; a
string-interpolated query; a dependency bump that pulls a flagged transitive; treating a clean static
scan as proof of safety.

## End-to-end behavior

**What the reviewer checks.** That the software actually works when run — not that its tests pass.

- **Web** — drive a real browser (delegate to `ref-sp-dev-playwright-cli`): load the affected pages,
  walk the key smoke paths (the primary user flow the change touches), and watch the console and
  network for errors. A client-rendered shell returns HTTP 200 with an empty body to a plain fetch, so
  a real browser is required to see the rendered result.
- **CLI** — invoke the built entrypoint with representative arguments, including at least one error/edge
  input; assert exit codes, stdout/stderr shape, and that `--help` and the primary command behave.
- **Library/service** — exercise the public API surface through a minimal harness or a scripted call;
  for a service, hit the real endpoints and assert status and payload shape.

**Oracle.** The app's own observable smoke behavior. Strong where the app is runnable in the review
environment; weak where it needs infrastructure the reviewer cannot stand up (say so and scope down).

**Good result.** The primary flow the change touches runs clean end-to-end, with no console/network
errors (web) or unexpected exit codes (CLI), observed by running it — not inferred from unit tests.

**Failure modes.** Green unit tests over a broken integration; a smoke path that was never actually
driven; asserting behavior from reading code instead of running it; a web check done with `curl`
against a JavaScript-rendered page (empty body, false pass).
