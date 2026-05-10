---
name: ref-userscript
description: "Portable guidance for browser userscripts on Tampermonkey, Violentmonkey, and similar managers. Use when: writing or reviewing .user.js or .user.ts scripts, metadata blocks, permissions, or DOM automation."
metadata:
  shareable-skills.visibility: "shareable"
---

# Userscript

## Purpose

Provide portable defaults for userscripts that are resilient to DOM changes, scoped safely, and explicit about permissions and page integration.

## When to use this skill

- Writing or reviewing a userscript.
- Designing the metadata block, grants, and match patterns.
- Injecting UI into third-party pages.
- Automating DOM interactions or page data extraction.

## Defaults

- Keep the metadata block explicit and minimal.
- Use the narrowest `@match` or `@include` patterns that still fit the task.
- Declare grants deliberately; do not request APIs you do not use.
- Keep startup idempotent so re-runs do not duplicate UI or listeners.
- Isolate selectors, storage keys, and injected class names as constants.

## Core Rules

### Metadata and permissions

- Choose precise page scopes rather than broad wildcards where possible.
- Add `@grant` entries only for the userscript APIs the code actually uses.
- Keep version, name, and description clear enough that the installed script is recognizable.

### DOM behavior

- Wait for the necessary page state before acting.
- If the target page is highly dynamic, prefer a small targeted observer over polling loops.
- Namespace injected CSS classes, IDs, or data attributes to avoid clashing with the page.

### State and safety

- Make UI injection and event binding idempotent.
- Keep selectors and mutation rules centralized so page changes are easier to repair.
- Fail softly when the page no longer matches expectations.

## Validation

- The metadata block requests only the permissions and pages actually needed.
- Re-running the script does not duplicate injected UI or listeners.
- Page selectors and injected identifiers are centralized and namespaced.
- The script degrades cleanly when the host page changes.