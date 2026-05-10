---
name: tool-export-these-skills
description: "Help export selected skills from this repository in the right format for another repo, a manual bundle, or an external AI knowledge target. Use when: choosing which skills can leave this repo, preparing a skills-management handoff, or packaging a skill set for another environment."
metadata:
  shareable-skills.visibility: "repo-local"
  shareable-skills.requires: "ref-shareable-skills ref-swiftpost-skills-management"
  shareable-skills.reason: "This workflow depends on this repo's concrete skill catalog, shareability metadata, and skills-management conventions."
argument-hint: "What are you exporting, and to where: another repo, a manual bundle, a Gemini Gem, or another target"
---

# Export These Skills

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
- [Gemini Gem handoff](./references/gemini-gem.md)
- [Other or fill blank](./references/other-mode.md)

## Core Rules

Do not dump all export instructions at once if the target format is still ambiguous. Pick the mode first, then provide only the instructions relevant to that mode.

Keep important constraints explicit:

- export only `shareable` skills by default
- include hard dependencies from `shareable-skills.requires`
- warn before including `repo-local` skills
- preserve full skill folders, frontmatter, and subfiles when exporting actual files
- give concrete validation commands for the chosen export path

## Review Checklist

Before concluding an export plan, check that it:

- uses the right export mode for the target
- includes all hard dependencies and excludes optional neighbors unless asked
- avoids repo-local skills unless the target is explicitly repo-specific
- preserves the skill folder structure when files are being copied or linked
- gives the user a concrete validation step after export
