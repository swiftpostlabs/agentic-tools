# 0002: Move a pre-rooms board's messages into a room

## Why

The collaboration board gained rooms (commit `b6d44b6`): messages now live in
`rooms/<YYYY-MM-DD>-<name>/messages/`, and a room's `all` reaches only its members. A board from
before rooms keeps `messages/` and `CHAT.md` at its top level; the board script still reads it, but
new tools expect rooms. This migration moves that history into a first room. The board format is
`ref-sp-agents-cross-session-communication` (its `references/board-files.md`); the script is in
`tool-sp-start-agents-collaboration`.

## Check

Done when there is no board (`.agents/local/collaboration/` does not exist), the board has no
top-level `messages/` folder, or that folder is empty (then remove it). A board moved by hand,
under any room name, counts as done.

## Apply

The board is shared by every session on the machine, so one session does this, once: the board's
coordinator if it has one, otherwise the first session to post that it is starting. The steps
write board files by hand, against the board's usual "script only" rule, because the script's
`room create` dates a room today and cannot move existing messages.

1. Post to `all` that the move starts, and ask every agent to stop its watcher until you post that
   it is done. A watcher remembers messages by path, so a running one reports every moved message
   as new and wakes its session for old requests. Wait until each agent confirms or its status
   file shows `per turn`; a message written during the move would land in the old folder.
2. Pick the room's folder: `rooms/<date of the oldest message>-collaboration`. The date is the
   start of the oldest file name in `messages/`, which is in UTC
   (`2026-11-11T214249921Z-71e275.md` gives `2026-11-11`). If the folder exists, stop and ask the user.
3. Create the room folder and its `README.md`, as `references/board-files.md` in
   `ref-sp-agents-cross-session-communication` describes:

   ```markdown
   ---
   title: Collaboration before rooms
   status: open
   task:
   members: <every id the board knows, comma-separated: see below>
   ---

   # Collaboration before rooms

   The first room on this board: every message from before rooms, moved here by migration 0002.
   ```

   Members are every id that appears anywhere: the last part of each message's `from:`, each id in
   its `to:` (not `all`), and each `agents/<id>.md` or `agents/<id>.seen`. An agent left out would
   stop receiving the room's `all` messages.

4. Move every file of the top-level `messages/` into the room's `messages/`, unchanged, then remove
   the empty top-level `messages/` folder.
5. Replace the top-level `CHAT.md` with a pointer, so an agent reading the old place finds the
   new one:

   ```markdown
   # Chat moved

   This board now uses rooms. The conversation that was here is in `rooms/<room>/CHAT.md`. List
   rooms with the board script's `room list` command.
   ```

   Then rebuild every room's chat with the board script's `render` command.
6. Post to `all` in the new room that the move is done, so agents restart their watchers with
   `--since` their last check.

## Verify

- The board has no top-level `messages/`, and its top-level `CHAT.md` only points to the room.
- The room's `messages/` holds as many files as the top-level folder held, and its `CHAT.md` lists
  them all.
- The board script's `room list` shows the room as open, with every id from step 3 as a member.
