---
name: ref-sp-agents-policy
description: "This repo's agents-policy feature: the policy section of .agents/config.json, the agentic-tools policy commands, and the files they generate for Gemini, Claude Code, and Copilot. Use when changing or debugging policy sync here."
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "repo-local"
  shareable-skills.reason: "This reference documents the repository-specific agents-policy implementation, file layout, and generated output contract used in this repo."
---

# Swiftpost Agents Policy

How the agent file-access policy is implemented in this repo. The portable model (protected vs
excluded files, per-client enforcement) is `ref-sp-agents-security`. The other consumer of
`.agents/config.json` is `ref-sp-agents-skills-management`.

It lives in the `policy` feature of the `agentic-tools` CLI (TypeScript). Find it by feature name. The
only entrypoint is the `agentic-tools` CLI; there are no standalone policy bins. A consumer runs it
as `uv run agentic-tools ...` or `yarn agentic-tools ...`; this repo runs it from source with
`yarn cli ...`.

## Commands

- `agentic-tools policy sync`: finds the nearest `.agents/config.json` with a `policy`
  object (falling back to `.agents/policy.json`, then legacy `.ai-policy.json`), validates
  `services`, writes the enabled outputs, and cleans managed sections of disabled ones.
- `agentic-tools policy check`: same resolution, compares without writing, and exits non-zero
  on drift, telling the user to run `sync` or `import-vscode`. CI runs it; use it in any commit
  flow that should reject drift without changing files.
- `agentic-tools policy import-vscode`: copies the current VS Code approval maps into the
  policy, writes it back to the file it was loaded from, then syncs.

## Policy fields

Before editing the `policy` section of `.agents/config.json`, read `./references/config-shape.md`,
which holds the full contract.

- `services`: which outputs to generate (`gemini`, `claude`, `copilot`). Omitted means all.
- `protectedFiles`: sensitive patterns to block or deter.
- `excludedFiles`: noisy or generated patterns kept out of Gemini's context.
- `terminalAutoApprove`, `editAutoApprove`: managed VS Code approval maps.

## Generated outputs

| Service | File | What sync manages |
| --- | --- | --- |
| `gemini` | `.aiexclude` | Built from `protectedFiles` and `excludedFiles`; removed when Gemini is disabled. |
| `claude` | `.claude/settings.json` | `permissions.deny` `Read(...)` rules for `protectedFiles`; cleaned when disabled. |
| `copilot` | `.vscode/settings.json` | File associations, Copilot language disablement, approval maps; cleaned when disabled. |
| (all) | `.agents/policy.lock.json` | What sync last wrote into each file above; committed, so it holds on every clone. |

When one vendor's file comes out wrong, read that vendor's detail: `./references/gemini.md`,
`./references/claude-code.md`, or `./references/copilot.md`.

## Rules

- `.agents/config.json` is the source of truth. Control vendors with `services`, never by
  hand-editing generated files.
- `.claude/settings.json` and `.vscode/settings.json` are only partly managed: edit the parts sync
  doesn't own, never the policy-owned sections.
- `policy sync` and `policy import-vscode` stop with exit 1, before writing anything, and list
  what they would lose when a person edited a managed entry since the last sync: a `Read(...)`
  deny, an association or approval, `.aiexclude`, a comment, or a top-level `null`. An entry sync
  wrote itself, recorded in `.agents/policy.lock.json`, changes freely when the policy changes,
  and an entry a person deleted is restored and reported as `Restored:`. `import-vscode` also
  stops before undoing an approval edited in the policy file; without a lock, before changing any
  policy approval. Add hand edits to the policy, or rerun with `--force` to overwrite them. For a
  conflicted lock, resolve or delete it: `--force` rewrites it but overwrites hand edits too.
  Without a lock yet, any managed entry the current policy doesn't write counts as hand-written.
- The lock assumes the generated files are committed with it. When a repo gitignores one, such as
  `.vscode/`, a teammate's first sync after a pull can stop on entries the tool wrote; check the
  list, then `--force` adopts them.
- `.aiexclude` stays at the repo root; don't invent a Gemini-only ignore file.
- Docs and CI use the `agentic-tools policy` commands only.

## Before finishing

- When debugging, run the quick pass in `./references/checklist.md`.
- `yarn cli policy sync`, then `yarn cli policy check`, pass after any policy or generator change.
- `yarn test src/features/policy` when policy logic changed.
- If an output file or command name changed, update `.github/workflows/ci.yaml`.
