---
name: tool-sp-start-agents-collaboration
description: "Start or join a collaboration between agent sessions on one machine: set up the shared board, create a room as its coordinator or join one as a worker, link it to a task, then watch and take assigned work. Use when told to start, join, or check an agents collaboration, room, or board."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "public"
  shareable-skills.requires: "ref-sp-agents-cross-session-communication"
---

# Start Agents Collaboration

Read `ref-sp-agents-cross-session-communication` first: it holds the rules, rooms, file formats,
watching schedule, and roles this skill acts on.

Run every command as `node <this skill's folder>/scripts/board.mts <command>` from anywhere in the
repo: the script walks up from the current folder to `.agents/local/collaboration`, or takes
`--board <dir>`. `--help` lists the commands. A WSL shell without a Linux Node can run the Windows
`node.exe` with a Windows path to the script.

Two ways in:

- **No room given:** you coordinate. Set up the board if missing, create a room, and invite workers.
- **A room given** ("start agents collaboration in room `2026-01-05-retry-queue`"): you join it as a
  worker.

Either way you then keep watching and take each task assigned to you as it arrives, within the
standing approval your user gave (the worker template in the ref skill).

## Steps

1. **Read the machine notes:** `.agents/local/collaboration/AGENTS.md`, when it exists, says where
   the board is for each client, which accounts are in use, and who coordinates.
2. **Pick your name:** `<account> / <session name> / <id>` (ask your user for the account if
   unsure).
3. **Set up the board, coordinator only, once per repo:** `board.mts init`. It never overwrites.
   Check that `.agents/local/` is gitignored.
4. **Create or join a room:**
   - Coordinator: `board.mts room create --name <kebab-name> --me <id> [--title "<text>"] [--task <task folder>]`.
     The folder gets today's date. Fill the README body: what the room is for, and that you
     coordinate.
   - Worker: `board.mts room join --room <room> --me <id>`, then read the room's README and
     `CHAT.md`.
5. **Link it to a task**, when there is one: `board.mts room link --room <room> --task <task folder>`,
   and set `room: <room>` in that task's README (`ref-sp-agents-local-tasks`).
6. **Register:** write `agents/<id>.md` in the board (format in the ref skill's
   `references/board-files.md`), naming the room in `Working on:`.
7. **Post a hello** to the room:

   ```sh
   node <this skill's folder>/scripts/board.mts post --room <room> --from "<your name>" --to all --body "<text>"
   ```

   A worker says what it can take; a coordinator says what the room is for. Pipe a long body on
   stdin instead of `--body`.
8. **Watch:** `board.mts watch --me <id> --since <now>` under a background monitor with its longest
   timeout, renewed and scheduled as the ref skill's Watching section says. Add `--room <room>` to
   follow one room only.

## Working in the room

- **Coordinator:** assign each piece by id with what, which files, and the done-when line; invite
  a worker who is not yet a member with a direct message to its id.
- **Worker:** reply `taking <piece>` before starting, report each step with hashes and paths, and
  ask in the room about anything outside your standing approval instead of doing it.
- **Done:** set `Working on: left` in your status file. The coordinator closes the room with
  `board.mts room close --room <room>` and records the outcome in the linked task.

## Gotchas

- **`--room` is required to post** once the board has rooms; the error lists the open ones. A board
  from before rooms still posts to its top-level `messages/` until it is migrated.
- **`room join` edits the room README.** Use the command rather than editing `members:` by hand, so
  two joins in a row both stick.
