---
name: ref-sp-agents-security
description: "How to keep coding agents away from secrets: threat model, protected vs excluded files, one policy synced to every client, verifying the block works, and the limits of file-based blocking. Use when changing protected files, policy sync, how a client is restricted, or checking that a block holds."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "security"
---

# Agents Security

How to keep agents from reading or changing secrets, in any repo and with any mix of clients. A
repo's own policy tool owns the concrete file, commands, and outputs; this skill is the method it
implements. Gating a *command* rather than a path is a `PreToolUse` hook (`ref-sp-agents-hooks`).
Unrelated despite the names: database protection is `ref-sp-db-security`, CI token hardening
`ref-sp-dev-github-actions-ci`.

## Threat model

An agent runs with the person's own access. What goes wrong:

- **A secret enters the context.** Whatever the agent reads goes to the model provider and can come
  back in output, logs, commit messages, or generated files.
- **A secret is changed or moved.** An agent can rewrite a credential file, or copy its contents
  into a tracked file.
- **The agent acts with someone else's identity.** It inherits the person's credentials, so
  anything that person can query or deploy, the agent can too.

No single control covers all three. Layer them, from weakest to strongest:

1. **A behavioural rule** in the instruction file every client reads (`AGENTS.md`). Depends on the
   model following it.
2. **Client-enforced path rules**: deny rules, exclusion files. Enforced by the client, but only for
   its own file tools.
3. **A sandbox** around the agent's process. Stops scripts and shells too, where the client has one.
4. **A separate, narrower credential** for the agent. The only control that holds for data reached
   through a command (see "The policy bounds files, not data").

## What to protect

Split patterns into two lists, because they need different treatment:

- **Protected:** secrets and credentials. Never read, never modified. Typical categories: environment
  files, private keys and certificates, cloud and package-registry credential files, token and
  password stores, infrastructure variable files, and app storage that holds sign-in state.
- **Excluded:** generated output and noise, such as build folders and lockfile churn. Kept out of
  context to save tokens and attention; not secret.

Name categories by pattern, never by a value, and keep the list in one place.

## One policy, every client

```text
policy source        one file people edit; the source of truth
  └── sync           deterministic generator
        ├── per-client outputs   deny rules, exclusion files, editor settings
        └── a check              fails when outputs drift from the source
instruction file     the behavioural rule, read by every client
```

- People edit the source only. Generated outputs are committed and reviewed, never authored.
- A sync that would overwrite a hand edit in a generated file stops and says so, rather than
  dropping it silently.
- The check runs in CI, so a stale output fails the build.
- Read each client's generated diff before committing: an unread security change is high-risk.

## How clients restrict access

| Client | File-level control | Limit |
| --- | --- | --- |
| Claude Code | `Read()` deny rules under `permissions.deny` in its settings | Blocks its file tools and simple shell reads; a script gets past it without the sandbox |
| Gemini | An exclusion file of patterns | Which file a product reads differs by product; check its docs |
| GitHub Copilot | Content exclusion set on GitHub, on plans that offer it | Without it, only a deterrent in editor settings plus the instruction file |

Treat which clients the policy targets as part of the trust model: an unlisted client gets only the
behavioural rule.

## Paths outside the repo

App storage that holds sign-in state, such as a desktop app's folder under `~/.config/<App>/`
(`~/Library/Application Support/<App>/` on macOS), is as sensitive as a key file. Keep it out of
the repo policy: some clients read its patterns as repo paths, and the folder differs by OS. Deny it
in user-level client settings with a `~/` anchor, such as `Read(~/.config/<App>/**)`, and name it
in the instruction file.

## Verify the block

A policy nobody tested is an assumption. After any change:

1. Create a **canary**: a harmless file with no real secret, at a path a protected pattern matches.
2. In each client, ask the agent to read it, and confirm it refuses or cannot.
3. Run the drift check, and confirm it passes on the committed outputs.
4. Delete the canary.

Record which clients passed, and state any that only have the behavioural rule.

## The policy bounds files, not data

Every path rule covers only what sits on disk. Any command that fetches the same data over a
network is outside it: `psql`, `bq`, `snowsql`, an ORM shell, a notebook kernel, a cloud CLI
(`gcloud`, `aws`), dbt. Blocking the obvious database CLIs while the project's main tool stays open
is a false boundary: `dbt show --inline "<sql>"` previews arbitrary query results, and
`dbt run-operation --sql "<sql>"` runs arbitrary SQL without a macro (as of dbt Core v1.12). List
these channels per repo.

Two responses, strongest first:

1. **Give the agent its own credential**, a connection profile bound to a read-restricted role.
   Agents inherit the person's ambient credentials (service account, ADC, `~/.dbt/profiles.yml`), so
   datastore permissions can't single out the agent until it has its own identity.
2. **Gate the read-shaped subcommands** with a `PreToolUse` hook. List the whole surface: for dbt,
   both `show` and `run-operation`, not just `--inline`.

A hook is a speed bump; the credential is the boundary. State which one the repo relies on, because
an unstated boundary reads as one that exists.

## Example: this repo's setup

Illustrative only; the method above is what applies elsewhere. In `swiftpostlabs/agentic-tools`,
`ref-sp-agents-policy` owns the implementation: the `policy` section of `.agents/config.json` with
`protectedFiles` and `excludedFiles` lists, `agentic-tools policy sync` and `check`, and outputs
for Gemini (`.aiexclude`), Claude Code (`.claude/settings.json`), and Copilot
(`.vscode/settings.json`, where protected patterns map to a `copilot-restricted-file` language that
Copilot is disabled for). A committed record of what sync wrote lets it stop before overwriting a
hand edit.

## Before finishing

- Each client's controls changed as intended, and none became weaker than the others.
- The canary check passed in every client the policy targets, or the gap is stated.
- The instruction file still describes the same restriction model.
- Any data a path pattern protects is not reachable through a command the agent may run, or the
  gap is stated.
