---
name: ref-standalone-web-pages
description: "Portable guidance for standalone HTML, CSS, and JavaScript pages and local web tools. Use when: creating single-page tools, deciding when to extract local assets, or keeping browser-only pages maintainable without a framework."
metadata:
  shareable-skills.visibility: "shareable"
---

# Standalone Web Pages

## Purpose

Provide portable defaults for self-contained web pages and browser-only tools that should stay simple, readable, and maintainable without unnecessary framework or build-system overhead.

## When to use this skill

- Creating a standalone HTML page or mini web tool.
- Refactoring a single-file page that is getting too large.
- Deciding whether local CSS or JS should stay inline or be extracted.
- Reviewing the structure of a browser-only feature.

## Defaults

- Start with one self-contained HTML file for small and medium tools.
- Use semantic HTML before reaching for generic containers.
- Keep styles and scripts local unless extraction clearly improves readability.
- Treat each standalone tool as an independent unit.
- Avoid introducing frameworks or shared build infrastructure unless the user asks for them.

## Core Rules

### Structure

- Use semantic sections such as `header`, `main`, `section`, `form`, and `dialog` where they fit.
- Keep the page layout obvious from the markup alone.
- Extract CSS or JS into local sibling files only when the inline version becomes hard to scan.

### JavaScript organization

- Keep a predictable order: constants, state, element lookup, pure helpers, rendering, events, initialization.
- Extract repeated transformations and persistence helpers before extracting global infrastructure.
- Keep storage keys, labels, and other repeated values in named constants.

### Independence

- Assume one standalone page should not need another page's runtime files.
- If local assets or helpers exist, keep them inside the same page folder.
- Only create shared runtime layers when the user explicitly wants repository-wide reuse.

## Validation

- The page remains understandable without framework knowledge.
- HTML is semantic, JS responsibilities are clear, and repeated values are named.
- Local extraction improved readability instead of adding ceremony.
- The tool does not introduce hidden coupling to unrelated pages.

## References

- Read `./references/checklist.md` for a quick standalone-page review pass.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for page, browser-tool, and single-file app prompts.