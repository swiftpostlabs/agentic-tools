---
name: ref-sp-agents-security
description: "How agents are kept away from sensitive files: protected vs excluded patterns, one policy synced to each client's settings, and the limits of file-based blocking. Use when changing protected files, policy sync, or how a client is restricted."
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "organization"
  shareable-skills.tags: "security"
---

# Agents Security

The portable model for agent file access. This repo's implementation (`.agents/config.json`, the
`agentic-tools policy` commands) is `ref-sp-agents-policy`. Gating a *command* rather than a path is
a `PreToolUse` hook (`ref-sp-agents-hooks`). Unrelated despite the names: database protection is
`ref-sp-db-security`, CI token hardening `ref-sp-dev-github-actions-ci`.

## Model

```text
policy source file              source of truth
  └── sync (deterministic)
        ├── exclusion file      Gemini
        ├── Claude settings     Read() deny rules
        └── VS Code settings    Copilot deterrents, approval maps
AGENTS.md                       behavioural rule, read by every client
```

- `protectedFiles`: secrets and credentials. Must not be read or modified.
- `excludedFiles`: generated output and noise. Kept out of context, not secret.

## Changing the policy

1. Edit the policy source file only; generated files are outputs, never authoring surfaces.
2. Run the sync. To turn interactive editor approvals into policy, import them first, then sync.
3. Read the generated diff for each client: security changes are high-risk if accepted unread.
4. Commit the source and generated files together.

## How each client is restricted

| Client | File-level | Behavioural |
| --- | --- | --- |
| Gemini | Generated exclusion file with protected and excluded patterns | Root `AGENTS.md`, once `context.fileName` points Gemini at it |
| Claude Code | `.claude/settings.json` `permissions.deny` `Read()` rules | Root `AGENTS.md`, read natively |
| GitHub Copilot | `.vscode/settings.json` deterrent plus command and edit approvals | Root `AGENTS.md`, read natively |

Copilot's file-level block is a workaround: protected patterns map to a fake
`copilot-restricted-file` language that Copilot is disabled for. The rule in `AGENTS.md` is the real
control there.

## The policy bounds files, not data

Every mechanism above matches a path, so it only covers what sits on disk. Any command that can
fetch the same data over a network is outside it: `psql`, `bq`, `snowsql`, an ORM shell, a notebook
kernel, a cloud CLI (`gcloud`, `aws`), dbt. Blocking the obvious database CLIs while the project's
main tool stays open is a false boundary: `dbt show --inline "<sql>"` previews arbitrary query
results (`--output json` for machines), and `dbt run-operation --sql "<sql>"` runs arbitrary SQL
without a macro (dbt Core v1.12).

Two responses, strongest first:

1. **Give the agent its own credential**, a connection profile bound to a read-restricted role.
   Agents inherit the human's ambient credentials (service account, ADC, `~/.dbt/profiles.yml`), so
   datastore permissions can't single out the agent until it has its own identity. This is the only
   control that survives a command nobody listed.
2. **Gate the read-shaped subcommands** with a `PreToolUse` hook. List the whole surface: for dbt,
   both `show` and `run-operation`, not just `--inline`.

A hook is a speed bump; the credential is the boundary. State which one the repo relies on, because
an unstated boundary reads as one that exists.

## Before finishing

- Each client's generated controls changed as intended, and none became weaker than the others.
- `AGENTS.md` still describes the same restriction model.
- Any data a path pattern protects is not reachable through a command the agent may run, or the
  gap is stated.
