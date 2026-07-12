---
name: tool-sp-export-skills
description: "Help export selected skills from this repository in the right format for another repo, a manual bundle, AI conversations, a Gemini Gem, a Copilot project, or a published Claude Code plugin marketplace. Use when: choosing which skills can leave this repo, preparing a handoff, publishing skills for install, or packaging a skill set for another environment."
argument-hint: "What is the export target: another repo, manual bundle, Gemini conversation, Gemini Gem, Claude Code conversation, Copilot project, Claude plugin marketplace, or something else"
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.visibility: "repo-local"
  shareable-skills.requires: "ref-sp-agents-shareable-skills, ref-sp-agents-skills-management"
  shareable-skills.suggests: "ref-sp-agents-claude-marketplaces"
  shareable-skills.reason: "This workflow depends on this repo's concrete skill catalog, shareability metadata, and skills-management conventions."
---

# Export Skills

## Purpose

Provide a reliable handoff workflow for exporting selected skills from this repository without accidentally including repo-local skills, dropping hard dependencies, or giving the user the wrong format for the target.

This skill is intentionally broader than a single export mechanism. It should help choose the export mode first and only then provide the instructions relevant to that mode.

## When to use this skill

- Preparing a skill set for another repository.
- Deciding whether selected skills should be linked, copied, or summarized.
- Exporting skills for an external AI knowledge target.
- Turning a broad “export these skills” request into a concrete plan.

## First Step: Choose The Export Mode

If the target is not already explicit, start by choosing the export mode first and only then load the relevant detail.

- [Mode selection guide](./references/mode-selection.md)

## Mode References

- [Another repo via skills-management](./references/skills-management.md)
- [Manual bundle or copied skill folders](./references/manual-bundle.md)
- [AI conversation handoff](./references/ai-conversation.md)
- [Gemini Gem handoff](./references/gemini-gem.md)
- [Copilot project handoff](./references/copilot-project.md)
- [Claude Code plugin marketplace](./references/claude-marketplace.md) — publishing, not a one-time
  handoff; defers to `ref-sp-agents-claude-marketplaces` for the mechanics.
- [Other or fill blank](./references/other-mode.md)

## Core Rules

Do not dump all export instructions at once if the target format is still ambiguous. Pick the mode first, then provide only the instructions relevant to that mode.

Keep important constraints explicit:

- export only `shareable` skills by default
- include hard dependencies from `shareable-skills.requires`
- warn before including `repo-local` skills
- preserve full skill folders, frontmatter, and subfiles when exporting actual files
- suggest `.agents/config.json` plus `agentic-tools skills sync` when a Copilot project can consume linked skills directly
- give concrete validation commands for the chosen export path

## Review Checklist

Before concluding an export plan, check that it:

- uses the right export mode for the target
- includes all hard dependencies and excludes optional neighbors unless asked
- avoids repo-local skills unless the target is explicitly repo-specific
- preserves the skill folder structure when files are being copied or linked
- gives the user a concrete validation step after export
