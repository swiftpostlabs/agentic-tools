# Config Shape

## Canonical file

- `.agents/config.json`

## Current shape

```json
{
  "policy": {
    "services": ["gemini", "claude", "copilot"],
    "protectedFiles": ["*.env"],
    "excludedFiles": ["dist/"],
    "terminalAutoApprove": {
      "/^uv run agentic-tools policy sync$/": true
    },
    "editAutoApprove": {
      "**/*.py": true
    }
  }
}
```

## Field notes

- `policy.services` controls which vendor outputs are generated or cleaned.
- `policy.protectedFiles` drive Claude and Copilot deterrents and Gemini exclusions.
- `policy.excludedFiles` currently affect Gemini's generated exclusion file.
- `policy.terminalAutoApprove` and `policy.editAutoApprove` currently feed managed VS Code settings.

## Compatibility

- The implementation still discovers `.agents/policy.json` and legacy `.ai-policy.json` when no `.agents/config.json` policy section exists.
- New docs, CI, and examples should prefer `.agents/config.json`.
