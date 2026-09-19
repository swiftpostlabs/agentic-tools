---
name: tool-sp-setup-agent-repo
description: "Audit a repository against the shared agent baseline — the .agents local workspaces, the core skills and how they are distributed, AGENTS.md as the single source of truth, and per-client bridges — then wire up whatever is missing. Use when: setting up agent tooling in a new or existing repo, checking whether a repo has .agents/tasks, .agents/retro, and .agents/playground gitignored, checking whether the core skills are present and whether the stack needs more, adopting shared skills by vendoring, sync, or marketplace plugin, moving CLAUDE.md or copilot-instructions.md content into AGENTS.md behind a bridge, or wiring a client such as Claude Code, Copilot, Gemini, Cursor, Codex, Hermes, or OpenClaw to the repo's AGENTS.md."
argument-hint: "Repo path to audit, and which agent clients it should support"
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "tasks, retro, docs"
  shareable-skills.suggests: "ref-sp-agents-instructions-authoring, ref-sp-agents-skills-authoring, ref-sp-agents-local-tasks, ref-sp-agents-retro, ref-sp-agents-mr-wolf-persona, ref-sp-agents-plugin-marketplaces, ref-sp-agents-shareable-skills"
---

# Setup Agent Repo

## Purpose

Bring any repository up to the shared agent baseline in one pass: detect what is already there,
report exactly what is missing, and wire up the gaps in a safe order. The audit is a single script
run, so the expensive part is the remediation, not the discovery.

## When to use this skill

- Setting up agent tooling in a repo that has none, or that has it half-done.
- Checking whether a repo has the `.agents/` local workspaces, gitignored.
- Checking whether the core skills are present, and whether the repo's stack calls for more.
- Deciding how a repo should consume shared skills: vendored, synced, or via a marketplace plugin.
- Consolidating `CLAUDE.md`, `.github/copilot-instructions.md`, or `.cursorrules` into `AGENTS.md`.
- Wiring a specific client (Claude Code, Copilot/VS Code, Gemini, Cursor, Codex, Hermes, OpenClaw)
  to the repo's `AGENTS.md`.

## Scope boundaries

This tool owns **whether a repo has the baseline and how to install it**. It does not own the
content standards of the pieces it installs:

- `ref-sp-agents-instructions-authoring` — how `AGENTS.md` and each provider bridge should be
  written, and the provider-specific reference files. This tool applies those rules; it does not
  restate them.
- `tool-sp-maintain-agents-instructions` — refreshing instruction files that already exist and have
  drifted. Use that when the baseline is present; use this one when it is missing or unknown.
- `ref-sp-agents-local-tasks` / `ref-sp-agents-retro` — the internal structure of `.agents/tasks/`
  and `.agents/retro/`. This tool creates the directories and checks they are ignored; those skills
  own the lifecycle folders, frontmatter, and status rules.
- `ref-sp-agents-skills-authoring` / `ref-sp-agents-shareable-skills` — writing skills and the
  sharing spec. This tool only checks which skills are *present* and how they got there.
- `ref-sp-agents-plugin-marketplaces` — publishing skills as a plugin. This tool covers the consumer
  side: installing one.

## First step

Run the audit before reading anything else or touching a file:

```bash
python3 <skill-dir>/scripts/audit_agent_repo.py --repo <repo>
```

It runs read-only, prints one line per check plus a fix-relevant detail list, and exits non-zero
when a check failed. Use `--json` when the output feeds another step, and `--only W1,W2` to re-run a
subset after a fix. `uv run <skill-dir>/scripts/audit_agent_repo.py` works too; the script is
stdlib-only with PEP 723 metadata.

Do not re-derive the audit by hand with a series of `ls` and `grep` calls. That is the slow path the
script exists to replace.

## The baseline

| Check | What good looks like |
| --- | --- |
| `W1` | `.agents/tasks/`, `.agents/retro/`, and `.agents/playground/` all exist. |
| `W2` | All three match a gitignore rule. |
| `W3` | Nothing under them is committed, except a placeholder `.gitignore` used to keep the directory. |
| `S1` | `.agents/skills/` exists and holds skills. |
| `S2` | The five core skills are present (see below). |
| `S3` | No skills live outside `.agents/skills/` as real directories. |
| `S4` | Skills arrive through exactly one deliberate distribution mode. |
| `I1` | A root `AGENTS.md` exists and carries personality, always-on rules, workflow/commands, and skill routing. |
| `I2` | Every other instruction file is a thin bridge to `AGENTS.md`, not a second body. |
| `C1` | Every client the repo shows traces of is wired. |
| `C2` | When Claude is in use, `.claude/skills` is a gitignored symlink resolving to the repo's `.agents/skills/`. |
| `C3` | When VS Code is in use, `chat.useAgentsMdFile` is enabled. |
| `R1` | The stack markers found have their matching skills installed. |

The five core skills: `ref-sp-agents-skills-authoring`, `ref-sp-agents-instructions-authoring`,
`tool-sp-maintain-skills`, `ref-sp-agents-retro`, `ref-sp-agents-local-tasks`.

## Core workflow

1. **Audit.** Run the script. Note every non-`pass` check.
2. **Read the repo's intent** before proposing fixes: an existing `CLAUDE.md` body, a
   `.github/copilot-instructions.md`, or skills in a non-standard root are decisions someone made.
   Report them as findings to consolidate, not as mistakes to silently overwrite.
3. **Decide the distribution mode** (`S4`) *before* fixing skills, because it determines whether
   missing skills get copied, linked, or installed. See `./references/remediation.md`.
4. **Confirm the plan with the user** when it involves moving or rewriting existing content —
   relocating skill directories, folding a `CLAUDE.md` body into `AGENTS.md`, or deleting a
   duplicated instruction file. Creating missing directories, gitignore lines, symlinks, and
   settings keys does not need a round trip.
5. **Fix in order**: workspaces → skills → `AGENTS.md` → bridges → client wiring. Each stage assumes
   the previous one. Per-check procedures are in `./references/remediation.md`.
6. **Re-run the audit** and report the remaining non-`pass` checks honestly, including any the user
   declined.

## Consolidating instruction files

When a provider file already carries real guidance, the fix is a **move plus a bridge**, never a
delete:

1. Merge its content into `AGENTS.md`, dropping anything already covered there.
2. Replace the provider file with a bridge — an `@AGENTS.md` import or a symlink. Prefer the import
   on Windows, where symlinks need Administrator rights or Developer Mode.
3. Keep provider-specific text in the bridge only when a real platform behaviour requires it.

Then bring `AGENTS.md` itself up to standard using `./assets/agents-md-outline.md`. The personality
block is the one place a repo deliberately duplicates skill text: inline the persona core so it
loads on every turn, and treat the persona skill as the canonical source it is refreshed from. If
the repo does not carry that persona skill, inline the behavioural directives without naming the
character — the voice is the payload, the name is not.

## Additional skills by stack

`R1` reports stack markers. Map them to skills, and propose only what the repo's own code justifies:

| Marker | Skills to propose |
| --- | --- |
| `node`, `package.json` | `ref-sp-dev-package-management`, `ref-sp-dev-semantic-versioning` |
| `typescript` | `ref-sp-js-typescript` |
| `deno` | `ref-sp-js-deno` |
| `next` | `ref-sp-js-next`, `ref-sp-js-react` |
| `python` | `ref-sp-py-python` |
| `supabase` | `ref-sp-baas-supabase` |
| `wordpress` | `ref-sp-web-wordpress` |
| `github-actions` | `ref-sp-dev-github-actions-ci` |
| `dependabot` | `ref-sp-dev-github-dependabot` |
| `playwright` | `ref-sp-dev-playwright-cli` |
| `release-notes` | `ref-sp-dev-package-management`, `ref-sp-py-commitizen` (Python repos) |

Beyond stack markers, propose `ref-sp-dev-git-commits` and `tool-sp-commit` for any repo with
history worth keeping tidy, and `ref-sp-agents-verification-discipline` plus the persona skill for
any repo that wants the working style, not just the file layout. Ask before installing a long tail
— an unused skill is context cost with no return.

## Gotchas

- **`git check-ignore` lies about directories containing tracked files.** A committed placeholder
  `.gitignore` inside `.agents/playground/` makes plain `check-ignore` report the directory as not
  ignored. The script uses `--no-index` for the pattern verdict and checks tracked content
  separately (`W3`); do the same if you check by hand.
- **A `.claude/skills` real directory is a fork, not a location.** Moving it to `.agents/skills` and
  symlinking back is a content move — confirm it, and check nothing references the old path.
- **`AGENTS.md` at the root does not reach Claude Code.** Claude reads `CLAUDE.md`; the bridge is
  mandatory, not cosmetic.
- **Detecting a client is not the same as the user using it.** `C1` reports repo-local traces. Ask
  before wiring a client the repo merely leaves fingerprints of.
- **One distribution mode.** A repo that both vendors and syncs the same skill gets silent drift.
  Pick one and say which.
- **Client details move.** The client matrix records what was verified and when. Re-check the
  provider's current docs before asserting a settings key or path that the matrix marks unverified.

## Validation

- Re-run `audit_agent_repo.py`; every check is `pass`, `info`, or an explicitly accepted exception.
- `AGENTS.md` is the only file carrying a full instruction body.
- Every skill resolves under `.agents/skills/`, by exactly one distribution mode.
- If the repo validates skills, its own validators still pass after the change.

## References

- Read `./references/remediation.md` for the per-check fix procedure and the three distribution
  modes, in the order they must be applied.
- Read `./references/clients.md` for the per-client wiring matrix and the procedure for a client not
  on it.
- Use `./assets/agents-md-outline.md` when creating or restructuring an `AGENTS.md`.
- Run `./scripts/audit_agent_repo.py` for the audit itself; `--help` lists the flags.
