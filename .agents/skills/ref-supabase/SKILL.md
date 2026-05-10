---
name: ref-supabase
description: "Portable Supabase guidance for CLI workflows, schema and migration flow, supabase-js usage, Edge Functions, and ORM boundaries. Use when: initializing Supabase, working on local or remote workflows, writing Edge Functions, or deciding how ORMs fit with Supabase."
metadata:
  shareable-skills.visibility: "shareable"
---

# Supabase

## Purpose

Provide portable defaults for working with Supabase across local development, remote project management, client usage, Edge Functions, and database evolution.

## When to use this skill

- Initializing or linking a Supabase project.
- Working on local stack, migrations, or database workflows.
- Writing or deploying Supabase Edge Functions.
- Using `@supabase/supabase-js` in browser or trusted server contexts.
- Deciding how an ORM should coexist with Supabase.

## Defaults

- Use the Supabase CLI as the operational backbone for local and remote workflows.
- Keep the `supabase/` directory, config, migrations, functions, and tests explicit and versioned.
- Generate database types after schema changes and feed them into client code.
- Keep privileged logic in trusted server code or Edge Functions, not in browser clients.
- Treat Edge Functions as small Deno-based integration points, not as a monolith.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Initialize local workflow | Use `supabase init`, `start`, `stop`, and `status` to own the local stack deliberately. | Local development is much easier when the CLI, config, and containers stay aligned. | When starting or reviewing a Supabase project. | The local stack is reproducible and observable. |
| Evolve schema safely | Use migrations, diffs, resets, and generated types as one workflow. | Schema drift and stale generated types are common causes of runtime bugs. | Whenever tables, policies, or RPCs change. | Migration history, local schema, and generated types stay aligned. |
| Build Edge Functions | Create, serve, deploy, and secure functions through the CLI and secrets workflow. | Edge Functions mix privileged logic, external integrations, and deployment concerns. | When adding webhooks, privileged endpoints, or background integrations. | Functions stay small, testable, and safe to deploy. |
| Decide ORM boundary | Choose whether `supabase-js` is enough or whether an ORM adds real value. | Split-brain schema ownership is one of the easiest ways to make Supabase projects brittle. | When introducing Drizzle, Prisma, or another ORM. | One clear schema authority owns migrations and platform boundaries stay intact. |

## Core Rules

### CLI and local workflow

- Start with `supabase init` to create the local project structure.
- Use `supabase start`, `supabase stop`, and `supabase status` for local stack control.
- Link explicitly with `supabase link` before remote workflows like `db pull`, `db push`, or project-level management.
- Use `supabase gen types` after schema changes so application code can stay type-safe.

### Database and migration flow

- Treat migrations as a source of truth, not as disposable artifacts.
- Use commands like `db diff`, `migration new`, `db push`, `db pull`, and `db reset` intentionally rather than mixing ad hoc manual schema changes into the workflow.
- Keep schema, seed, and test concerns separate enough that resets remain predictable.

### Client architecture

- Use `createClient(url, publishableKey)` for browser or unprivileged clients.
- For trusted server-side clients, disable browser session behaviors that do not apply, such as automatic refresh or URL session detection.
- In query chains, call `select()` before row filters, and apply modifiers after filters.
- Do not leak service-role or secret keys into browser code.

### Edge Functions

- Treat Edge Functions as Deno-based, TypeScript-first endpoints for webhooks, integrations, validation, and privileged server logic.
- Create locally with `supabase functions new`, run with `supabase functions serve`, and deploy with `supabase functions deploy`.
- Manage environment-specific values through `supabase secrets` rather than hardcoding them.
- Keep each function focused and explicit about its input, auth expectations, and side effects.

### ORM boundaries

- Supabase is Postgres-first, so ORMs can fit, but only with a clear ownership model.
- Pick one migration authority for schema changes. Do not let Supabase SQL migrations and ORM-managed migrations drift independently.
- Use an ORM for domain modeling or server-side query composition when it helps, but keep Supabase platform features such as auth, storage, realtime, and row-level security in the architecture.
- Prefer `supabase-js` plus generated database types when the ORM would add more abstraction than value.

## Gotchas

- Service-role or secret keys do not belong in browser code.
- Generated database types must be refreshed after schema changes or client code drifts from reality.
- Supabase migrations and ORM-managed migrations must not compete for schema authority.

## Validation

- The local stack and remote link flow are explicit.
- Schema changes regenerate types and stay aligned with migration history.
- Browser clients never hold privileged keys.
- Edge Functions are small, focused, and use secrets correctly.
- ORM usage has a clear boundary and does not create schema split-brain.

## References

- Read `./references/checklist.md` for a quick Supabase review pass.
- Read `./assets/trigger-eval-queries.example.json` when checking trigger quality for Supabase platform requests.
- Review `./evals/evals.json` when validating output quality for CLI, schema, or Edge Function guidance.
