# Copilot Instructions

## Purpose

Provide focused guidance for authoring `.github/copilot-instructions.md` in repositories that use Copilot. The default source of truth is now a root `AGENTS.md`, which Copilot reads natively (see `../agents-md-standard.md`); reach for a dedicated Copilot file only when the repo is Copilot-centric or already has a mature one established there.

## When to use this reference

- Editing `.github/copilot-instructions.md` in a repo that still keeps it.
- Deciding which rules belong in the main top-level instruction file.
- Updating quick commands, skill listings, and routing hints after repo changes.

## Core Rules

- Prefer a root `AGENTS.md` as the source of truth; use `.github/copilot-instructions.md` as the source of truth only as a Copilot-centric fallback, and otherwise as a thin bridge that imports `AGENTS.md`.
- Whichever file is authoritative, keep durable repo workflow, safety policy, and skill-routing summaries there.
- Do not let framework, language, or feature-specific detail grow here when a skill should own that guidance.
- If the file lists available skills or help-routing hints, keep those lists synchronized with the actual skill folders.
- When the repo changes quick commands, package managers, or validation workflows, update the top-level instruction file promptly.

## Validation

- The file reads correctly for its role: a source-of-truth surface in a Copilot-centric repo, or a thin bridge to `AGENTS.md` otherwise.
- Skill listings and help-routing sections match the current skill catalog.
- Commands and workflow rules still match the repo.