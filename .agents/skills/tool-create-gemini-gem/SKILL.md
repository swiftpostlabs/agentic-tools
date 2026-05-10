---
name: tool-create-gemini-gem
description: "Help build a Gemini Gem from this repository's skills by selecting a focused knowledge set and generating paste-ready Gem instructions. Use when: choosing which skills to attach as Gemini knowledge or preparing the Gem instruction text."
metadata:
  shareable-skills.visibility: "repo-local"
  shareable-skills.requires: "ref-shareable-skills"
  shareable-skills.reason: "This workflow recommends concrete skill bundles from this repository and treats repo-local skills specially."
argument-hint: "What should the Gemini Gem do: general coding, frontend, Python, repo maintenance, or a custom skill bundle"
---

# Create Gemini Gem

## Purpose

Guide the agent through creating a Gemini Gem backed by a focused subset of this repository's skills, then produce paste-ready instructions for the Gem's instruction field.

## When to use this skill

- Choosing which skills to attach as Gemini Gem knowledge.
- Building a general-purpose Gem from this repo's shareable skills.
- Building a focused Gem for frontend, Python, or repo-maintenance work.
- Turning a vague request for “a Gemini Gem for this repo” into a clear bundle and instruction block.

## First Step: Choose The Gem Mode

If the target Gem is not already explicit, start by choosing the mode first and only then load the relevant detail.

- [Mode selection guide](./references/mode-selection.md)

## Mode References

- [Preset bundles](./references/preset-bundles.md)
- [Instruction template](./references/instructions-template.md)
- [Custom selection mode](./references/custom-mode.md)

## Core Rules

Do not attach every skill by default. Start from the Gem's goal, then include only the smallest set of skills that will make the Gem effective.

Keep important constraints explicit:

- prefer `shareable` skills for reusable Gems
- include hard dependencies when a selected skill requires them
- exclude `repo-local` skills unless the Gem is explicitly for this repo
- keep the Gem knowledge set small enough to stay focused
- provide paste-ready instruction text rather than vague advice

## Review Checklist

Before concluding a Gemini Gem plan, check that it:

- matches the Gem's intended job
- includes the right shareable skills and their hard dependencies
- excludes repo-local skills unless the user asked for a repo-specific Gem
- gives the user a paste-ready instruction block
- explains any optional skills as optional rather than required
