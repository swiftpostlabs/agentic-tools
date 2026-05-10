# Policy Workflow

Use this file when changing the AI policy model or the sync workflow.

## Purpose

Keep the policy source-of-truth file, generated restriction files, and top-level behavioral instructions aligned.

## Core Workflow

1. Edit the policy source file.
2. Decide whether each pattern belongs in `protectedFiles` or `excludedFiles`.
3. Update approval maps or enabled services only when the repo's intended trust policy has changed.
4. Run the repo's policy sync command.
5. Review the generated outputs for deterministic, intended changes.
6. Commit the policy file and all generated outputs together.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Edit the policy source file | Change the source-of-truth policy model. | All generated restrictions and approval maps derive from this file. | Whenever protected files, excluded files, approval behavior, or enabled clients must change. | The intended policy change is expressed in one source-of-truth file. |
| Run the policy sync command | Regenerate the policy-managed exclusion file and client settings. | Generated files must stay synchronized with the policy source of truth. | After any policy change. | Generated files update deterministically and reflect the new policy. |
| Import editor approvals then sync | Import current editor approvals into policy and then sync. | This promotes user-approved interactive changes into the durable policy model. | Only when editor approvals should be preserved as policy, not as transient editor state. | The policy absorbs the current approval maps and regenerated files stay aligned. |
| Review generated diffs | Confirm only intended restrictions and approvals changed. | Security policy drift or accidental broadening is easy to miss if files are not reviewed together. | After every sync. | The diff is understandable, deliberate, and limited to policy-managed sections. |

## Decision Rules

- Put sensitive or high-risk files in `protectedFiles`.
- Put noisy, generated, or low-signal files in `excludedFiles`.
- If the implementation supports selective client outputs, treat that as part of the intended trust model rather than as an implementation afterthought.
- Do not treat generated outputs as hand-edited source files.
- Do not update editor-specific approvals manually when the policy file should remain authoritative.
- If the change alters trust boundaries, review both the generated files and the behavioral instructions that explain the restriction model.
