---
name: ref-docs-authoring
description: "Portable README and documentation authoring guidance for top-level and feature-level docs. Use when: writing or restructuring a README, deciding whether user usage or developer setup should come first, adding concrete examples, or splitting long docs into focused follow-up files."
metadata:
  shareable-skills.visibility: "shareable"
---

# Docs Authoring

## Purpose

Write README files and focused documentation that orient the right audience quickly, make the next action obvious, and keep longer detail in the right place.

## When to use this skill

- Writing or restructuring a top-level `README.md`.
- Deciding whether usage or developer setup should come first.
- Writing a feature-level README for an internal subsystem or CLI.
- Replacing vague prose with concrete commands, config examples, or workflows.
- Splitting an overloaded README into a concise entry document plus deeper linked docs.

## External references

- GitHub Docs: <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes>
- GitHub Markdown syntax: <https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax>

## Core rules

- Every README starts with one `#` title and a short description immediately below it.
- Put the most important audience first. Do not make users dig through contributor setup to learn how to use the project.
- README content should cover the startup questions GitHub calls out: what the project does, why it is useful, how to get started, where to get help, and who maintains it when that matters.
- Keep the README focused on getting oriented and getting started. Move long reference material into focused follow-up docs once the entry document starts feeling heavy.
- Prefer concrete commands, config snippets, and realistic examples over abstract descriptions.
- Use relative links to other docs in the repository so cloned copies and branch views keep working.
- Use clear headings so GitHub's automatic outline stays useful.
- Use fenced code blocks with an info string when showing commands, JSON, YAML, or code.
- Use alerts or callouts sparingly. They should highlight critical success or risk points, not replace normal structure.

## Audience-first ordering

Choose the order from the reader's actual job, not from the implementation's internals.

### Tool or library used by developers

- Put user-facing usage first.
- Start with what the tool does, why someone would use it, and the shortest working flow.
- Move maintainer setup, local validation, and implementation notes later.

Typical order:

1. Title and short description.
2. What the tool does and why it exists.
3. Install or quick start.
4. Common commands or concrete usage examples.
5. Links to focused docs for subfeatures.
6. Developer setup and validation.

### Template, starter, boilerplate, or internal-only codebase

- Put developer setup first.
- Readers are usually maintainers or people bootstrapping from the repo, not end users installing a product.
- Explain what the starter includes, then how to initialize, adapt, validate, and maintain it.

Typical order:

1. Title and short description.
2. What the template or internal module is for.
3. Setup or initialization flow.
4. Customization or extension steps.
5. Validation and maintenance commands.

### Internal feature README

- Start from the consumer of the feature, even inside the repo.
- Explain what the feature owns, how another developer or agent uses it, and the minimal example first.
- Put implementation surfaces, file maps, and focused validation after the usage-oriented overview.

Typical order:

1. Title and short description.
2. What the feature does and when to use it.
3. Concrete example, command, or config shape.
4. Key behaviors or gotchas.
5. Files, internals, and focused validation.

## Concrete-example rules

- When documenting a tool, show the exact command a reader should run first.
- When documenting a config file, show a valid minimal config, not just field descriptions.
- When documenting a workflow, show the order of actions and the expected outcome.
- Prefer one small working example over several partial fragments.
- Keep examples realistic but short. They should reduce ambiguity, not become a second manual.

## GitHub Markdown guidance

- Prefer headings over manual bold labels so the outline and section links work.
- Prefer relative links such as `[Feature docs](src/example/README.md)` instead of absolute repository URLs.
- Keep link text on one line so GitHub renders the link correctly.
- Use fenced blocks such as ```sh, ```json, and ```yaml for commands and config.
- Keep tables optional. Use them only when they genuinely improve scanning compared to bullets.

## Review checklist

- Does the first screen tell the intended reader what this thing is?
- Does the document put the main audience's first action before maintainer-only detail?
- Is there at least one concrete example for the main command, config, or workflow?
- Are deeper details linked instead of dumped into the entry document?
- Would the GitHub outline be useful, or are the headings too vague?
- Are links relative when they point to files in the same repo?

## Examples

### Tool README opening

```md
# Example Tool

Short description of what the tool does and who it helps.

## Quick Start

```sh
example-tool sync --config .agents/example.json
```

## Common Workflows
```

### Feature README opening

```md
# Example Feature

Short description of the feature's responsibility.

## For Users

Explain the main command, config, or entrypoint first.

## For Developers
```