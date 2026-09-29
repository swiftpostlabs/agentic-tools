# Copilot Instructions

## Purpose

Provide focused guidance for authoring `.github/copilot-instructions.md` in repositories that use Copilot. The default source of truth is now a root `AGENTS.md`, which Copilot reads natively (see `../agents-md-standard.md`); reach for a dedicated Copilot file only when the repo is Copilot-centric or already has a mature one established there.

## When to use this reference

- Editing `.github/copilot-instructions.md` in a repo that still keeps it.
- Deciding which rules belong in the main top-level instruction file.
- Updating quick commands and routing hints after repo changes.

## Core Rules

- Prefer a root `AGENTS.md` as the source of truth; use `.github/copilot-instructions.md` as the source of truth only as a Copilot-centric fallback. Copilot reads `AGENTS.md` natively, so otherwise delete the file rather than bridging.
- Whichever file is authoritative, keep durable repo workflow and safety policy there.
- Do not let framework, language, or feature-specific detail grow here when a skill should own that guidance.
- Do not list available skills; Copilot already lists skill names and descriptions.
- When the repo changes quick commands, package managers, or validation workflows, update the top-level instruction file promptly.

## Validation

- The file exists only in a Copilot-centric repo; elsewhere `AGENTS.md` replaces it.
- The file carries no skill catalog.
- Commands and workflow rules still match the repo.