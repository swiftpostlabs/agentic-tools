# Agent Enforcement

Use this file when reviewing how the policy is enforced across different agent clients.

## Enforcement Layers

There are two layers:

1. File-level or client-level restrictions generated from the policy source of truth.
2. Behavioral instructions in top-level guidance files that tell agents how to operate safely.

Both matter. File-level restrictions alone are not sufficient in every client.

## Client Summary

| Client | File-level mechanism | Behavioral mechanism | Expected outcome |
| --- | --- | --- | --- |
| Gemini | Generated exclusion file containing protected and excluded patterns when Gemini output is enabled | `GEMINI.md` routes to the shared top-level instructions | Gemini avoids protected and excluded files and follows the shared security guidance. |
| Claude Code | `.claude/settings.json` with protected `Read()` deny rules when Claude output is enabled | `.claude/CLAUDE.md` routes to the shared top-level instructions | Claude is blocked from protected reads and also inherits the shared behavioral policy. |
| GitHub Copilot | `.vscode/settings.json` protected associations and approval rules when Copilot output is enabled | shared top-level instructions (the root `AGENTS.md`, read natively by Copilot) contain the primary behavioral guidance | Copilot receives a best-effort file deterrent plus the main operating instructions. |

## Copilot Limitation

The `copilot-restricted-file` language-association workaround in `.vscode/settings.json` is best effort only. It is not a formal security boundary. The top-level behavioral instructions remain the primary enforcement for Copilot.

## Review Rule

When changing the policy, ask:

- Did the generated file-level controls change as intended?
- Did the behavioral instructions still describe the same model?
- Did the change accidentally make enforcement weaker in one client than another?
