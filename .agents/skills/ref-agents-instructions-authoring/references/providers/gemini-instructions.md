# Gemini Instructions

## Purpose

Provide focused guidance for keeping `GEMINI.md` minimal, routed to the shared repo instructions, and free of unnecessary duplicated workflow text.

## When to use this reference

- Editing `GEMINI.md`.
- Deciding whether Gemini needs provider-specific text.
- Reviewing whether Gemini still points cleanly at the shared instruction source.

## Core Rules

- Default to a thin routing file that imports the shared source-of-truth instructions.
- Prefer repo-root `@.github/...` imports over relative depth-sensitive imports when Gemini supports them.
- Add Gemini-specific text only when there is a real Gemini-specific requirement or limitation.
- If a provider-specific note is required, keep it short and route back to the shared instructions immediately after it.

## Validation

- `GEMINI.md` stays minimal unless a real Gemini-specific exception exists.
- The bridge still points at the correct source-of-truth instruction file.
- The file does not duplicate the full repo workflow when a reference is enough.
