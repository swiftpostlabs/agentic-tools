---
name: ref-sp-js-next-template
description: "Planning a whole React + Next.js app: the baseline stack (App Router, strict TypeScript, Yarn), top-level structure, one composition root, and whether the job needs a full app at all. Use when scaffolding or reviewing a complete React/Next app."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "js"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "react, next"
  shareable-skills.requires: "ref-sp-js-react, ref-sp-js-next, ref-sp-js-typescript"
---

# React + Next App

App-level decisions only. Component and hook rules are `ref-sp-js-react`; App Router, `use client`,
metadata, and integrations are `ref-sp-js-next`; types are `ref-sp-js-typescript`. If the job can
stay a no-build browser tool, use `ref-sp-js-web-standalone-template` instead.

## Defaults

- Baseline: Next.js App Router, strict TypeScript, Yarn.
- One coherent UI system across the app; no mixed styling or component stacks.
- Decide early whether the app can stay static-friendly or genuinely needs server features.

## App baseline

- Keep the initial app baseline minimal instead of front-loading many optional libraries.

## Top-level structure

- Keep the top level small and feature-first: route tree, feature code, shared UI, and app shell in
  predictable separate areas.
- Designate one composition root — the root layout and its providers — as the place to wire app-wide singletons and context providers; keep ordinary feature modules import-inert so importing them does no work. See `ref-sp-js-react` and `ref-sp-js-next` for the per-request and `use client` specifics.
- Keep app-level ownership boundaries obvious before worrying about lower-level route or component refinements.
- Avoid leaving prototypes, migration scripts, or maintenance helpers inside the main app tree.

## Before finishing

- The choice of a full app over a standalone tool is justified, not habit.

## References

- Read `./references/checklist.md` for a quick whole-app review pass.
- Read `./references/app-stack.md` when choosing the app baseline and top-level structure.
