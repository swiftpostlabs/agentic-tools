# Source Traceability

Use this file when you need to verify where a `skills-authoring` rule came from.

## Purpose

This document maps important guidance in the `skills-authoring` skill to its source.

Status meanings:

- **Direct**: explicitly documented in the original reference.
- **Synthesized**: derived by combining multiple original references into one working rule.
- **Local**: a repo-specific convention or example extension, not part of the original standard.

Last verified: 2026-05-01

## Core Traceability Map

| Rule or guidance | Status | Why it exists | Source links | Local convention reference | Last verified |
| --- | --- | --- | --- | --- | --- |
| A skill is a directory with `SKILL.md` and optional `scripts/`, `references/`, and `assets/` folders. | Direct | This is the base package shape for skills. | [Agent Skills Overview](https://agentskills.io/home), [Specification](https://agentskills.io/specification), [Quickstart](https://agentskills.io/skill-creation/quickstart) | N/A | 2026-05-01 |
| Skills use progressive disclosure: discovery, activation, then resource loading on demand. | Direct | This is the main loading model that determines how much belongs in `SKILL.md` versus support files. | [Agent Skills Overview](https://agentskills.io/home), [Specification](https://agentskills.io/specification), [Adding skills support](https://agentskills.io/client-implementation/adding-skills-support) | N/A | 2026-05-01 |
| Keep `SKILL.md` concise and move bulky material into support files with explicit load conditions. | Direct | Large entry skills hurt activation quality and context efficiency. | [Best practices](https://agentskills.io/skill-creation/best-practices), [Specification](https://agentskills.io/specification), [Adding skills support](https://agentskills.io/client-implementation/adding-skills-support) | N/A | 2026-05-01 |
| The `description` field is the primary trigger surface for skill activation. | Direct | If the description fails, the skill body does not load. | [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions), [Specification](https://agentskills.io/specification) | N/A | 2026-05-01 |
| Description evaluation should use should-trigger and should-not-trigger queries. | Direct | Trigger quality needs explicit positive and negative cases. | [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) | N/A | 2026-05-01 |
| Trigger checks should be run multiple times and compared with train and validation splits. | Direct | The docs explicitly describe nondeterminism, trigger rate, and split-based evaluation. | [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) | N/A | 2026-05-01 |
| Output evals should use `evals/evals.json`, realistic prompts, assertions, baselines, grading, and iteration. | Direct | This is the official output-evaluation workflow described for skills. | [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills) | N/A | 2026-05-01 |
| Baselines should compare with-skill versus without-skill or versus the previous version. | Direct | A skill only matters if it improves behavior relative to a baseline. | [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills) | N/A | 2026-05-01 |
| Good skills start from real expertise and real project artifacts, not generic filler. | Direct | The official best-practices guide explicitly recommends extracting from real work and existing artifacts. | [Best practices](https://agentskills.io/skill-creation/best-practices) | N/A | 2026-05-01 |
| Prefer defaults over menus, preserve gotchas, use checklists, validation loops, and plan-validate-execute patterns. | Direct | These are explicit instruction patterns recommended for high-quality skills. | [Best practices](https://agentskills.io/skill-creation/best-practices) | N/A | 2026-05-01 |
| Skills can reference one-off commands or bundle reusable scripts, and scripts should be non-interactive and structured for agent use. | Direct | This is the official scripts guidance. | [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts), [Specification](https://agentskills.io/specification) | N/A | 2026-05-01 |
| Relative paths are correct for files inside the current skill. | Direct | The official docs describe relative references from the skill root for same-skill files. | [Specification](https://agentskills.io/specification), [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts) | N/A | 2026-05-01 |
| Cross-client discovery and activation should assume `.agents/skills/` interoperability rather than one private client layout. | Direct | The client-implementation guide describes discovery and interoperability around shared conventions. | [Adding skills support](https://agentskills.io/client-implementation/adding-skills-support), [Client Showcase](https://agentskills.io/clients), [Agent Skills Overview](https://agentskills.io/home) | N/A | 2026-05-01 |
| Skills should improve agent behavior across perception, planning, memory, reasoning, tool use, communication, and learning. | Synthesized | IBM documents these as core components of AI agents; `skills-authoring` applies them as a design rubric for better skills. | [Components of AI agents](https://www.ibm.com/think/topics/components-of-ai-agents), [AI agent perception](https://www.ibm.com/think/topics/ai-agent-perception), [AI agent planning](https://www.ibm.com/think/topics/ai-agent-planning), [AI agent memory](https://www.ibm.com/think/topics/ai-agent-memory), [Agentic reasoning](https://www.ibm.com/think/topics/agentic-reasoning), [AI agent communication](https://www.ibm.com/think/topics/ai-agent-communication), [AI agent learning](https://www.ibm.com/think/topics/ai-agent-learning), [Tool calling](https://www.ibm.com/think/topics/tool-calling) | N/A | 2026-05-01 |
| Skills should be written as multistep operational workflows, not just topic summaries. | Synthesized | IBM's workflow and planning material supports explicit task decomposition, stateful execution, feedback, and replanning. | [Agentic workflows](https://www.ibm.com/think/topics/agentic-workflows), [AI agent planning](https://www.ibm.com/think/topics/ai-agent-planning), [Building agentic workflows with LangGraph and Granite](https://www.ibm.com/think/tutorials/build-agentic-workflows-langgraph-granite) | N/A | 2026-05-01 |
| Tool-facing guidance should explicitly state tool choice, parameters, timing, and observable outcomes. | Synthesized | IBM's tool-calling references emphasize tool selection, structured arguments, response handling, and action execution. | [Tool calling](https://www.ibm.com/think/topics/tool-calling), [Tool Calling with Ollama](https://www.ibm.com/think/tutorials/local-tool-calling-ollama-granite), [Use LM Studio to build automatic tool calling with Granite](https://www.ibm.com/think/tutorials/use-lm-studio-to-build-automatic-tool-calling-granite) | N/A | 2026-05-01 |
| Cross-skill references should use absolute filesystem paths. | Local | The original docs clearly support relative same-skill references but do not define a stable cross-skill reference convention. This repo uses absolute paths to avoid ambiguity. | [Specification](https://agentskills.io/specification), [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts), [Adding skills support](https://agentskills.io/client-implementation/adding-skills-support) | [Absolute cross-skill paths](./local-conventions.md#absolute-cross-skill-paths) | 2026-05-01 |
| Important commands or actions may be framed with `what`, `why`, `when`, and `expected outcome`. | Local | The exact table is a local authoring pattern. It is supported conceptually by workflow, planning, reasoning, communication, and tool-use guidance. | [Best practices](https://agentskills.io/skill-creation/best-practices), [AI agent planning](https://www.ibm.com/think/topics/ai-agent-planning), [Agentic reasoning](https://www.ibm.com/think/topics/agentic-reasoning), [AI agent communication](https://www.ibm.com/think/topics/ai-agent-communication), [Tool calling](https://www.ibm.com/think/topics/tool-calling) | [Task framing pattern](./local-conventions.md#task-framing-pattern) | 2026-05-01 |
| The `task_framing_expectations` field in the eval example JSON is a local extension. | Local | It is a convenient example field for this repo, but it is not part of the official Agent Skills eval structure. | [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills) | [Eval example extension](./local-conventions.md#eval-example-extension) | 2026-05-01 |

## Verification Shortlist

If you only want to verify the highest-value sources, start here:

1. [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills)
2. [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)
3. [Best practices](https://agentskills.io/skill-creation/best-practices)
4. [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts)
5. [Specification](https://agentskills.io/specification)
6. [Adding skills support](https://agentskills.io/client-implementation/adding-skills-support)
7. [Components of AI agents](https://www.ibm.com/think/topics/components-of-ai-agents)
8. [Agentic workflows](https://www.ibm.com/think/topics/agentic-workflows)
9. [Tool calling](https://www.ibm.com/think/topics/tool-calling)

## Maintenance Rule

When `skills-authoring` changes, update this file if the change:

- adds a new rule,
- changes a rule's source status,
- introduces a new local convention,
- or relies on a newly consulted external reference.
