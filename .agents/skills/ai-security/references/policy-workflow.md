# Policy Workflow

Use this file when changing the AI policy model or the sync workflow.

## Purpose

Keep `.ai-policy.json`, generated restriction files, and top-level behavioral instructions aligned.

## Core Workflow

1. Edit `.ai-policy.json`.
2. Decide whether each pattern belongs in `protectedFiles` or `excludedFiles`.
3. Update approval maps only when the repo's intended trust policy has changed.
4. Run `uv run sync-ai-policy`.
5. Review the generated outputs for deterministic, intended changes.
6. Commit the policy file and all generated outputs together.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Edit `.ai-policy.json` | Change the source-of-truth policy model. | All generated restrictions and approval maps derive from this file. | Whenever protected files, excluded files, or approval behavior must change. | The intended policy change is expressed in one source-of-truth file. |
| `uv run sync-ai-policy` | Regenerate `.aiexclude`, `.claude/settings.json`, and `.vscode/settings.json`. | Generated files must stay synchronized with the policy source of truth. | After any policy change. | Generated files update deterministically and reflect the new policy. |
| `uv run sync-ai-policy-import-vscode` | Import current VS Code approvals into `.ai-policy.json` and then sync. | This promotes user-approved interactive changes into the durable policy model. | Only when VS Code approvals should be preserved as policy, not as transient editor state. | `.ai-policy.json` absorbs the current approval maps and regenerated files stay aligned. |
| Review generated diffs | Confirm only intended restrictions and approvals changed. | Security policy drift or accidental broadening is easy to miss if files are not reviewed together. | After every sync. | The diff is understandable, deliberate, and limited to policy-managed sections. |

## Decision Rules

- Put sensitive or high-risk files in `protectedFiles`.
- Put noisy, generated, or low-signal files in `excludedFiles`.
- Do not treat generated outputs as hand-edited source files.
- Do not update editor-specific approvals manually when the policy file should remain authoritative.
- If the change alters trust boundaries, review both the generated files and the behavioral instructions that explain the restriction model.
