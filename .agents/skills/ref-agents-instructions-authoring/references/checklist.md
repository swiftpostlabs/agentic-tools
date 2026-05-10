# Review Checklist

- One instruction file is the clear source of truth.
- Provider entry files stay thin unless a real provider-specific exception is required.
- The source-of-truth file contains durable repo workflow, routing, and safety guidance rather than framework-level detail.
- Quick commands, skill inventory, and routing hints still match the current repo.
- The provider bridge pattern uses stable repo-root references when the platform supports them.
- The instruction system still agrees with policy-managed files such as `.aiexclude`, `.claude/settings.json`, or `.vscode/settings.json` when those files exist.
