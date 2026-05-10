# Claude Code Output

- Output file: `.claude/settings.json`
- Managed section: `permissions.deny`
- Protected file patterns are rendered as `Read(<pattern>)` deny rules.
- Non-`Read(...)` deny rules are preserved when the policy is synced.
- If Claude output is disabled in `services`, the managed `Read(...)` rules are cleaned.
