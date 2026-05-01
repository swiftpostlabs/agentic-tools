# Agent Components Mapping

Use this file when shaping skill instructions so they improve actual agent behavior rather than just documenting a topic.

This mapping is based on the common AI-agent components discussed in IBM's material: perception, planning, memory, reasoning, tool calling, communication, and learning.

## Perception

Question:

- What inputs should the agent inspect first, and how should it interpret them?

Good skill content:

- file locations to inspect,
- relevant signals,
- preprocessing steps,
- ambiguity reducers,
- priority ordering among inputs.

Examples:

- Read the failing test before reading broad surrounding code.
- Inspect config files before changing runtime code.
- Normalize user-provided field names against the schema before validation.

## Planning

Question:

- What sequence of steps should the agent follow?

Good skill content:

- ordered workflow,
- dependencies between steps,
- checkpoints,
- replanning triggers,
- step boundaries.

Examples:

- edit, validate, fix, revalidate.
- extract fields, build mapping, validate, then apply.

## Memory

Question:

- What stable facts should the agent retain or reload consistently?

Good skill content:

- schemas,
- naming mismatches,
- repo conventions,
- known gotchas,
- reusable templates.

The skill is a memory aid. If a fact is repeatedly needed and not obvious, store it in the skill or a clearly referenced file.

## Reasoning

Question:

- What decision rules should guide the agent when the task is not purely mechanical?

Good skill content:

- why a default exists,
- tradeoff rules,
- how to choose between branches,
- what makes one path safer or more reliable.

Explain the reason behind fragile instructions when possible. Models follow purpose better than arbitrary commands.

## Tool Calling

Question:

- What tools, commands, scripts, or APIs should the agent use, and how?

Good skill content:

- exact commands,
- script names,
- parameter expectations,
- input and output file shapes,
- validators and wrappers.

Weak skill content:

- vague instructions like `use the appropriate tool`.

## Communication

Question:

- How should the agent communicate progress and final outputs?

Good skill content:

- expected report structure,
- what to summarize,
- when to escalate,
- what evidence to include,
- status or handoff format.

## Learning And Adaptation

Question:

- How should the skill improve over time?

Good skill content:

- a bias toward trace review,
- recurring-correction capture,
- eval-driven iteration,
- promotion of repeated helper logic into scripts.

## Design Standard

When a skill is weak, it usually fails at one of these levels:

- it does not tell the agent what to notice,
- it does not tell the agent what order to work in,
- it does not preserve the right facts,
- it does not make decision rules explicit,
- it does not name the right tools,
- it does not define acceptable output,
- or it does not incorporate lessons from past failures.

Use this mapping to diagnose which layer is missing.
