---
name: ref-sp-dev-docs-authoring
description: "Writing READMEs and feature docs for humans: which audience comes first, concrete examples, and when to split detail into linked files. Use when writing or restructuring a README or feature-level doc."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "dev"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "docs"
---

# Docs Authoring

Documentation for **people**. Instructions for agents are `ref-sp-agents-instructions-authoring`
(`AGENTS.md`) and `ref-sp-agents-skills-authoring` (`SKILL.md`); commit bodies are
`ref-sp-dev-git-commits`. GitHub's own guidance:
[About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes),
[Markdown syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax).

## Every README

- One `#` title, then a short description directly under it.
- Answer what it does, why it is useful, how to start, where to get help, and who maintains it
  when that matters.
- Stay on orientation and getting started; move long reference material into linked docs once the
  entry document gets heavy.
- Internal feature docs start from whoever consumes the feature, developer or agent, even inside
  the repo.
- Concrete beats abstract: the exact first command, a valid minimal config (not just field lists),
  a workflow with its order and expected result. One small working example over several fragments,
  realistic but short: not a second manual.

## Audience first

Order sections by the reader's job, not the code's internals.

| Kind | Order |
| --- | --- |
| Tool or library others use | What and why → install or quick start → common commands → links to subfeature docs → developer setup and validation |
| Template, starter, internal codebase | What it's for → setup → customising → validation and maintenance |
| Internal feature README | What it does and when to use it → minimal example → key behaviours and gotchas → files, internals, focused validation |

## GitHub Markdown

- Real headings, not bold labels, so the outline and section links work.
- Relative links to repo files (`[Feature docs](src/example/README.md)`), kept on one line, so
  clones and branch views keep working.
- Fenced blocks with a language: `sh`, `json`, `yaml`.
- Tables and alerts only where they genuinely help scanning or flag a real risk.

## Example opening

````md
# Example Tool

Short description of what the tool does and who it helps.

## Quick Start

```sh
example-tool sync --config .agents/example.json
```

## Common Workflows
````

## Before finishing

- Headings are specific enough that GitHub's outline is useful.
- No absolute links to files in the same repo.
