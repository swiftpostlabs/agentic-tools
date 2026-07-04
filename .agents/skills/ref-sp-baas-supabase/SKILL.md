---
name: ref-sp-baas-supabase
description: "Portable Supabase guidance for CLI workflows, migrations, supabase-js CRUD usage, Edge Functions, and ORM boundaries. Use when: initializing Supabase, evolving schema, designing CRUD paths, writing Edge Functions, or deciding how ORMs fit with Supabase."
license: MIT
metadata:
  owner-prefix: "sp"
  owner: "swiftpostlab/agentic-tools"
  scope: "baas"
  visibility: "public"
  tags: "supabase, backend"
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

- Use the Supabase CLI as the operational backbone for local and remote workflows, migration history, and function deployment.
- Keep the `supabase/` directory, config, migrations, functions, and tests explicit and versioned.
- Generate database types after schema changes and feed them into typed clients.
- Use publishable keys in browser or other unprivileged clients, and keep secret or service-role keys only in trusted server code or Edge Functions.
- Treat `supabase-js` calls as deliberate PostgREST or Data API requests: place `select()` before filters on reads, place modifiers after filters, and add `.select()` to mutations when you need modified rows back.
- Keep privileged logic in trusted server code or Edge Functions, not in browser clients.
- Treat Edge Functions as small Deno-based integration points, not as a monolith.
- If the team wants an ORM and has not already chosen one, prefer Drizzle as the default Supabase pairing.
- In Deno-owned repos, prefer a `deno task` that invokes `./node_modules/supabase/bin/supabase` with `nodeModulesDir: "auto"` and `allowScripts.allow: ["npm:supabase"]` when the direct `deno run npm:supabase` path is brittle.

## Task Framing

| Command or action | What | Why | When | Expected outcome |
| --- | --- | --- | --- | --- |
| Initialize local workflow | Use `supabase init`, `start`, `stop`, and `status` to own the local stack deliberately. | Local development is much easier when the CLI, config, and containers stay aligned. | When starting or reviewing a Supabase project. | The local stack is reproducible and observable. |
| Evolve schema safely | Use migrations, diffs, resets, generated types, and drift repair as one workflow. | Schema drift and stale generated types are common causes of runtime bugs. | Whenever tables, policies, or RPCs change. | Migration history, local schema, generated types, and remote promotion stay aligned. |
| Design CRUD API | Use typed `supabase-js` reads, mutations, and `rpc()` with filters, modifiers, pagination, and explicit key choice. | Many app bugs come from wrong chaining order, unbounded selects, or privileged keys in the wrong place. | When building browser, server, or Edge Function data access. | CRUD flows stay typed, bounded, and RLS-aware. |
| Build Edge Functions | Create, serve, deploy, and secure functions through the CLI and secrets workflow. | Edge Functions mix privileged logic, external integrations, and deployment concerns. | When adding webhooks, privileged endpoints, or background integrations. | Functions stay small, testable, and safe to deploy. |
| Recover migration drift | Use `migration list`, `migration repair`, and a deliberate `db pull` or `db push` path to reconcile history. | History drift tempts teams into manual fixes that make later deploys worse. | When local and remote migration history disagree. | Migration history becomes explicit and safe to continue from. |
| Decide ORM boundary | Choose whether `supabase-js` is enough or whether an ORM adds real value. | Split-brain schema ownership is one of the easiest ways to make Supabase projects brittle. | When introducing Drizzle, Prisma, or another ORM. | One clear schema authority owns migrations and platform boundaries stay intact. |

## Core Rules

### CLI and local workflow

- Start with `supabase init` to create the local project structure.
- Use `supabase start`, `supabase stop`, and `supabase status` for local stack control.
- Use `supabase db lint`, `supabase test db`, and targeted `supabase inspect db ...` commands when validating SQL or debugging locks, bloat, vacuum, or long-running queries.
- Link explicitly with `supabase link` before remote workflows like `db pull`, `db push`, or project-level management.
- Use `supabase gen types` after schema changes so application code can stay type-safe.
- In Deno-owned repos, wrap the CLI in a `deno task` and call the installed binary path when needed; this is a practical workaround for Supabase package postinstall behavior that may not play well with direct `deno run npm:supabase` execution.

### Database and migration flow

- Treat migrations as a source of truth, not as disposable artifacts.
- Prefer a local-first schema loop: create or capture a migration with `migration new` or `db diff -f`, replay it with `db reset`, and then regenerate types.
- Use `db push --dry-run` before applying remote changes when the blast radius is not trivial.
- Use `db pull` only for remote-originated changes. It creates a local migration file and can update the remote migration history to match the pulled state.
- When local and remote history drift, inspect it with `migration list` and repair it with `migration repair` rather than editing migration metadata manually.
- Remember that `migration squash` only preserves schema structure. Data mutations, cron jobs, storage buckets, and vault secrets need manual follow-up.
- Keep schema, seed, and test concerns separate enough that resets remain predictable.

### Client architecture and CRUD API

- Before exposing Data API access to client roles, enable RLS, add the required policies, and expose only the tables and functions the client must reach.
- Use `createClient(url, publishableKey)` for browser or unprivileged clients.
- For trusted server-side clients, disable browser session behaviors that do not apply, such as automatic refresh or URL session detection.
- Do not leak service-role or secret keys into browser code.
- In read query chains, call `select()` before row filters.
- `insert()`, `update()`, `upsert()`, and `delete()` do not return modified rows unless you chain `.select()`.
- `update()` and `delete()` should always be combined with filters, and `delete()` under RLS only removes rows that are visible to a `SELECT` or `ALL` policy.
- Apply modifiers such as `order()`, `limit()`, `range()`, `single()`, and `maybeSingle()` after filters.
- Use pagination deliberately because Supabase projects return at most 1,000 rows by default.
- Use `rpc()` for database functions. If the function returns a table response, you can still apply filters and modifiers; use `overrideTypes()` when cross-schema inference falls short.
- Supply generated database types to the client with `createClient<Database>(...)`, and let generated `Row`, `Insert`, and `Update` types drive your data layer.

### Edge Functions

- Treat Edge Functions as Deno-based, TypeScript-first endpoints for webhooks, integrations, validation, and privileged server logic.
- Create locally with `supabase functions new`, run with `supabase functions serve`, and deploy with `supabase functions deploy`.
- Manage environment-specific values through `supabase secrets` rather than hardcoding them.
- Use `supabase functions serve` inspector flags when you need debugger-attached local execution.
- Invoke client-facing functions through `supabase.functions.invoke()` or a thin server wrapper rather than leaking privileged credentials into app code.
- Keep each function focused and explicit about its input, auth expectations, and side effects.

### ORM boundaries

- Supabase is Postgres-first, so ORMs can fit, but only with a clear ownership model.
- If the team wants an ORM and has not chosen one already, start with Drizzle because Supabase documents it directly and it keeps the schema close to typed SQL instead of hiding Postgres behind a heavier abstraction.
- If you adopt Drizzle with the shared pooler and `postgres.js`, follow the Supabase guide and disable prepared statements with `prepare: false` for transaction pool mode.
- Pick one migration authority for schema changes. Do not let Supabase SQL migrations and ORM-managed migrations drift independently.
- If Drizzle is only a trusted server query layer, keep Supabase CLI migrations authoritative and let the ORM focus on domain queries.
- If the ORM will own migrations, stop generating competing Supabase SQL migrations and document that boundary explicitly.
- If you plan to rely solely on Drizzle instead of the Supabase Data API, turning off the Data API is an explicit architectural choice, not a default.
- Use an ORM for domain modeling or server-side query composition when it helps, but keep Supabase platform features such as auth, storage, realtime, and row-level security in the architecture.
- Prefer `supabase-js` plus generated database types when the ORM would add more abstraction than value, especially in browser or RLS-centric paths.

## Gotchas

- Service-role or secret keys do not belong in browser code.
- Data API access is not automatic. Exposed tables or functions, RLS, and client-role permissions must line up.
- Generated database types must be refreshed after schema changes or client code drifts from reality.
- Query order matters: put `select()` before filters on reads, and put modifiers after filters.
- Mutation methods do not return changed rows unless you chain `.select()`.
- `db diff` can miss some changes, including publications, storage buckets, and views with `security_invoker`.
- `migration squash` omits data manipulation, cron jobs, storage buckets, and encrypted vault secrets.
- `delete()` under RLS can appear to do nothing if no `SELECT` or `ALL` policy makes the target rows visible.
- In server environments without storage, auth defaults can log session persistence warnings unless you disable `persistSession` or provide a storage implementation.
- In Deno-managed repos, direct `deno run npm:supabase` is not always the most stable path because the Supabase package relies on install-time behavior; when that happens, use a `deno task` that calls `./node_modules/supabase/bin/supabase` instead.
- Supabase migrations and ORM-managed migrations must not compete for schema authority.

## Validation

- The local stack and remote link flow are explicit.
- Schema changes regenerate types, replay locally, and stay aligned with migration history.
- Migration drift has a deliberate inspection and repair path.
- CRUD calls show the right key choice, `select()` or filter ordering, pagination, and returned-row expectations.
- Browser clients never hold privileged keys.
- Edge Functions are small, focused, debug or deploy cleanly, and use secrets correctly.
- ORM usage has a clear boundary, connection mode, and migration authority.

## References

- Supabase LLM Reference: <https://supabase.com/llms.txt>
- Supabase CLI Reference: <https://supabase.com/docs/reference/cli/introduction>
- Supabase JavaScript Reference: <https://supabase.com/docs/reference/javascript/introduction>
- Supabase Functions Guide: <https://supabase.com/docs/guides/functions>
- Supabase Drizzle Guide: <https://supabase.com/docs/guides/database/drizzle>
- Read `./references/checklist.md` for a quick Supabase review pass.
- Read `./assets/trigger-eval-queries.example.json` when checking trigger quality for Supabase platform requests.
- Review `./evals/evals.json` when validating output quality for CLI, schema, or Edge Function guidance.
