---
name: ref-typescript
description: "Portable TypeScript guidance for strict typing, runtime boundaries, and maintainable scripts or apps. Use when: writing or reviewing TypeScript code, types, or configuration decisions."
metadata:
  shareable-skills.visibility: "shareable"
---

# TypeScript

## Purpose

Provide portable TypeScript defaults that keep types honest, runtime boundaries explicit, and code readable under strict settings.

## When to use this skill

- Writing or refactoring TypeScript modules or scripts.
- Deciding how to model states, responses, and shared types.
- Reviewing TypeScript config and type-checking strictness.
- Handling unknown external data safely.

## Defaults

- Prefer strict mode and keep it strict.
- Prefer `unknown` plus narrowing over `any`.
- Prefer discriminated unions for stateful variants.
- Prefer explicit runtime validation at trust boundaries.
- Prefer inference inside small local scopes and explicit annotations at exported or shared boundaries.

## Core Rules

### Type design

- Model states and variants with unions instead of optional-property soup.
- Use utility types sparingly and only when they clarify intent.
- Avoid deep type-level cleverness when a simple domain type would read better.

### Runtime boundaries

- Treat network data, filesystem data, environment variables, and parsed JSON as untrusted until validated.
- Narrow `unknown` with guards or validation helpers before use.
- Do not let compile-time confidence hide missing runtime checks.

### Code structure

- Keep types close to the feature or module that owns them.
- Extract shared types only when they are truly shared.
- Prefer readable named functions and objects over dense callback chains.

## Validation

- No new `any` escapes or unchecked casts were introduced without strong justification.
- External input is validated before domain logic uses it.
- Shared types are easy to locate and easy to understand.
- The resulting code remains readable to someone who did not write the types.