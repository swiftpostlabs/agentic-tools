# Gemini Gem Handoff

Use this mode when the user wants to turn selected skills into Gemini Gem knowledge rather than link or copy them into another repo.

## First step

If the Gem goal is still vague, ask whether it is for general coding and architecture, frontend and web, Python and backend, repo maintenance and AI tooling, or a custom bundle.

## Preset bundles

Use these as starting points, not as mandatory all-or-nothing bundles.

### General coding and architecture

- `ref-agents-persona`
- `ref-coding-patterns`
- `ref-projects-architecture`
- `ref-git-commits`

### Frontend and web

- `ref-js-javascript`
- `ref-js-typescript`
- `ref-js-react`
- `ref-js-next`
- `ref-app-web-standalone`
- `ref-app-react-next`
- `ref-js-userscript`

### Python and backend

- `ref-python`
- `ref-coding-patterns`
- `ref-projects-architecture`
- `ref-supabase` when relevant

### Repo maintenance and AI tooling

- `ref-skills-authoring`
- `ref-shareable-skills`
- `ref-agents-instructions-authoring`
- `ref-agents-security`
- `ref-github-actions-ci`
- `ref-github-dependabot`

### Repo-specific add-ons

Only add these when the Gemini Gem is explicitly for this repository:

- `ref-swiftpost-skills-management`
- `ref-swiftpost-agents-policy`
- `ref-project-setup`
- `tool-export-skills`

## Custom bundle questions

If no preset fits cleanly, ask only the missing questions:

1. What kinds of tasks should the Gem be good at?
2. Should the Gem stay reusable across repos, or is it specific to this repo?
3. Which languages, frameworks, or workflows matter most?
4. Should repo-local skills be excluded unless absolutely necessary?

## Default instruction block

Use this as the default paste-ready instruction block for a Gemini Gem built from this repository's skills.

```text
You are a Gemini Gem configured with selected skill knowledge from the swiftpost-shareable-skills repository.

Use the attached skill files as the primary operating guidance for the domains they cover.
Prefer the smallest relevant subset of the attached skills for each request instead of blending everything together.

Rules:
- Follow the selected skills closely when they apply.
- Prefer shareable, portable guidance unless the Gem was explicitly created for a repo-specific workflow.
- If two skills overlap, prefer the more specific skill for the current task.
- Keep responses practical and implementation-oriented.
- Do not invent missing repo details; ask for them or state the assumption.

Attached skill bundle:
- [replace with the selected skill names]

Optional repo-specific note:
- [replace this only when the Gem intentionally includes repo-local skills]
```

Replace the attached skill list with the exact selected skills. Remove the repo-specific note entirely when the Gem should stay reusable.

## Core rule

Do not dump the whole catalog into the Gem. Start with the smallest useful preset or custom bundle, include hard dependencies, and provide the final skill list plus a paste-ready instruction block.
