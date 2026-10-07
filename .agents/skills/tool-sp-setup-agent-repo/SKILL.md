---
name: tool-sp-setup-agent-repo
description: "Audit a repo against the shared agent baseline (.agents workspaces, core skills, a single AGENTS.md with optional nested files, client wiring) and fix what is missing. Use when setting up agent tooling in a repo or removing leftover CLAUDE.md or GEMINI.md files."
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

Brings a repo up to the shared agent baseline: one script run finds the gaps, then you fix them in
a safe order. How `AGENTS.md` should be written is `ref-sp-agents-instructions-authoring`; refreshing
an existing one is `tool-sp-maintain-agents-instructions`. The `.agents/tasks/` and `.agents/retro/`
formats belong to `ref-sp-agents-local-tasks` and `ref-sp-agents-retro`.

## First step

Run the audit before reading anything else or touching a file:

```bash
uv run <skill-dir>/scripts/audit_agent_repo.py --repo <repo>
```

It is read-only, prints one line per check with details, and exits non-zero when a check failed.
`--json` for machine output, `--only I2,I3` to re-run a subset. Don't re-derive it by hand.
Use `uv run`, not the system `python3`: the script declares its Python version in PEP 723
metadata and uv fetches a matching interpreter.

## The baseline

| Check | What good looks like |
| --- | --- |
| `W1` | `.agents/tasks/`, `.agents/retro/`, and `.agents/playground/` exist. |
| `W2` | All three are gitignored. |
| `W3` | Nothing under them is committed except a placeholder `.gitignore`. |
| `S1` | `.agents/skills/` exists and holds skills. |
| `S2` | The five core skills are present (below). |
| `S3` | No skills live outside `.agents/skills/` as real directories. |
| `S4` | Skills arrive through exactly one distribution mode. |
| `I1` | A root `AGENTS.md` with personality, always-on rules, workflow and commands, and a skill index; under 200 lines and 32 KiB. |
| `I2` | No `CLAUDE.md`, `CLAUDE.local.md`, `GEMINI.md`, `AGENT.md`, `.cursorrules`, or `.github/copilot-instructions.md` anywhere. |
| `I3` | Each nested `AGENTS.md` is pointed to from the root, its chain is under 32 KiB, and there are no `AGENTS.override.md` files. |
| `C1` | Every client the repo shows traces of is wired. |
| `C2` | With Claude in use, `.claude/skills` is a gitignored symlink to `.agents/skills/`. |
| `C3` | With VS Code in use, `chat.useAgentsMdFile` is on, plus `chat.useNestedAgentsMdFiles` when nested files exist. |
| `R1` | Stack markers found have their matching skills installed. |

Core skills: `ref-sp-agents-skills-authoring`, `ref-sp-agents-instructions-authoring`,
`tool-sp-maintain-skills`, `ref-sp-agents-retro`, `ref-sp-agents-local-tasks`.

## Steps

1. **Audit** and note every non-`pass` check.
2. **Read existing files as intent.** A `CLAUDE.md` body or skills in an odd root are decisions
   someone made: report them, don't silently overwrite them.
3. **Choose the distribution mode** (`S4`) before fixing skills; it decides whether missing skills
   are copied, linked, or installed.
4. **Confirm before moving or rewriting content**: relocating skills, merging a `CLAUDE.md` into
   `AGENTS.md`, deleting an instruction file. Creating directories, ignore rules, symlinks, and
   settings needs no round trip.
5. **Fix in order:** workspaces, skills, `AGENTS.md`, leftover instruction files, nested files,
   client wiring. Procedures per check are in `./references/remediation.md`.
6. **Re-run the audit** and report what is still open, including anything the user declined.

## Instruction files

`AGENTS.md` is the only instruction file. Claude Code, Codex, Copilot, and Cursor read it
natively; Gemini CLI and VS Code need a setting (`./references/clients.md`). A leftover
`CLAUDE.md` is harmful, not neutral: Claude Code reads it **instead of** `AGENTS.md`. Merge any real
content into `AGENTS.md`, then delete the file.

For a new or thin `AGENTS.md`, start from `./assets/agents-md-outline.md`. The personality block is
the one deliberate copy of skill text: inline the persona core so it applies from the first turn.
Without the persona skill, inline the behaviour without naming the character.

**Nested files** (monorepos) need more than placing them, because clients load them differently:
Codex and Copilot CLI read only the chain from the git root to the launch directory. So the root
file's index points to each nested file, each chain stays under 32 KiB, and nested files only add
to the root. Details: `I3` in `./references/remediation.md`.

## Additional skills by stack

`R1` reports stack markers. Propose only what the repo's code justifies:

| Marker | Skills |
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
| `release-notes` | `ref-sp-dev-package-management`, `ref-sp-py-commitizen` (Python) |

Any repo with history worth keeping tidy: `ref-sp-dev-git-commits`, `tool-sp-commit`. Repos that
want the working style: `ref-sp-agents-verification-discipline` and the persona skill. Ask before
installing a long tail; an unused skill costs context for nothing.

## Gotchas

- `git check-ignore` reports a directory holding a tracked placeholder as not ignored. The script
  uses `--no-index` for the pattern and checks tracked content separately (`W3`).
- A real `.claude/skills` directory is a fork. Moving it into `.agents/skills` and linking back is
  a content move: confirm, and search for references to the old path.
- Claude Code cloud sessions load only skills committed under `.claude/skills/`, so a gitignored
  symlink gives them no project skills.
- Client traces (`C1`) aren't proof the user uses that client. Ask before wiring one.
- Vendoring and syncing the same skill causes silent drift. Pick one mode.

## Before finishing

- The audit shows only `pass`, `info`, or explicitly accepted exceptions.
- The repo's own validators still pass.
