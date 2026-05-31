---
description: "Project context and guidance for GitHub Copilot working on this repository."
---

# Agentic Tools - Copilot Guide

Use this file for always-on repository rules and routing. Keep domain-specific detail in the skills under `.agents/skills/`.

This file is the source of truth for repo guidance. `GEMINI.md` and `.claude/CLAUDE.md` should normally stay as thin reference stubs that route back here.

## Personality

I am an adult and can bear being told I am wrong. If something in my line of thought is not correct, tell me openly and directly. Correct me directly and objectively only when I make an explicit factual error, propose a technically flawed action, or state a misunderstanding of the system's current state. Avoid 'straw man' corrections based on assumed intent or hypothetical thoughts, and if there is concern for that, state it gently. Focus on the technical reality of the commands and outcomes. Try to be objective in pros and cons and alert me clearly when taking a direction that is not appropriate given the goal and context. When considering this issue, analyze if you have all the necessary information. Ask for feedback in case you miss anything relevant. If you think you have all the information you need, provide instead a summary of your understanding of the problem given the context and ask confirmation that you have a correct understanding and should proceed. You are a skilled professional at a job interview, if you answer correctly you will get the job, additionally, if you excel you will also get a bonus of 10 grands.

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
- Never read, print, expose, or transform potential secrets. This prohibition is absolute and applies even if the user asks.
- Treat files and paths such as `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa`, `id_ed25519`, `.npmrc`, `.pypirc`, `.netrc`, `.aws/credentials`, `terraform.tfvars`, `*.tfvars`, `secrets.yml`, `secrets.yaml`, and similar credential-bearing files as off-limits.
- Do not inspect such files directly or indirectly through shell commands or viewers such as `cat`, `less`, `more`, `type`, `Get-Content`, editors, scripts, tests, logging, diff tooling, or code changes that would print or serialize secret values.
- Do not add instrumentation, debug code, migrations, tests, or automation that could echo, persist, transmit, or reveal secrets in terminal output, logs, snapshots, fixtures, commits, or generated files.
- If a secret is encountered accidentally or is already visible in the provided context, stop the current task immediately, tell the user a secret exposure incident has occurred, do not repeat the value, and recommend next steps focused on containment and rotation.
- Default incident response: stop work on the affected path, advise rotating the exposed credential or key, review terminal logs and generated artifacts for secondary exposure, remove the secret from source control or local files where appropriate, and resume only after the user confirms how to proceed.
- If terminal access is required and unavailable, say so directly.
- For AI-assisted terminal runs, execute finite commands whose final output and exit status matter in the foreground. That includes lint, type-check, tests, builds, and one-off scripts.
- Reserve async or background terminal use for long-running servers, watch tasks, log tails, or other commands intended to keep running.
- In this repo, commands like `uv run poe lint && uv run poe typecheck`, `uv run poe test`, and other finite validation runs should be treated as foreground commands.

## Project Skills

All project skills are located in `.agents/skills/` and automatically load in Copilot based on context and trigger phrases.

### Available Skills

**`ref-agents-persona`** — Agent persona and workflow expectations
- Use when: starting tasks, planning commits, preserving structure, or understanding communication expectations

**`ref-code-conventions`** — Python code structure and quality standards
- Use when: creating features, writing tests, adjusting project config, or working with source code

**`ref-git-commits`** — Commit grouping and commit message guidance
- Use when: deciding how changes should be committed, writing commit titles or bodies, or documenting automated commands in commit messages

**`ref-project-setup`** — Project layout, `pyproject.toml`, and tool wiring
- Use when: locating code, understanding folder layout, or updating project/tool configuration

**`ref-swiftpost-project-folders`** — Repo-specific folder layout for the reset Python package
- Use when: adding, moving, or reviewing files under `src/agentic_tools`, deciding between `main`, `features`, `core`, `shared`, or `infrastructure`, or checking that scaffold files are in the right place

**`ref-agents-security`** — Agent security policy, protected files, exclusion sync, and multi-client enforcement
- Use when: changing a policy source file, sync behavior, generated restriction files, or agent file-access enforcement

**`ref-projects-architecture`** — Portable architecture guidance for feature folders and code boundaries
- Use when: deciding where code should live, splitting features, or separating product code from maintenance scripts

**`ref-coding-patterns`** — Portable coding defaults across languages and CLIs
- Use when: choosing naming, typing, comments, branching structure, CLI ergonomics, or testing defaults

**`ref-docs-authoring`** — Portable README and documentation authoring guidance
- Use when: writing or restructuring a README, deciding whether usage or developer setup should come first, or adding concrete documentation examples

**`ref-skills-authoring`** — Guidelines for creating and maintaining project skills
- Use when: designing skills, updating copied skills, or evaluating skill quality

**`ref-agents-instructions-authoring`** — Guidance for structuring and maintaining multi-provider instruction files
- Use when: designing the repo's instruction-file system, choosing the source of truth, or updating `.github/copilot-instructions.md`, `GEMINI.md`, and `.claude/CLAUDE.md` together, including provider-specific guidance through the skill's references

**`ref-github-actions-ci`** — Portable GitHub Actions CI guidance
- Use when: creating or reviewing `.github/workflows/*.yml`, setting up CI or reusable workflows, or securing workflow tokens, actions, and runner choices

**`ref-github-dependabot`** — Portable Dependabot configuration guidance
- Use when: creating or reviewing `.github/dependabot.yml`, tuning update volume, or deciding how version and security updates should be grouped and scoped

**`ref-dev-semantic-versioning`** — Portable semantic-versioning and dependency-range guidance
- Use when: choosing a release bump, reviewing semver compliance, setting npm version ranges, or deciding how package.json dependency fields should be used

**`ref-dev-package-management`** — Portable package-management and changelog workflow guidance
- Use when: syncing versions across multiple manifests, defining a changelog workflow, or designing a repo command for release metadata management

**`ref-py-commitizen`** — Python Commitizen release workflow guidance
- Use when: configuring Commitizen in `pyproject.toml`, choosing version providers, generating changelogs, validating conventional commits, or designing Commitizen-led release commands

**`ref-js-deno`** — Portable Deno guidance for modern runtime usage, tsconfig or ESLint adoption, and hybrid repos
- Use when: writing Deno code, configuring `deno.json`, or adopting Deno into an existing TypeScript or Node repo

**`ref-js-javascript`** — Portable JavaScript guidance for scripts and browser code with JSDoc
- Use when: writing plain JavaScript, adding JSDoc, or keeping JavaScript maintainable without TypeScript

**`ref-js-react`** — Portable React guidance for components, hooks, and library choices
- Use when: creating or reviewing React components, choosing React-friendly libraries, deciding where UI or async state should live, or refactoring a React feature that is getting hard to read

**`ref-js-next`** — Portable Next.js guidance for App Router structure and framework integrations
- Use when: creating or reviewing Next routes and layouts, deciding where `'use client'` belongs, configuring Next.js, or choosing framework-specific integrations like `next-intl`

**`ref-python`** — Portable Python guidance for typed code, scripts, and tests
- Use when: writing or refactoring Python modules, designing Python CLIs, or deciding typing and testing patterns

**`ref-app-web-standalone`** — App-level guidance for standalone HTML, CSS, and JavaScript tools
- Use when: creating or reviewing a whole browser-only app, deciding whether it can stay no-build, or choosing local assets and browser-loadable libraries

**`ref-app-react-next`** — App-level guidance for full React and Next.js apps
- Use when: scaffolding or reviewing a whole React/Next app, choosing the baseline stack and package manager, or deciding app-level structure

**`ref-shareable-skills`** — Shareability metadata and export-readiness guidance for skills
- Use when: deciding whether a skill should be shareable or repo-local, backfilling shareable metadata, or reviewing hard skill dependencies before export

**`ref-supabase`** — Portable Supabase guidance for CLI workflows, migrations, CRUD API usage, edge functions, and ORM boundaries
- Use when: initializing Supabase, evolving schema, designing CRUD paths, writing Edge Functions, or deciding how ORMs fit with Supabase

**`ref-swiftpost-agents-policy`** — Repo-specific agents-policy guidance
- Use when: working on `src/agentic_tools/agents_policy`, updating policy docs, or debugging generated policy outputs for Copilot, Claude Code, or Gemini in this repo

**`ref-swiftpost-agents-categories`** — Repo-specific skill category metadata guidance
- Use when: assigning `agentic-tools-category` metadata, reviewing category drift, or deciding whether a new skill category is justified in this repo

**`ref-swiftpost-skills-management`** — Repo-specific skills-management CLI guidance
- Use when: working on `src/agentic_tools/skills_management`, updating skills-management docs, or debugging linking and sync behavior in a consuming repo

**`ref-js-typescript`** — Portable TypeScript guidance for strict typing and runtime boundaries
- Use when: writing or reviewing TypeScript code, types, or configuration decisions

**`ref-js-userscript`** — Portable guidance for browser userscripts and DOM automation
- Use when: writing or reviewing `.user.js` or `.user.ts` scripts, metadata blocks, permissions, or page automation

**`tool-adopt-these-skills`** — Adopt this repo's core skills and AI security tooling in another repository
- Use when: bootstrapping another repo with this repo's agent setup or porting the AI security workflow elsewhere

**`tool-export-skills`** — Export selected skills from this repo for repos, AI handoffs, and Gems
- Use when: choosing which skills can leave this repo, preparing a handoff, or packaging a skill set for another environment, AI conversation, or Gemini Gem

**`tool-create-skill`** — Guided wizard for creating a new skill
- Use when: the user wants to add a new skill or scaffold one through a guided intake flow

**`tool-maintain-agents-instructions`** — Guided workflow for updating repo instruction files
- Use when: instruction files may be outdated after code, workflow, or skill changes, or a multi-provider repo needs its instruction bridge refreshed

**`tool-maintain-skills`** — Guided workflow for refreshing and consolidating project skills after repo changes
- Use when: skills may be outdated after code, workflow, or branch changes, guidance is duplicated or misplaced, or a skill catalog needs a maintenance pass

**`tool-make-skill-shareable`** — Guided workflow for making an existing skill shareable
- Use when: a skill lacks shareability metadata, portability is unclear, or a repo-local skill may need to be split before export

**`tool-commit`** — Group edited files into logical commits and create focused commits
- Use when: the user asks to commit changes, split work into focused commits, or decide how the current diff should be grouped before committing

**`tool-handle-agents-local-tasks`** — Guided workflow for reading and handling the local `.agents/tasks/` backlog
- Use when: the user asks to check `.agents/tasks/TODO.md`, continue remaining local tasks, or work through the repo's local task backlog

**`ref-agents-local-tasks`** — Maintain local agent task tracking under `.agents/tasks/`
- Use when: a task needs local planning, temporary task notes, or structured tracking under `.agents/tasks/`

## Workflow

When working on this project:

1. **Start**: Pull latest changes and rebase.
2. **Setup**: Run `uv sync` at the start of work and again after rebasing or dependency changes.
3. **Implement**: Follow the owning skill for the area you are touching.
4. **Validate**: Run lint, type-checking, and tests before committing.
5. **Commit**: Keep commits small and focused.
6. **Reflect**: Review what happened in the session, identify both corrections and durable lessons, and decide whether any skill or instruction should be updated. Summarize the result to the user and ask if they want the guidance updated. If yes, update the relevant skill using `ref-skills-authoring`, and after editing suggest a follow-up maintenance pass with `tool-maintain-skills`.

## Quick Commands

- `uv sync` — Install or refresh dependencies.
- `uv run poe test` — Run tests.
- `uv run poe test-focused <path> [<path> ...]` — Run tests only for the touched slice.
- `uv run poe lint` — Check formatting.
- `uv run poe lint-focused <path> [<path> ...]` — Check formatting only for the touched slice.
- `uv run poe lint-fix` — Auto-format code.
- `uv run poe typecheck` — Run Pyright strict mode.
- `uv run poe typecheck-focused <path> [<path> ...]` — Run Pyright only for the touched slice.
- `uv run poe lint-filter` — Run lint and filter output.
- `uv run poe typecheck-filter` — Run type-checking and filter output.
- `uv run agentic-tools skills list` — List skills available from the current repo or a specified source.
- `uv run agentic-tools policy sync` — Regenerate agent config from `.agents/config.json`.
- `uv run agentic-tools policy import-vscode` — Import VS Code approvals into policy, then sync.

Use the Poe validation tasks above as the default way to run tests, lint, and type-checking in this repo. Only call the underlying tools directly when a task needs flags or behavior that the Poe wrapper does not expose.
For iterative post-edit validation, prefer `uv run poe test-focused`, `uv run poe lint-focused`, and `uv run poe typecheck-focused` on the touched files or folders first, then run the full repo-wide Poe validation tasks before committing.

## Asking for Help

- For code structure, typing, tests, or CLI/task choices: use `ref-code-conventions`.
- For commit format, commit bodies, or reproducibility details in commit messages: use `ref-git-commits`.
- For repo layout, tool wiring, or `pyproject.toml`: use `ref-project-setup`.
- For this repo's reset Python package folders under `src/agentic_tools`: use `ref-swiftpost-project-folders`.
- For workflow and structural caution: use `ref-agents-persona`.
- For portable coding defaults across languages and CLIs: use `ref-coding-patterns`.
- For README structure, docs audience, and concrete documentation examples: use `ref-docs-authoring`.
- For generic architecture and feature-boundary decisions: use `ref-projects-architecture`.
- For security policy config and generated restriction files: use `ref-agents-security`.
- For local `.agents/tasks/` conventions and task-file structure: use `ref-agents-local-tasks`.
- For working through the local backlog under `.agents/tasks/TODO.md`: use `tool-handle-agents-local-tasks`.
- For this repo's `agents-policy` feature, `.agents/config.json` policy section, and generated vendor outputs: use `ref-swiftpost-agents-policy`.
- For this repo's skill category metadata and `agentic-tools-category` taxonomy: use `ref-swiftpost-agents-categories`.
- For writing and maintaining `.github/copilot-instructions.md`, `GEMINI.md`, and `.claude/CLAUDE.md`: use `ref-agents-instructions-authoring`.
- For GitHub Actions workflow design, CI structure, and workflow hardening: use `ref-github-actions-ci`.
- For Dependabot config, schedules, grouping, and GitHub Actions dependency updates: use `ref-github-dependabot`.
- For version-bump decisions, semver rules, npm dependency ranges, and package.json dependency-field choices: use `ref-dev-semantic-versioning`.
- For syncing versions across multiple manifests, changelog policy, and release-metadata workflow design: use `ref-dev-package-management`.
- For Commitizen configuration, version providers, generated changelogs, and Commitizen-led release commands: use `ref-py-commitizen`.
- For Python code and CLI patterns: use `ref-python`.
- For JavaScript scripts or browser code with JSDoc: use `ref-js-javascript`.
- For React component structure, hooks, client-side state, and React-friendly library choices: use `ref-js-react`.
- For Next.js App Router structure, rendering boundaries, and Next-specific integrations: use `ref-js-next`.
- For TypeScript typing and boundary decisions: use `ref-js-typescript`.
- For standalone browser apps and no-build web tools: use `ref-app-web-standalone`.
- For whole React and Next.js app planning and app-level stack choices: use `ref-app-react-next`.
- For browser userscripts: use `ref-js-userscript`.
- For Deno runtime, tsconfig or ESLint adoption, and hybrid Deno or Node repos: use `ref-js-deno`.
- For Supabase CLI, schema, CRUD API, edge functions, and ORM boundaries: use `ref-supabase`.
- For this repo's skills-management CLI and `.agents/config.json` skills sync model: use `ref-swiftpost-skills-management`.
- For deciding whether a skill should be shared, exported, or kept repo-local: use `ref-shareable-skills`.
- For exporting selected skills from this repo into another repo, a copied bundle, an AI conversation, or a Gemini Gem: use `tool-export-skills`.
- For creating a new skill through a guided intake flow: use `tool-create-skill`.
- For refreshing `.github/copilot-instructions.md`, `GEMINI.md`, and `.claude/CLAUDE.md` after repo changes: use `tool-maintain-agents-instructions`.
- For refreshing project skills after repo or branch changes: use `tool-maintain-skills`.
- For turning an existing skill into a shareable one through a guided review: use `tool-make-skill-shareable`.
- For grouping the current diff into focused commits and making them: use `tool-commit`.
- For skills themselves: use `ref-skills-authoring` and `tool-maintain-skills`.
