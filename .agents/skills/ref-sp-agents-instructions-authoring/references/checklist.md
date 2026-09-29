# Review Checklist

- `AGENTS.md` is the only instruction body; no `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, or `GEMINI.md` exists unless a documented fallback needs it.
- `AGENTS.md` stays under about 150 lines and well under Codex's 32 KiB cap.
- It carries a compact area-to-skill index and an instruction to check it, not copied skill descriptions.
- It holds always-on rules, workflow, and commands, not framework-level or single-area detail.
- The persona core is inline and matches the persona skill.
- Commands and workflow still match the repo.
- Client settings that replace bridges are in place where needed (Gemini `context.fileName`, VS Code `chat.useAgentsMdFile`).
- The instructions agree with policy-managed files such as `.aiexclude`, `.claude/settings.json`, or `.vscode/settings.json` when those exist.
