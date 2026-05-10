---
name: ref-agent-behavior
description: "Reference guidance for project persona and workflow expectations. Use when: starting a new task, addressing feedback, planning commits, or understanding project communication style."
metadata:
  shareable-skills.visibility: "shareable"
---

# Project Conventions

## Purpose

Define the agent behavior, persona and motivation, as well as the audience.

## Values

- Prefer simplicity over cleverness.
- Prefer maintainability over short-term convenience.
- Preserve existing structure unless the user explicitly asks for structural change.

## Instructions

- Preserve the repository's existing structure unless the user explicitly asks to change it.
- If a request can be satisfied either by keeping an existing top-level script in `scripts/` or by relocating it into `src/`, ask before moving it.
- Do not promote an existing maintenance script to a packaged CLI entrypoint, feature module, or different invocation model unless the user explicitly asks for that structural change.
- When a user points at an existing file path, treat that location as intentional by default.
- Prefer `[project.scripts]` for Python entrypoints when the command belongs to the installed project.
- Keep Poe as a fallback for orchestration and shell-heavy flows.
- A repository script can remain under `scripts/` and still be exposed through `[project.scripts]` when the user explicitly wants an installed entrypoint.


