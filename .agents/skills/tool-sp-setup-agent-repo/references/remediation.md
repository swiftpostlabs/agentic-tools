# Remediation By Check

One section per check ID emitted by this skill's `./scripts/audit_agent_repo.py`. Apply in the order listed
here — later stages assume earlier ones. Every command uses `<repo>` for the audited repository
root.

---

## W1 — local agent workspaces missing

Create the three workspaces. They are a set: tasks without a playground pushes scratch files into
the source tree, and retro without tasks has nothing to reflect on.

```bash
mkdir -p <repo>/.agents/tasks <repo>/.agents/retro <repo>/.agents/playground
```

`.agents/tasks/` and `.agents/retro/` also want their lifecycle subfolders and, for tasks, a
`TODO.md`. Do not invent that structure here — `ref-sp-agents-local-tasks` and `ref-sp-agents-retro`
own it. Create the directories, then follow those skills if the repo wants them pre-seeded.

## W2 — workspaces not gitignored

Add the rules to the repo `.gitignore`, anchored to the root so a nested `agents/` folder elsewhere
is unaffected:

```gitignore
# Agent only dirs
/.agents/playground/
/.agents/tasks/
/.agents/retro/
```

These directories hold local, per-developer state. Committing them turns one agent's scratch notes
into everyone's merge conflicts.

To keep an empty directory present after cloning, commit a placeholder inside it:

```gitignore
# <repo>/.agents/playground/.gitignore
# Ignore everything
*
!.gitignore
```

That placeholder is the one file allowed to be tracked under a workspace.

## W3 — workspace content is committed

Real content under an ignored workspace means it was added before the rule, and `.gitignore` does
not retroactively untrack. Confirm with the user, then untrack without deleting the local copies:

```bash
git -C <repo> rm -r --cached .agents/tasks .agents/retro .agents/playground
```

Check what is being untracked first. If the repo has been treating `.agents/tasks/` as shared
project planning, untracking it destroys a workflow — surface that instead of running the command.

## S1 / S2 — skills root or core skills missing

Resolve `S4` first: how skills arrive determines how the missing ones get added.

The five core skills, and why each is core:

| Skill | Role |
| --- | --- |
| `ref-sp-agents-skills-authoring` | How to write and maintain a skill at all. |
| `ref-sp-agents-instructions-authoring` | The single-`AGENTS.md` model this whole baseline rests on. |
| `tool-sp-maintain-skills` | The maintenance pass that keeps the catalog from rotting. |
| `ref-sp-agents-retro` | The reflection loop that feeds improvements back into skills. |
| `ref-sp-agents-local-tasks` | The `.agents/tasks/` workspace contract. |

## S3 — skills outside `.agents/skills`

Skills found as real directories under `.claude/skills/`, `.github/skills/`, or a bare `skills/`
are a fork of the canonical location, not an alternative to it. Consolidate:

1. Confirm with the user — this moves files they wrote.
2. `git mv` each skill directory into `.agents/skills/`.
3. Replace the old location with a symlink where the client needs one (see `C2` and
   `./clients.md`).
4. Grep the repo for the old path: instruction files, CI, and scripts may reference it.

A client-specific skills directory is fine as a *link*. It is a problem as a *copy*.

## S4 — choosing a distribution mode

Three ways a repo gets shared skills. Pick one per source repo and record the choice in
`AGENTS.md`.

### Vendored — copy with a reference

Copy the skill directory into `.agents/skills/` and keep the sharing metadata that records where it
came from. Best when the repo must be self-contained: no install step, works offline, survives the
source repo disappearing.

Cost: drift is invisible unless something checks for it. `ref-sp-agents-shareable-skills` owns the
vendoring rules and the drift check — a vendored skill is a **pure copy with no rename**, because
renaming severs identity and breaks drift detection.

### Synced — declared in `.agents/config.json`

```json
{
  "skills": {
    "sources": [
      {
        "from": "package:agentic-tools",
        "skills": ["ref-sp-agents-skills-authoring", "ref-sp-agents-local-tasks"]
      }
    ]
  }
}
```

Then run the source repo's skills CLI to materialize them as links. Best when the repo already
consumes the source as a dependency and wants updates to arrive with a re-pin.

Two failure modes worth knowing before they cost an hour:

- A `package:<name>` source reads the **installed** copy at the revision the lockfile pins — not a
  local checkout sitting next to it. A skill that exists only in unpushed commits is invisible.
- Sync removes dead links in the destination before relinking, so a rename in the source repo is a
  breaking change for every consumer that has not re-pinned.

### Marketplace plugin

The consumer adds the marketplace once and installs the plugin:

```bash
claude plugin marketplace add <owner>/<repo>
claude plugin install <plugin>@<marketplace>     # marketplace NAME, not repo
copilot plugin marketplace add <owner>/<repo>    # same catalog, Copilot CLI
```

Best for skills that should be available across *all* of a user's repos rather than committed into
one. The skills then live in the client's plugin cache, so a repo-local audit will not see them —
say so in the report rather than flagging them missing.

`ref-sp-agents-plugin-marketplaces` owns the publishing side and the cache/symlink rules.

## I1 — `AGENTS.md` missing, thin, or too large

Use this skill's `./assets/agents-md-outline.md`. Fill it from the repo's real commands and
structure: an `AGENTS.md` listing commands that do not exist is worse than none, because the agent
will run them.

Over 32 KiB is a failure: Codex stops reading there. Over 200 lines is a warning: Claude Code
recommends less. Cut what the agent can read from the code, and move area-specific detail into a
skill or a nested `AGENTS.md`.

## I2 — bridge or client-specific instruction files

Claude Code, Codex, Copilot, and Cursor read `AGENTS.md` natively. A `CLAUDE.md`,
`.claude/CLAUDE.md`, or `CLAUDE.local.md` anywhere on the path makes Claude Code read it **instead
of** `AGENTS.md`, so a leftover bridge now hides the instructions it was meant to route to.

- A thin bridge (a few lines pointing at `AGENTS.md`, or a symlink): delete it.
- A file with its own guidance: merge it into the `AGENTS.md` in the same folder, keeping only what
  belongs there (repo-wide rules) and moving area detail into a skill, then delete it. Confirm with
  the user first: this rewrites guidance someone wrote.
- `GEMINI.md`: delete it and point Gemini CLI at `AGENTS.md` instead (see `./clients.md`).

Keep a bridge only for a client that is in real use and cannot read `AGENTS.md` (for example
Claude Code before v2.1.277), and record why in `AGENTS.md`.

## I3 — nested `AGENTS.md` files

Clients disagree on nested files, so they only work if the repo meets the strictest of them:

1. **Point to them from the root.** Codex and Copilot CLI load only the files from the git root
   down to the directory they were launched in. A session started at the root never reads
   `packages/api/AGENTS.md`. Add a line to the root file's skill/area index:
   "Before editing `packages/api/`, read `packages/api/AGENTS.md`."
2. **Keep the chain under 32 KiB.** Codex concatenates root to working directory and stops at
   `project_doc_max_bytes`. The audit adds up each chain.
3. **Add, don't contradict.** A nested file holds only what differs in that folder. Codex treats
   later files as overriding; VS Code treats all sources as additive with no precedence; Claude
   Code may follow either side. Contradictions are resolved arbitrarily.
4. **No `AGENTS.override.md`.** It is Codex-only; other clients ignore it.
5. **No `CLAUDE.md` beside a nested `AGENTS.md`.** Claude Code then reads that instead (see I2).
6. **Enable VS Code nested support** with `chat.useNestedAgentsMdFiles` (`C3`).

## C1 / C2 / C3 — client wiring

See `./clients.md`. `C2` (the `.claude/skills` symlink) and `C3` (`chat.useAgentsMdFile`, plus
`chat.useNestedAgentsMdFiles` when nested files exist) are documented there with the rest of the per-client matrix.

## R1 — stack markers

Markers are evidence, not a shopping list. Map them with the table in the parent `SKILL.md`, then
propose the subset the repo will actually use. Install them through the mode chosen in `S4`.
