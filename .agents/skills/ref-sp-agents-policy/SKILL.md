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

## Rules

- `.agents/config.json` is the source of truth. Control vendors with `services`, never by
  hand-editing generated files.
- `.claude/settings.json` and `.vscode/settings.json` are only partly managed: edit the parts sync
  doesn't own, never the policy-owned sections.
- `.aiexclude` stays at the repo root; don't invent a Gemini-only ignore file.
- Docs and CI use the `agentic-tools policy` commands only.

## Before finishing

- `yarn cli policy sync`, then `yarn cli policy check`, pass after any policy or generator change.
- `yarn test src/policy` when policy logic changed.
- If an output file or command name changed, update `.github/workflows/ci.yaml`.

## References

- `./references/config-shape.md`: the full `policy` contract, when editing `.agents/config.json`.
- `./references/copilot.md`, `./references/claude-code.md`, `./references/gemini.md`: per-vendor
  output detail, when debugging one vendor's file.
- `./references/checklist.md`: quick debugging pass.
