---
name: ref-sp-js-next-template
description: "App-level guidance for building a full React and Next.js application. Use when: scaffolding or reviewing a whole React/Next app, choosing the baseline stack and package manager, deciding app-level structure, or comparing a full app against a simpler standalone browser tool."
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

## Purpose

Provide app-level defaults for planning and reviewing a whole React and Next.js application without duplicating the lower-level framework guidance that belongs in `ref-sp-js-react`, `ref-sp-js-next`, and `ref-sp-js-typescript`.

## When to use this skill

- Scaffolding a new React and Next.js app.
- Reviewing whether an existing React and Next app has a coherent baseline stack and folder structure.
- Deciding whether a requirement deserves a full app or can stay a simpler standalone browser tool.
- Choosing app-level defaults such as package manager, TypeScript baseline, and top-level structure.

## Scope Boundaries

- Use this skill for whole-app setup, baseline stack decisions, and top-level app structure.
- Use `.agents/skills/ref-sp-js-react/SKILL.md` for component internals, hooks, local UI state, and general React dependency choices.
- Use `.agents/skills/ref-sp-js-next/SKILL.md` for App Router structure, client and server boundaries, framework integrations, and Next-specific library choices.
- Use `.agents/skills/ref-sp-js-typescript/SKILL.md` for strict type modeling, runtime boundaries, and `tsconfig` design.
- Use `.agents/skills/ref-sp-js-web-standalone-template/SKILL.md` when the requirement can stay a no-build browser app instead of becoming a full React and Next project.

## Defaults

- Prefer Next.js App Router plus strict TypeScript as the baseline for a whole React and Next app.
- Prefer Yarn for dependency management and script execution in Node-based React and Next apps.
- Keep the top-level app structure small and feature-first.
- Prefer one coherent UI system across the app instead of mixing multiple styling and component stacks.
- Decide early whether the app can stay static-friendly or genuinely needs server-dependent features.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Choose the app baseline | Set the package manager, framework baseline, and TypeScript level before feature work sprawls. | App-level drift becomes expensive once routes, components, and scripts are already spread across the repo. | When starting or re-baselining a React and Next app. | The app has one clear baseline stack and workflow. |
| Shape the top-level layout | Decide how routes, features, shared UI, and styles should be separated. | Whole apps get hard to navigate when route files, feature code, and shared UI all live at the same level. | When scaffolding or refactoring the app shell. | The main source tree has clear app-level ownership boundaries. |
| Compare app versus standalone | Judge whether the requirement truly needs React and Next or can stay a simpler browser app. | Full app infrastructure is expensive when the problem could stay no-build and local. | When the requested feature looks like a small tool or local utility. | The chosen app model matches the actual problem size. |

## Core Rules

### App baseline

- Make the package manager explicit and keep the Node-based workflow on Yarn consistently.
- Keep the initial app baseline minimal instead of front-loading many optional libraries.
- Let `ref-sp-js-react` and `ref-sp-js-next` own the detailed framework rules instead of copying them into this skill.

### Top-level structure

- Keep the route tree, feature code, shared UI, and app-shell code in predictable separate areas.
- Keep app-level ownership boundaries obvious before worrying about lower-level route or component refinements.
- Avoid leaving prototypes, migration scripts, or maintenance helpers inside the main app tree.

### Decision rules

- If the requirement is a local browser app that can stay framework-free, prefer `.agents/skills/ref-sp-js-web-standalone-template/SKILL.md` instead of escalating to a full app.
- If the question turns into component internals, hook design, or React dependency choices, load `.agents/skills/ref-sp-js-react/SKILL.md`.
- If the question turns into App Router, `use client`, metadata, or Next-specific integrations, load `.agents/skills/ref-sp-js-next/SKILL.md`.

## Validation

- The app baseline clearly names Next.js, TypeScript, and Yarn.
- The top-level layout separates routes, feature code, shared UI, and maintenance surfaces intentionally.
- The chosen app model is justified instead of using full app infrastructure by habit.
- Lower-level React, Next.js, and TypeScript guidance is sourced from the dedicated reference skills instead of being duplicated here.

## References

- Read `.agents/skills/ref-sp-js-react/SKILL.md` for component, hook, and React dependency guidance.
- Read `.agents/skills/ref-sp-js-next/SKILL.md` for App Router, rendering-boundary, and Next-specific integration guidance.
- Read `.agents/skills/ref-sp-js-typescript/SKILL.md` for strict TypeScript and runtime-boundary guidance.
- Read `.agents/skills/ref-sp-js-web-standalone-template/SKILL.md` when the feature may not need a full React and Next app.
- Read `./references/checklist.md` for a quick whole-app review pass.
- Read `./references/app-stack.md` when choosing the app baseline and top-level structure.
- Read `./assets/trigger-eval-queries.example.json` when testing trigger quality for app-level React and Next prompts.
- Review `./evals/evals.json` when validating output quality for app-level planning guidance.
