---
name: ref-swiftpost-ai-policy
description: "Repository-specific guidance for the agents-policy feature, .agents/policy.json, and generated AI restriction outputs in this repo. Use when: editing src/agentic_tools/agents_policy, updating policy docs, or debugging Copilot, Claude Code, or Gemini policy generation here."
metadata:
  shareable-skills.visibility: "repo-local"
  shareable-skills.reason: "This reference documents the repository-specific agents-policy implementation, file layout, and generated output contract used in this repo."
---

# Swiftpost AI Policy

## Purpose

Document this repository's concrete AI policy implementation: the canonical policy file, the `agents-policy` CLI, the generated client outputs, and the service-selection model that decides which vendors receive managed files.

## When to use this skill

- Editing `src/agentic_tools/agents_policy/`.
- Updating policy docs, CI enforcement, or command references in this repo.
- Debugging why `.aiexclude`, `.claude/settings.json`, or `.vscode/settings.json` did or did not change.
- Explaining how `.agents/policy.json` should be authored in this repo.

## Stable Surface

- Canonical policy file: `.agents/policy.json`
- Canonical commands:
  - `uv run agents-policy`
  - `uv run agents-policy-import-vscode`
- Compatibility aliases still supported:
  - `uv run sync-ai-policy`
  - `uv run sync-ai-policy-import-vscode`
- Implementation path: `src/agentic_tools/agents_policy/main.py`

## Policy Model

The source-of-truth file is JSON and currently supports these main fields:

- `services` — list of enabled client outputs, such as `gemini`, `claude`, and `copilot`
- `protectedFiles` — sensitive patterns that should be blocked or deterred
- `excludedFiles` — noisy or generated patterns that should stay out of Gemini/native exclusion when enabled
- `terminalAutoApprove` — managed VS Code terminal approval map for Copilot-related tooling
- `editAutoApprove` — managed VS Code edit approval map

If `services` is omitted, the implementation defaults to all supported services.

## Generated Outputs

| Service | Output | Behavior |
| --- | --- | --- |
| `gemini` | `.aiexclude` | Generated from `protectedFiles` and `excludedFiles`. If Gemini is disabled, the managed file is removed. |
| `claude` | `.claude/settings.json` | Managed `permissions.deny` `Read(...)` rules track `protectedFiles`. If Claude is disabled, managed read rules are cleaned. |
| `copilot` | `.vscode/settings.json` | Managed file associations, Copilot language disablement, and approval maps track the policy. If Copilot is disabled, the managed sections are cleaned. |

## Command Behavior

### `uv run agents-policy`

- Finds the nearest `.agents/policy.json`, with legacy `.ai-policy.json` fallback.
- Loads the policy file, validates `services`, and syncs the enabled outputs.
- Cleans managed sections for disabled outputs so stale vendor files do not linger.

### `uv run agents-policy-import-vscode`

- Imports current VS Code approval maps into the policy file first.
- Writes the updated policy back to `.agents/policy.json`.
- Runs the same sync flow afterward.

## Decision Rules

- Use `.agents/policy.json` as the only source of truth.
- Prefer `services` to control vendor coverage instead of hand-editing generated files.
- Keep `.aiexclude` at the repo root; do not replace it with a made-up Gemini-only ignore file.
- Treat `.claude/settings.json` and `.vscode/settings.json` as partially managed outputs, not primary authoring surfaces for policy-owned sections.
- Keep docs and CI on the canonical `agents-policy` command even though compatibility aliases still exist.

## Validation

- Run `uv run agents-policy` after changing `.agents/policy.json` or the sync implementation.
- Run `uv run python -m pytest src/agentic_tools/agents_policy/main_test.py -q` when changing policy logic.
- Check CI drift enforcement in `.github/workflows/ci.yaml` if output file names or command names change.
- Keep `.aiexclude`, `.claude/settings.json`, and `.vscode/settings.json` aligned with the current policy file.

## References

- Read `./references/checklist.md` for a quick maintenance or debugging pass.
- Read `./references/config-shape.md` for the current `.agents/policy.json` contract.
- Read `./references/copilot.md`, `./references/claude-code.md`, and `./references/gemini.md` for vendor-specific output details.
- Read `.agents/skills/ref-ai-security/SKILL.md` for the portable concepts that sit above this repo's concrete implementation.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for policy-tooling prompts.
- Review `./evals/evals.json` when validating output quality for policy implementation explanations.
