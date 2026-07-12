---
name: ref-sp-agents-security
description: "Reference guidance for agent security policy, protected file access, exclusion sync, and multi-client enforcement. Use when: modifying a policy source file, updating the sync workflow, reviewing generated restriction files, or changing how agents are prevented from reading sensitive files."
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "organization"
  shareable-skills.tags: "security"
---

# Agents Security

## Purpose

Define how agent clients are prevented from reading sensitive files, how noisy or generated files are excluded from context, and how the policy is synchronized across agent-specific configurations.

## Values

- Prefer simplicity over cleverness.
- Prefer maintainability over short-term convenience.
- Keep policy synchronization deterministic and easy to audit.
- Keep the source of truth explicit.
- Make enforcement boundaries and limitations visible.

## When to use this skill

- Adding or modifying protected or excluded file patterns.
- Updating the sync script or sync workflow.
- Reviewing generated restriction files.
- Reviewing AI security configuration across clients.
- Adopting the policy system in another repository.

## Scope boundaries

This skill owns the **agent file-access policy**: which files an agent may read, how exclusions are
generated, and how each client enforces them.

- `ref-sp-agents-policy` — this repo's concrete implementation of that model: the `.agents/config.json`
  policy section, the sync command, and the generated vendor outputs. This skill is the portable
  model; that one is the local machinery.
- `ref-sp-db-security` — despite the similar name, an unrelated subject: protecting a *database*
  (privileges, encryption, auditing). Nothing to do with agent file access.
- `ref-sp-dev-github-actions-ci` — workflow token scope, runner trust, and action pinning. CI
  hardening is a different attack surface from agent read policy.

## Core Workflow

1. Edit the policy source-of-truth file.
2. Regenerate the managed outputs.
3. Review how the change affects each client.
4. Commit the source-of-truth file and generated files together.

Read `./references/policy-workflow.md` for the command-oriented workflow and `./references/agent-enforcement.md` for the client-enforcement model.

If the repo ships a concrete policy-implementation skill, use it for the concrete policy file, sync command, and generated-file implementation (in this repo, `ref-sp-agents-policy` covers the `.agents/config.json` policy, `agentic-tools policy`, and generated files).

## Architecture Overview

```
policy source file                 ← Source of truth
    │
    ├── sync implementation        ← deterministic generator
    │       │
    │       ├── exclusion file            → generated for Gemini/native exclusion when enabled
    │       ├── Claude settings           → protected `Read()` rules when enabled
    │       └── VS Code settings          → Copilot deterrents and approval maps when enabled
    │
    └── top-level instructions      ← Behavioral directive layer across providers
```

## Protected vs Excluded

- `protectedFiles`: security-sensitive files that must not be read or modified.
- `excludedFiles`: low-signal generated output or noise that should usually stay out of agent context, but are not secrets by default.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Edit the policy source file | Update the security policy source of truth. | Generated restrictions and approvals derive from this file. | When protected files, excluded files, approval maps, or target clients must change. | The intended policy change is represented in one authoritative file. |
| Run the sync command | Regenerate policy-managed client files. | Generated restrictions must stay aligned with the source of truth. | After any policy change. | Generated outputs update deterministically for the enabled clients. |
| Import editor approvals first | Import current editor approvals into policy, then regenerate outputs. | This is the supported path for promoting interactive approvals into durable policy. | Only when current editor approvals should become policy. | Approval maps are imported into the source-of-truth policy and generated outputs remain aligned. |
| Review generated diffs | Check whether enforcement changed as intended. | Security changes are high risk if accepted without understanding the diff. | After every sync. | The diff is deliberate, limited, and understandable. |

## How Each Agent Is Restricted

| Agent | File-Level Restriction | Behavioral Instruction |
|-------|----------------------|----------------------|
| **Gemini** | Generated exclusion file containing protected and excluded patterns when Gemini output is enabled | `GEMINI.md` routes to the shared top-level instructions |
| **Claude Code** | `.claude/settings.json` `permissions.deny` with protected `Read()` patterns when Claude output is enabled | `.claude/CLAUDE.md` routes to the shared top-level instructions |
| **GitHub Copilot** | `.vscode/settings.json` protected file deterrent plus command/edit guardrails when Copilot output is enabled | shared top-level instructions (the root `AGENTS.md`, which Copilot reads natively) carry the security directive |

### Copilot Limitation

The `.vscode/settings.json` approach maps protected patterns to a `copilot-restricted-file` language ID and disables Copilot for that ID. This is a **best-effort workaround** — `copilot-restricted-file` is not a real language ID. The behavioral directive in the shared top-level instructions (`AGENTS.md`) is still the primary enforcement.

## Decision Rules

- Put sensitive patterns in `protectedFiles`.
- Put noisy or generated output in `excludedFiles`.
- Let the policy source file declare which client outputs should be generated when the implementation supports selective targets.
- Keep approval policy in the source-of-truth file instead of manually editing generated outputs.
- Treat generated policy files as deterministic outputs, not primary authoring surfaces.
- Review enforcement limitations explicitly when changing Copilot-facing restrictions.

## References

- Read `./references/policy-workflow.md` when changing the policy source of truth, syncing outputs, or reviewing policy diffs.
- Read `./references/agent-enforcement.md` when reviewing how the policy is enforced across Gemini, Claude Code, and GitHub Copilot.
- Read the repo's concrete policy-implementation skill (in this repo, `ref-sp-agents-policy`) when you need that repo's concrete policy file location, command names, service-selection model, or generated output details.
