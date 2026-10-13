# src/features/policy

`agentic-tools policy <sync|check|import-vscode>`: one policy in `.agents/config.json`, projected
into each client's own files. What the policy means and which files it generates is
`ref-sp-agents-policy`; why files are protected or excluded is `ref-sp-agents-security`.

## What it holds

- `policy.command.ts`: the three sub-commands, all mapping onto `runPolicyCommand`.
- `sync.ts`: finds the policy file, then writes (`sync`), compares (`check`), or first imports
  VS Code approvals (`import-vscode`).
- `schema.ts`: the zod schema for the policy section and the settings documents it reads.
- `services.ts`: the supported services and their accepted spellings.
- `claude.ts`, `gemini.ts`, `vscode.ts`: one adapter per client output.

## Rules

- **An adapter changes only the keys it manages** (`claudeManagedSchema`, `vscodeManagedSchema`) and
  round-trips everything else in the user's settings untouched.
- **A new client is a new adapter file** and an entry in `services.ts`, not a branch inside an
  existing adapter.
