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
| Gemini | Generated exclusion file containing protected and excluded patterns when Gemini output is enabled | the root `AGENTS.md`, once `context.fileName` points Gemini at it | Gemini avoids protected and excluded files and follows the shared security guidance. |
| Claude Code | `.claude/settings.json` with protected `Read()` deny rules when Claude output is enabled | the root `AGENTS.md`, read natively by Claude Code | Claude is blocked from protected reads and also inherits the shared behavioral policy. |
| GitHub Copilot | `.vscode/settings.json` protected associations and approval rules when Copilot output is enabled | shared top-level instructions (the root `AGENTS.md`, read natively by Copilot) contain the primary behavioral guidance | Copilot receives a best-effort file deterrent plus the main operating instructions. |

## Copilot Limitation

The `copilot-restricted-file` language-association workaround in `.vscode/settings.json` is best effort only. It is not a formal security boundary. The top-level behavioral instructions remain the primary enforcement for Copilot.

## Non-File Channels

Both layers above are addressed at paths. Neither sees a command that fetches the same data over the
network, so the policy stops an agent reading a protected CSV on disk while leaving the identical
rows reachable through a warehouse or database client the repo already depends on.

Enumerate those channels per repo rather than assuming the list is the usual database CLIs. A
transformation tool counts: `dbt show` and `dbt run-operation --sql` both execute arbitrary SQL and
surface results, and blocking `bq` or `psql` while leaving dbt open closes nothing. Notebook kernels,
ORM shells, and cloud CLIs (`gcloud`, `aws`) behave the same way.

Closing one has two levers, and they are not equivalent:

| Lever | Mechanism | Strength |
| --- | --- | --- |
| Agent-scoped credential | A separate connection profile or service account bound to a read-restricted role | Holds against commands nobody enumerated |
| Command gate | A `PreToolUse` hook matching the tool and subcommand (see `ref-sp-agents-hooks`) | Holds only for the subcommands actually enumerated |

## Review Rule

When changing the policy, ask:

- Did the generated file-level controls change as intended?
- Did the behavioral instructions still describe the same model?
- Did the change accidentally make enforcement weaker in one client than another?
- Is any data protected by a path pattern also reachable through a command the agent may run?
