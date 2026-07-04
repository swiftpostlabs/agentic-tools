# Claude Instructions

## Purpose

Provide focused guidance for keeping `.claude/CLAUDE.md` minimal, routed to the shared repo instructions, and free of duplicated workflow text unless Claude-specific behavior truly requires it.

## When to use this reference

- Editing `.claude/CLAUDE.md`.
- Deciding whether Claude needs provider-specific text.
- Reviewing whether Claude still points cleanly at the shared instruction source.

## Core Rules

- Default to a thin routing file that imports the shared source-of-truth instructions.
- Keep `.claude/CLAUDE.md` focused on behavioral routing, not on restating the entire repo workflow.
- Add Claude-specific text only when there is a real Claude-specific requirement or capability difference.
- If a provider-specific note is required, keep it short and route back to the shared instructions immediately after it.

## Validation

- `.claude/CLAUDE.md` stays minimal unless a real Claude-specific exception exists.
- The bridge still points at the correct source-of-truth instruction file.
- The file does not duplicate the full repo workflow when a reference is enough.
