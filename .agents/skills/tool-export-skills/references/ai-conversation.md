# AI Conversation Handoff

Use this mode when the target is a live AI session rather than a repo or a persistent Gemini Gem.

## Supported targets

- Gemini conversation
- Claude Code conversation

## First step

Ask which conversation target the user wants and whether the conversation should stay reusable across repos or can include repo-local skills.

## Output to provide

- the smallest useful skill list
- any hard dependencies that must come along
- any repo-local exclusions or explicit justifications
- a short paste-ready bootstrap note that names the selected skills and tells the receiving assistant how to use them

## Core rules

- keep the bundle small; a conversation does not need the whole catalog
- preserve exact skill names so the user can attach or reference the right folders
- prefer `shareable` skills unless the conversation is explicitly for this repo
- if the target really needs a persistent repo setup, steer back toward `skills-management` or a copied bundle instead of pretending a conversation handoff is equivalent