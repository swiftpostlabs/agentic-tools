---
name: ai-security
description: "AI policy, protected file access, exclusion sync, and multi-client enforcement. Use when: modifying .ai-policy.json, updating the sync workflow, reviewing generated restriction files, or changing how agents are prevented from reading sensitive files."
---

# AI Security

## Purpose

Define how AI agents are prevented from reading sensitive files, how noisy/generated files are excluded from context, and how the policy is synchronized across agent-specific configurations.

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

## Core Workflow

1. Edit `.ai-policy.json` as the source of truth.
2. Regenerate the managed outputs.
3. Review how the change affects each client.
4. Commit the source-of-truth file and generated files together.

Read `./references/policy-workflow.md` for the command-oriented workflow and `./references/agent-enforcement.md` for the client-enforcement model.

## Architecture Overview

```
.ai-policy.json                     ← Source of truth
    │
    ├── scripts/sync_ai_policy.py   ← Sync script
    │       │
    │       ├── .aiexclude                 → generated for Gemini/native exclusion
    │       ├── .claude/settings.json      → permissions.deny with protected Read() patterns
    │       └── .vscode/settings.json      → protected file associations + command/edit guardrails
    │
    └── .github/copilot-instructions.md    ← Behavioral directive (all agents via `.claude/CLAUDE.md` and `GEMINI.md`)
```

## Protected vs Excluded

- `protectedFiles`: security-sensitive files that must not be read or modified.
- `excludedFiles`: low-signal generated output or noise that should usually stay out of agent context, but are not secrets by default.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Edit `.ai-policy.json` | Update the security policy source of truth. | Generated restrictions and approvals derive from this file. | When protected files, excluded files, or approval maps must change. | The intended policy change is represented in one authoritative file. |
| `uv run sync-ai-policy` | Regenerate policy-managed client files. | Generated restrictions must stay aligned with the source of truth. | After any policy change. | `.aiexclude`, `.claude/settings.json`, and `.vscode/settings.json` update deterministically. |
| `uv run sync-ai-policy-import-vscode` | Import current VS Code approvals into policy, then regenerate outputs. | This is the supported path for promoting interactive approvals into durable policy. | Only when current VS Code approvals should become policy. | Approval maps are imported into `.ai-policy.json` and generated outputs remain aligned. |
| Review generated diffs | Check whether enforcement changed as intended. | Security changes are high risk if accepted without understanding the diff. | After every sync. | The diff is deliberate, limited, and understandable. |

## How Each Agent Is Restricted

| Agent | File-Level Restriction | Behavioral Instruction |
|-------|----------------------|----------------------|
| **Gemini** | Generated `.aiexclude` (protected + excluded patterns) | `GEMINI.md` → `@.github/copilot-instructions.md` |
| **Claude Code** | `.claude/settings.json` `permissions.deny` with protected `Read()` patterns | `.claude/CLAUDE.md` → `@.github/copilot-instructions.md` |
| **GitHub Copilot** | `.vscode/settings.json` protected file deterrent plus command/edit guardrails | `.github/copilot-instructions.md` security directive |

### Copilot Limitation

The `.vscode/settings.json` approach maps protected patterns to a `copilot-restricted-file` language ID and disables Copilot for that ID. This is a **best-effort workaround** — `copilot-restricted-file` is not a real language ID. The behavioral directive in `copilot-instructions.md` is still the primary enforcement.

## Decision Rules

- Put sensitive patterns in `protectedFiles`.
- Put noisy or generated output in `excludedFiles`.
- Keep approval policy in the source-of-truth file instead of manually editing generated outputs.
- Treat generated policy files as deterministic outputs, not primary authoring surfaces.
- Review enforcement limitations explicitly when changing Copilot-facing restrictions.

## Sync Script

**Location:** `scripts/sync_ai_policy.py`
**Run (recommended):** `uv run sync-ai-policy`
**Import VS Code approvals:** `uv run sync-ai-policy-import-vscode` (merges current VS Code approvals into `.ai-policy.json` then syncs)
**Requires:** Python >= 3.14

The script reads `.ai-policy.json` and writes:
- `.aiexclude` — protected + excluded patterns for Gemini/native exclusion
- `.claude/settings.json` — `permissions.deny` array with `Read(<pattern>)` entries for protected files
- `.vscode/settings.json` — protected `files.associations`, `github.copilot.enable`, and generated terminal/edit rules

Keep `.aiexclude` at the repo root. Do not move it under `.gemini/`. Gemini CLI's `.geminiignore` is a different feature with a different file name and purpose.

The command/edit policy is kept at the top level of `.ai-policy.json`. The script does not carry built-in approval defaults. It writes the managed approval sections from the policy so the generated files stay aligned with the source of truth instead of accumulating stale template-era rules.

When syncing `.claude/settings.json` and `.vscode/settings.json`, replace the policy-managed sections deterministically instead of appending to them. Removing an item from `.ai-policy.json` must remove the generated output on the next sync as well, while unrelated settings remain preserved where the script can distinguish them.

Keep this tool as a standalone repository script under `scripts/` unless the user explicitly asks to move it.

This repository intentionally keeps the implementation in `scripts/` while exposing the supported command through `[project.scripts]`.

Use the `--import-vscode` flag (also exposed via the `sync-ai-policy-import-vscode` entrypoint) to pull the current VS Code approval maps into `.ai-policy.json` first.

## References

- Read `./references/policy-workflow.md` when changing `.ai-policy.json`, syncing outputs, or reviewing policy diffs.
- Read `./references/agent-enforcement.md` when reviewing how the policy is enforced across Gemini, Claude Code, and GitHub Copilot.
