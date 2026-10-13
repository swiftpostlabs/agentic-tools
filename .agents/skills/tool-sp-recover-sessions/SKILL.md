---
name: tool-sp-recover-sessions
description: "Recover Claude Code sessions after a reboot: restore their names, resume lost ones with Remote Control, and say which sidebar group each goes in. Use when sessions vanished, came back renamed or duplicated, or a screenshot of session names needs matching."
argument-hint: "Optional: a screenshot of the session names or sidebar groups"
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "organization"
---

# Recover Sessions

Give each session on this machine back its name, resume the dead ones, and print a table of
renames and group moves. Ask before resuming, renaming, or archiving anything.

## Steps

1. Run `node <this skill's folder>/scripts/find-sessions.mts` (`--days 7` looks further back;
   `--json` adds the resume command and each session's last reply). **Proper name** is the name
   to restore, written exactly as the user set it, typos included. **Shown now** is the current
   name. `Live: yes` means it runs. `older-copy` means a newer or live session has the same name
   in the same folder, so never resume it. If the script exits with an error, stop and report it.
2. Match each name in the user's screenshot to a row by **Shown now**, then **Proper name**. If
   nothing matches, find the session by content: `grep -l 'phrase' ~/.claude/projects/*/*.jsonl`
   (the file name is the session id). When several rows match, use the `Copy: keep` one. If the
   proper name is `—`, ask the user.
3. Resume rows with `Live: no` and `Copy: keep` that the user wants back, using the row's `resume`
   command. If `resume` is empty, ask the user which folder the session ran in. Run the script
   again afterwards, so the resumed sessions show up live.
4. Rename on claude.ai with the `set_session_title` tool, if you have it, passing the row's
   **claude.ai id**. Without the tool, or when the id is `—`, list the rename for the user.
5. Pick each session's group from the user's screenshot of their groups. `State: done` means
   done; other states are not groups (`blocked` only means idle). Otherwise judge by the last reply: not started → todo, work under way → in progress, a
   tangent → side quest, waiting on something outside the session → blocked. Write the group's
   exact name (`25-in-progress`, not "in progress") and mark it `(guess)`.
6. Print the table. The user drags each session into its group in the app.

```text
| Shown now | Rename to | Move to group | Session |
| --- | --- | --- | --- |
| laptop fan thermal diagnosis | agentic: Laptop fan noise diagnosis | 95-blocked (guess) | 43f553a4 |
```

## Gotchas

- Each resume creates a new claude.ai session and leaves the old one "disconnected". Archive the
  old one, in the app, only once the new one is `connected`.
- Names ending in "(recoer)", "(rcoer)", or similar are separate continuations, not duplicates.
- Groups live only in the Claude Desktop app, and a resumed session starts outside them. Don't
  look for them in `~/.config/Claude`: that folder holds sign-in state.
