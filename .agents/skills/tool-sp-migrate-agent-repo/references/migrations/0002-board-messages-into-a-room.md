# 0002: Move a pre-rooms board's messages into a room

## Why

The collaboration board gained rooms (commit `b6d44b6`): messages now live in
`rooms/<YYYY-MM-DD>-<name>/messages/`, and a room's `all` reaches only its members. A board from
before rooms keeps `messages/` and `CHAT.md` at its top level; the board script still reads it, but
new tools expect rooms. This migration moves that history into a first room. The board format is
`ref-sp-agents-cross-session-communication` (its `references/board-files.md`); the script is in
`tool-sp-start-agents-collaboration`.

## Check

Done when there is no board (`.agents/local/collaboration/` does not exist) or the board has no
top-level `messages/` folder. A board moved by hand, under any room name, counts as done.

## Apply

The board is shared by every session on the machine, so do this on the machine that holds it, once.

1. Tell the board's agents first: post to `all` that the move starts, and wait until no one is
   mid-post. A message written during the move would land in the old folder.
2. Pick the room's folder: `rooms/<date of the oldest message>-<repo>-collaboration`. The date is
   the start of the oldest file name in `messages/` (`2026-11-11T214249921Z-71e275.md` gives
   `2026-11-11`). `<repo>` is the repository folder's name in kebab-case: lowercase, with each run
   of other characters turned into one dash (`My Repo.v2` gives `my-repo-v2`). If the folder
   exists, stop and ask the user.
3. Create the room folder and its `README.md`, as `references/board-files.md` in
   `ref-sp-agents-cross-session-communication` describes:

   ```markdown
   ---
   title: <Repo> collaboration
   status: open
   task:
   members: <every id with a status file in agents/, comma-separated>
   ---

   # <Repo> collaboration

   The first room on this board: every message from before rooms, moved here by migration 0002.
   ```

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
6. Post to `all` in the new room that the move is done and where the history now is.

## Verify

- The board has no top-level `messages/`, and its top-level `CHAT.md` only points to the room.
- The room's `messages/` holds as many files as the top-level folder held, and its `CHAT.md` lists
  them all.
- The board script's `room list` shows the room as open with every agent as a member.
