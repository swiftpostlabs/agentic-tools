# Claude Code Output

- Output file: `.claude/settings.json`
- Managed section: `permissions.deny`
- Protected file patterns are rendered as `Read(<pattern>)` deny rules, in policy order. A `Read`
  deny also blocks Edit and Write on the same path.
- A `!pattern` entry renders as `Read(!pattern)`, a deny-rule exception that carves the path out of
  the rules before it. Verified on Claude Code 2.1.328 with a canary: `.env.example` read and
  edited, `.env.local` and `.env` denied, at the root and in subfolders. An `allow` rule cannot do
  this, because deny is evaluated first.
- Non-`Read(...)` deny rules are preserved when the policy is synced.
- If Claude output is disabled in `services`, the managed `Read(...)` rules are cleaned.
