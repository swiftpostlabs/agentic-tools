# Evaluation Guide

Use this file when testing whether a skill actually improves behavior.

## Two Questions To Test

Every serious skill should be tested on two axes:

1. Trigger quality: did the skill activate when it should?
2. Output quality: did the activated skill improve the work?

These are different problems. A skill can be excellent but never trigger, or trigger perfectly and still add no value.

## Trigger Evaluation

Use realistic query sets with labels:

- `should_trigger: true`
- `should_trigger: false`

Guidelines:

- Use about 20 queries to start.
- Include near misses.
- Run each query multiple times if the model is nondeterministic.
- Track trigger rate rather than one-shot success.
- Keep train and validation splits separate during optimization.

See `../assets/trigger-eval-queries.example.json` for a simple example format.

## Output Evaluation

Test execution quality with real prompts and, when needed, input files.

Store eval definitions under `evals/evals.json` inside the skill directory when the skill is important enough to justify structured evals.

Each eval should include:

- A realistic prompt.
- An expected outcome.
- Optional input files.
- Assertions after the first run reveals what good looks like.

For workflow-heavy skills, it is often worth checking whether the skill framed the task clearly enough. A useful heuristic is whether the important actions answer:

- what is being done,
- why it is being done,
- when it should be used,
- and what outcome should confirm success.

If outputs are flaky, missing steps, or using the wrong command at the wrong time, review the skill for weak task framing rather than only adding more assertions.

See `../assets/evals.example.json` for a starter structure.

## Baselines

Run the same task:

- with the skill,
- without the skill,
- or against the previous version of the skill.

Without a baseline, it is easy to mistake competent base-model behavior for skill value.

## Assertions

Good assertions are:

- Observable.
- Specific.
- Verifiable by script or by clear reading.

Good examples:

- Output includes a chart image file.
- Response contains exactly three recommendations.
- Produced JSON is valid.
- Validator script exits successfully.

Weak examples:

- Output is good.
- Writing sounds nice.

Use humans for holistic quality and scripts for mechanical checks.

## Evidence Standards

Do not pass vague outputs on benefit of the doubt. Require evidence.

If the assertion is `includes a summary`, then a heading named `Summary` with no substance should fail.

## Execution Traces Matter

Read traces, not only final outputs.

Useful signals from traces:

- The agent ignored an instruction.
- The agent spent time on an irrelevant branch.
- The agent repeatedly rebuilt a helper that should be scripted.
- The agent got stuck because the skill gave too many equal choices.

## What To Change After Evals

If the skill fails because the agent is confused:

- simplify the instructions,
- add one stronger default,
- or add a concrete example.

If the skill fails because repeated logic is brittle:

- move that logic into a script.

If the skill passes but costs too many tokens or too much time:

- remove low-signal text,
- move details to references,
- or cut branches the agent rarely needs.

## Recommended Loop

1. Run the current skill.
2. Grade outputs and traces.
3. Identify patterns, not isolated anecdotes.
4. Revise the skill.
5. Rerun in a fresh iteration directory.
6. Compare against the baseline again.

Stop when improvements level off or the remaining issues are outside the skill's actual scope.
