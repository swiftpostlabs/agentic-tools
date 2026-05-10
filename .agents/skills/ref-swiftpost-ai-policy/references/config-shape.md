# Config Shape

## Canonical file

- `.agents/policy.json`

## Current shape

```json
{
  "services": ["gemini", "claude", "copilot"],
  "protectedFiles": ["*.env"],
  "excludedFiles": ["dist/"],
  "terminalAutoApprove": {
    "/^uv run agents-policy$/": true
  },
  "editAutoApprove": {
    "**/*.py": true
  }
}
```

## Field notes

- `services` controls which vendor outputs are generated or cleaned.
- `protectedFiles` drive Claude and Copilot deterrents and Gemini exclusions.
- `excludedFiles` currently affect Gemini's generated exclusion file.
- `terminalAutoApprove` and `editAutoApprove` currently feed managed VS Code settings.

## Compatibility

- The implementation still discovers legacy `.ai-policy.json` when no `.agents/policy.json` exists.
- The repo should still prefer `.agents/policy.json` for current docs, CI, and examples.
