# Copilot Output

- Output file: `.vscode/settings.json`
- Managed sections:
  - `chat.tools.terminal.autoApprove`
  - `chat.tools.edits.autoApprove`
  - `files.associations` entries that use `copilot-restricted-file`
  - `github.copilot.enable.copilot-restricted-file`
- Protected file patterns map to the best-effort `copilot-restricted-file` language ID.
- `!pattern` exceptions are skipped: a file association has no negation, so excepted files stay
  restricted for Copilot.
- If Copilot output is disabled in `services`, the managed sections are cleaned from VS Code settings.
