# Task Framing Guide

Use this file when a skill needs to teach the agent how to carry out a workflow, command sequence, or operational task with clear intent and success criteria.

## Purpose

Many weak skills describe actions without framing what the action is for, why it exists, when it should be used, or what success looks like. That makes activation and execution less reliable.

When a skill includes commands, workflows, or repeated task steps, prefer explicit task framing built around these question words:

- **What:** what is the agent doing?
- **Why:** why is this step needed?
- **When:** when should this step be used?
- **Expected outcome:** what result should the agent observe if the step worked?

## Default Format

For command-oriented or task-oriented guidance, use a table like this when it improves clarity:

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| `uv run poe test` | Run the project's test suite. | Validate behavior after a code change. | After editing code that can affect runtime behavior. | Tests pass, or failures clearly identify the next defect to fix. |
| `uv run poe typecheck` | Run static type checking. | Catch type regressions before finalizing the change. | After changing typed Python code or public interfaces. | Typecheck completes without new errors in the touched slice. |

## When To Use This Structure

Use the table or an equivalent structured list when:

- a skill contains multiple commands or actions,
- the order matters,
- similar commands serve different purposes,
- the agent needs a clear success signal,
- or the workflow is easy to misuse without context.

Do not force a table into a skill that only needs a short narrative rule. Use it where it reduces ambiguity.

## Why This Helps

This structure improves several agent components at once:

- **Perception:** the agent can see which action belongs to which situation.
- **Planning:** the agent can pick the right step for the right stage.
- **Reasoning:** the `why` column makes decision rules explicit.
- **Communication:** the expected outcome gives the agent a basis for reporting whether the step succeeded.

## Command Versus Action

The first column can be either:

- a literal command,
- a script path,
- a tool call,
- or a named action such as `Review trigger queries`.

Use the label that best matches the underlying operation.

## Good Pattern

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| `Run ./scripts/validate.py output.json` | Validate the generated output against the schema. | Catch format and field errors before delivery. | After generating or editing the output file. | Validator exits successfully and reports no schema violations. |

## Weak Pattern

- `Run validate.py if needed.`

This is weak because it leaves the trigger condition and success criteria implicit.

## Narrative Alternative

If a table is too heavy, keep the same logic in prose:

1. **What:** run `./scripts/validate.py output.json`.
2. **Why:** this checks the output against the schema before delivery.
3. **When:** do it after generating or editing the output file.
4. **Expected outcome:** the validator exits successfully with no schema violations.

## Review Questions

When reviewing a skill, ask:

- Does each important command or action say what it does?
- Is the reason for the step explicit?
- Does the skill say when the step should be used?
- Is success observable, or is the agent left guessing?

If the answer is no for several steps, add structured task framing.
