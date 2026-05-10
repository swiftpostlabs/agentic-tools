# Copilot Instructions

## Purpose

Provide focused guidance for authoring `.github/copilot-instructions.md` as the main always-on instruction surface in repositories that use Copilot and often route other providers back to it.

## When to use this reference

- Editing `.github/copilot-instructions.md`.
- Deciding which rules belong in the main top-level instruction file.
- Updating quick commands, skill listings, and routing hints after repo changes.

## Core Rules

- Treat `.github/copilot-instructions.md` as the default instruction source of truth when the repo follows the shared-bridge pattern.
- Keep durable repo workflow, safety policy, and skill-routing summaries here.
- Do not let framework, language, or feature-specific detail grow here when a skill should own that guidance.
- If the file lists available skills or help-routing hints, keep those lists synchronized with the actual skill folders.
- When the repo changes quick commands, package managers, or validation workflows, update the top-level instruction file promptly.

## Validation

- The file still reads as the source-of-truth instruction surface.
- Skill listings and help-routing sections match the current skill catalog.
- Commands and workflow rules still match the repo.