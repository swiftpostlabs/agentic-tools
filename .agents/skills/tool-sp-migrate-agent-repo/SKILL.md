---
name: tool-sp-migrate-agent-repo
description: "Bring a repo's agent setup up to date after an agentic-tools layout change: find the migrations it has not applied, check, apply, verify, and record each one. Use when AGENTS.md says migrations are pending, after upgrading agentic-tools, or when agent folders sit at old paths."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "tool-sp-setup-agent-repo, ref-sp-agents-local-tasks"
---

# Migrate an Agent Repo

When agentic-tools changes where agent files live or how they are shaped, each repo that uses it
has to follow. This skill holds those changes as numbered migrations and the procedure to apply
them. Setting up a repo from nothing is `tool-sp-setup-agent-repo`. A fresh repo already has the
newest layout, so every check here passes at once: record each migration as you go and nothing
moves.

## Steps

1. **List what is pending.** Run, from the repo root:

   ```sh
   node <this skill's folder>/scripts/pending-migrations.mts --repo .
   ```

   It prints each migration newer than the one recorded in `.agents/local/migrations.json`, oldest
   first, or nothing when the repo is current. No record means nothing has been applied.

2. **Apply them one at a time, oldest first.** For each, read its file in
   `./references/migrations/` (the script prints the path) and follow it in order:
   - **Check.** Run its check first. If the check says the change is already there, skip to
     recording it.
   - **Apply.** Do the steps as written, on this machine only.
   - **Verify.** Run its verify step. If it fails, stop, leave the record unchanged, and report
     what failed.

3. **Record it.** After a migration verifies, run:

   ```sh
   node <this skill's folder>/scripts/pending-migrations.mts --repo . --record <number> [--note <text>]
   ```

   Use `--note` when the migration file asks for one, such as `links-left`.

   The script accepts only the next pending number, so none is skipped, and it keeps each
   migration's note when later ones are recorded. The record is machine-local and gitignored,
   because the folders migrations move are too.

4. **Report** which migrations ran, which were already in place, and anything skipped.

## Rules

- **Stop at the first failure.** Later migrations may assume earlier ones.
- **Never delete user data.** A migration moves or rewrites; when a target already exists, it
  merges or stops and asks, never overwrites.
- **Migrations are permanent.** Fix a wrong one with a new, higher-numbered migration, never by
  editing one that may already have run elsewhere.

## Writing a migration

Add `references/migrations/<NNNN>-<slug>.md`, four digits, next free number. Its first heading is
the title the script prints. It has these sections, in order: **Why** (the layout change, with the
commit or skill that made it), **Check** (how to tell it is already done), **Apply** (exact steps,
for Windows and POSIX where they differ), and **Verify**. Then add the line to the table below.

| Number | Change |
| --- | --- |
| 0001 | Agent folders move under `.agents/local/`: read `./references/migrations/0001-agents-local-folders.md` when it is pending. |
| 0002 | A pre-rooms board's messages move into a first room: read `./references/migrations/0002-board-messages-into-a-room.md` when it is pending. |

## Gotchas

- On Windows, a folder another process holds open (an editor, a running watcher) cannot be moved.
  Close it or stop that process, then retry the step.
- A repo moved by hand may have no record yet. Run each check anyway: a migration already in
  place is recorded without being applied again.
