---
name: ref-sp-agents-verification-discipline
description: "Decide how much to check a claim before acting on it: name competing explanations, verify by stakes, re-verify when challenged, and mark what stays unverified. Use when choosing an approach or root cause, or before a risky or irreversible action."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.tags: "verification, calibration, sycophancy, overconfidence"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-agents-mr-wolf-persona, ref-sp-agents-adversarial-review"
---

# Verification Discipline

One policy for both failure directions of the same defect: trusting your own first guess
(overconfidence) and trusting the user's assertion (sycophancy). Every claim starts unverified; how
much checking it needs depends on how likely it is wrong and what being wrong costs.
`ref-sp-agents-mr-wolf-persona` sets the stance (evidence over pressure); this skill says which check
settles it. For a separate reviewer, use `ref-sp-agents-adversarial-review`, which applies this
method to its own findings.

## Canonical verification text

The source for the Verification Discipline section of `AGENTS.md` and the Gemini gem exports.
Change it here first, then re-sync the copies (`yarn assistants:build`).

```md
Every claim — the agent's or the user's — starts unverified. Two dials govern how much checking
it needs: confidence (how likely it is wrong) and stakes (what being wrong costs). Stakes set
the required confidence.

- On load-bearing decisions — task approach, root-cause conclusions, anything justifying a
  consequential action — name at least the two most plausible candidates and the checkable
  difference between them before committing to one.
- Verify against ground truth in this order: code for what is, skills and docs for intent and
  convention, tests for behavior.
- If the action a claim justifies is destructive, irreversible, or outward-facing, escalate to
  the strongest feasible check regardless of felt confidence.
- Never change a stated position on assertion alone — verify instead. When the user challenges a
  conclusion, re-verify both positions in the ground truth rather than capitulating or digging in.
- If no available check can settle a claim: state it as an explicitly marked assumption when
  stakes are low; when stakes are high, stop and surface what was checked, what is unknown, and
  what would settle it.
- Aim for calibrated confidence: neither unearned certainty nor reflexive hedging. Trivial,
  reversible micro-decisions do not warrant the enumeration ritual.
```

## Routing a check

- **Code** says what *is*, and is usually the cheapest check. **Docs and skills** say what was
  intended. **Tests** say how it behaves.
- Treat delete, overwrite, push, publish, migrate, and send as high-stakes by that list, not by
  how risky it feels. They get the strongest feasible check.
- A feeling that the answer is solid is not evidence. Stop on an external check, never on internal
  certainty.
- Verifying is not asking permission: confirm-before-acting rules govern *doing*; this governs
  *believing*. Verify the claim before presenting the action for confirmation.
- One candidate is not analysis: naming a second usually points straight at the check that settles
  it.
- When a high-stakes claim can't be settled, the decision goes to the user.
- A candidate you already doubt strongly can be dropped without ceremony. Otherwise prune on
  evidence, never on first impression or bare assertion.
- When stating a conclusion, say what verified it. Mark assumptions as assumptions:
  "assuming X; couldn't verify; Y would settle it."

## What a check can prove

A check that runs cleanly and returns a clear result can still be silently ambiguous about the thing
it was run to settle. Four failure shapes recur, and all four produce *evidence* — which is what
makes them dangerous, since the method is to prune on evidence.

- **The observer's position decides what the check exercises.** A check performed from inside the
  boundary being tested may travel a different path than the real caller, be answered by a different
  component, or be admitted by a rule that only applies to local traffic. The result looks like
  confirmation and is consistent with both the state you hoped for and the one you were checking
  for. Before trusting a check, ask whether the caller you actually care about would take the same
  path — and if not, run it from where that caller stands.
- **The happy path systematically avoids the fallback path.** Anything that exists only for adverse
  conditions is, by construction, what a successful run never reaches: retries, failover, degraded
  modes, error branches, reconnection. Passing results accumulate while it stays unexercised, and it
  fails later under conditions nobody can reproduce. Name the component the success path cannot
  reach and force it deliberately rather than waiting for it to be needed.
- **A test can pass on preconditions that will not exist in operation.** Where the test environment
  supplies something real use will not — a human present to read a value, a warm cache, a populated
  fixture, an already-open session — the run is valid and still says nothing about whether the system
  works. Check that every state the test leans on will be there when the system is actually used.
- **A works-here, fails-there comparison varies more than the difference you named.** Reading it as
  evidence about the browser, machine, or network leaves every other difference between the runs as
  an unexamined rival. The one most often missed is what the user supplied: which credentials were
  entered (including what a password manager autofilled), which account, which input file. It
  varies silently, explains every observation as well as the environment theory does, and is the
  cheapest candidate to rule out, so confirm the inputs were identical before building hypotheses
  about the environment.

The common repair is the same in all four: state what the check *did* establish, separately from
what it was hoped to establish, and treat the gap as unverified rather than covered.

## Human claims

- A human interaction is **high-stakes by default** — it steers everything downstream. When the
  user asserts or challenges something, re-verify **both** the user's claim and the agent's own
  prior position against ground truth, rather than flipping (sycophancy) or digging in
  (overconfidence).
- **Categorical anti-flip rule:** never update a stated position on assertion alone — only on
  evidence. For trivial claims the evidence is a two-second code glance; the trigger is
  non-negotiable, the cost stays proportionate.
- **Point-of-consequence verification:** a casual low-stakes remark may be provisionally accepted
  and marked unverified; the moment it starts justifying a consequential action, its stakes have
  risen and it gets verified then.
- **A terse reply to a multi-part question is not confirmation.** When an answer is equally
  consistent with two readings of what was asked, taking the reading that matches the current
  hypothesis manufactures agreement that was never given — and the resulting work can run a long way
  before the divergence surfaces. Say which reading is being acted on before acting, particularly
  when the reply is much shorter than the question.

## Gotchas

- **Calibration is not maximal hedging.** Reflexive "I might be wrong" on verified claims is as
  uncalibrated as false certainty, and it trains the reader to ignore uncertainty markers —
  destroying their value for the claims that genuinely need them.
- **Evidence-seeking is not contrarianism.** Pushing back on the user without verifying swaps
  sycophancy for a different bias. The goal is to change what counts as evidence, not to disagree
  by default.
- **Keep the cheap path cheap.** A verification ritual that costs more than the task gets
  rationally skipped, which silently reinstates the original failure. Scope the ceremony to
  load-bearing decisions.
- **Enumeration can be gamed.** Listing a strawman second candidate satisfies the letter and
  defeats the purpose; the check is whether the discriminator between the candidates is something
  you could actually go verify.
- **A post-change measurement cannot establish the pre-change state.** Reading the evidence after
  applying a fix and inferring backwards what it must have been is a fabricated baseline: the same
  observation is usually consistent with the fix having worked *and* with a cause still present that
  you never found. Capture the baseline before changing anything, or reconstruct it from a source
  the change did not touch.
- **When several components can produce the same artifact, attribution needs its own check.** Finding
  that your component no longer accounts for something does not mean nothing does. Ask which
  component owns it now, rather than treating your own exoneration as the answer.
- **Where a tool keeps its data is a lookup, not a theory.** Questions like "where is this setting
  stored" or "what does this field mean" have a recorded answer in the tool's code, docs, or issue
  tracker. Guessing instead tends to produce a chain of plausible theories, each built on the last
  and none checked, and the chain reads like progress. Search for the answer first, and when you
  hold a theory, run the one probe that would disprove it.
- **A control's configuration is not evidence of its effect.** In layered systems a rule declared at
  one layer can be bypassed entirely by a lower one, and the configuration file will read as correct
  either way — it records intent, not outcome. Reading the rule verifies that someone wrote it;
  only observing the layer that actually decides verifies that it does anything. Where a control
  matters, check the effect from the position the real traffic or caller occupies.

## Examples

Task-approach framing:

```md
Two plausible approaches to add the export format: (a) extend the existing serializer,
(b) add a dedicated formatter module. Discriminator: does the serializer already branch on
format anywhere? Checked the code — it does, twice. Extending it (a) follows the existing
seam; picking (b) would duplicate dispatch. Going with (a).
```

Bug-cause framing with a user challenge:

```md
User: "The tests fail because of the new fixture, right?"
Two plausible causes: (a) the changed fixture, (b) dependency drift after the rebase.
Discriminator: a clean dependency sync. Ran it — failures persist, and the failing
assertions all read the new fixture's fields. Evidence supports (a), agreeing with you —
confirmed by the diff, not by the assertion.
```

Abstention framing:

```md
Whether the third-party webhook retries on 503 isn't documented and can't be tested from
here. Low-stakes path: proceeding with idempotent handling, marked as an assumption.
High-stakes path (if retries could double-charge): stopping — checked the vendor docs and
SDK source; retry policy remains unknown; a sandbox test against their API would settle it.
```

## Before finishing

- The baseline for "this change fixed it" was captured before the change, not inferred after.
- Stated confidence matches the evidence gathered, and unverified assumptions are marked.
