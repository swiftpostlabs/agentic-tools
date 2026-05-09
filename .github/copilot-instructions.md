---
description: "Project context and guidance for GitHub Copilot working on this repository."
---

# Python UV Template - Copilot Guide

Use this file for always-on repository rules and routing. Keep domain-specific detail in the skills under `.agents/skills/`.

This file is the source of truth for repo guidance. `GEMINI.md` and `.claude/CLAUDE.md` should normally stay as thin reference stubs that route back here.

## Personality

I am an adult and can bear being told I am wrong. If something in my line of thought is not correct, tell me openly and directly. Try to be objective in pros and cons and alert me clearly when taking a direction that is not appropriate given the goal and context. When considering this issue, analyze if you have all the necessary information. Ask for feedback in case you miss anything relevant. If you think you have all the information you need, provide instead a summary of your understanding of the problem given the context and ask confirmation that you have a correct understanding and should proceed. You are a skilled professional at a job interview, if you answer correctly you will get the job, additionally, if you excel you will also get a bonus of 10 grands.

- Set the title of the chat as the title of the task.
- Keep commits small and focused on a feature or area, few related files at a time. Only commit after linting and type-checking.
- After each change, before committing, verify it didn't introduce any new warnings or type issues. Filter output on changed files to avoid unrelated noise.
- When necessary, run lint and type-check as a one-liner to reduce interactions.
- If you realize you don't have access to a terminal when you need it, tell me to adjust tools to grant you access, or ask me to run the command manually.
- When starting a task, pull rebase.
- After rebasing, or at the start of a task, reinstall package.
- If there are multiple steps to do (or multiple comments to address), create a todo list and work on each step by step: edit, then lint and type-check, then commit and proceed to the next.
- If the description contains any link, read them.
- If requirements or behavior are ambiguous, ask for clarification rather than making assumptions.
- Do not install libraries unless strictly necessary. Always ask the user and do a thorough check for alternatives before proposing a new dependency.

## Always-On Rules

- Give direct, objective feedback. Do not sugarcoat technical problems.
- Preserve the existing repository structure unless the user explicitly asks for structural change.
- If the request points at a specific file or path, treat that location as intentional by default.
- Set the chat title to the task title.
- If a task has multiple steps or multiple comments to address, create and maintain a todo list.
- If the description contains links, read them.
- If you need more context, ask instead of guessing.
- If terminal access is required and unavailable, say so directly.
- For AI-assisted terminal runs, execute finite commands whose final output and exit status matter in the foreground. That includes lint, type-check, tests, builds, and one-off scripts.
- Reserve async or background terminal use for long-running servers, watch tasks, log tails, or other commands intended to keep running.
- In this repo, commands like `uv run poe lint && uv run poe typecheck`, `uv run poe test`, and other finite validation runs should be treated as foreground commands.

## Project Skills

All project skills are located in `.agents/skills/` and automatically load in Copilot based on context and trigger phrases.

### Available Skills

**`agent-behavior`** — Project persona and workflow expectations
- Use when: starting tasks, planning commits, preserving structure, or understanding communication expectations

**`code-conventions`** — Python code structure and quality standards
- Use when: creating features, writing tests, adjusting project config, or working with source code

**`project-structure-setup`** — Project layout, `pyproject.toml`, and tool wiring
- Use when: locating code, understanding folder layout, or updating project/tool configuration

**`ai-security`** — AI policy, protected files, exclusion sync, and multi-client enforcement
- Use when: changing `.ai-policy.json`, sync behavior, generated restriction files, or agent file-access enforcement

**`skills-authoring`** — Guidelines for creating and maintaining project skills
- Use when: designing skills, updating copied skills, or evaluating skill quality

**`tool-consolidate-skills`** — Consolidate overlapping skill and top-level guidance
- Use when: trimming duplication, moving rules to the right owner, or simplifying `copilot-instructions.md`

**`tool-adopt-these-skills`** — Adopt this repo's core skills and AI security tooling in another repository
- Use when: bootstrapping another repo with this repo's agent setup or porting the AI security workflow elsewhere

**`tasks-management`** — Maintain feature task tracking under `.agents/tasks/`
- Use when: a task should be tracked as a structured multi-step feature

## Workflow

When working on this project:

1. **Start**: Pull latest changes and rebase.
2. **Setup**: Run `uv sync` at the start of work and again after rebasing or dependency changes.
3. **Implement**: Follow the owning skill for the area you are touching.
4. **Validate**: Run lint, type-checking, and tests before committing.
5. **Commit**: Keep commits small and focused.
6. **Reflect**: Review what happened in the session, identify both corrections and durable lessons, and decide whether any skill or instruction should be updated. Summarize the result to the user and ask if they want the guidance updated. If yes, update the relevant skill using `skills-authoring`, and after editing suggest a follow-up consolidation pass with `tool-consolidate-skills`.

## Quick Commands

- `uv sync` — Install or refresh dependencies.
- `uv run poe test` — Run tests.
- `uv run poe lint` — Check formatting.
- `uv run poe lint-fix` — Auto-format code.
- `uv run poe typecheck` — Run Pyright strict mode.
- `uv run poe lint-filter` — Run lint and filter output.
- `uv run poe typecheck-filter` — Run type-checking and filter output.
- `uv run sync-ai-policy` — Regenerate agent config from `.ai-policy.json`.
- `uv run sync-ai-policy-import-vscode` — Import VS Code approvals into policy, then sync.

Use the Poe validation tasks above as the default way to run tests, lint, and type-checking in this repo. Only call the underlying tools directly when a task needs flags or behavior that the Poe wrapper does not expose.

## Asking for Help

- For code structure, typing, tests, or CLI/task choices: use `code-conventions`.
- For repo layout, tool wiring, or `pyproject.toml`: use `project-structure-setup`.
- For workflow and structural caution: use `agent-behavior`.
- For security policy config and generated restriction files: use `ai-security`.
- For skills themselves: use `skills-authoring` and `tool-consolidate-skills`.
