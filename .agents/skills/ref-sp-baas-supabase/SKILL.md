---
name: ref-sp-baas-supabase
description: "Building on Supabase: CLI-driven local stack and migrations, generated types, supabase-js CRUD ordering and keys, RLS, Edge Functions, migration drift repair, and ORM boundaries (Drizzle). Use when setting up, changing schema, writing data access, or deploying functions on Supabase."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "baas"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "supabase, backend"
---

# Supabase

Supabase the product. It is Postgres underneath: design the schema in `ref-sp-db-schema-design`, then
ship it through Supabase migrations. Whether the authorization model is sound is `ref-sp-db-security`
(this skill covers how Supabase expresses it); migration safety as a database concern is
`ref-sp-db-operations`; the calling frontend is `ref-sp-js-next` / `ref-sp-js-react`.

## CLI and local workflow

- Start with `supabase init` to create the local project structure.
- Use `supabase start`, `supabase stop`, and `supabase status` for local stack control.
- Use `supabase db lint`, `supabase test db`, and targeted `supabase inspect db ...` commands when validating SQL or debugging locks, bloat, vacuum, or long-running queries.
- Link explicitly with `supabase link` before remote workflows like `db pull`, `db push`, or project-level management.
- Use `supabase gen types` after schema changes so application code can stay type-safe.
- In Deno-owned repos, `deno run npm:supabase` is unreliable because the package depends on
  postinstall behaviour. Set `nodeModulesDir: "auto"` and `allowScripts.allow: ["npm:supabase"]`,
  then run `./node_modules/supabase/bin/supabase` from a `deno task` (general npm-CLI guidance: `ref-sp-js-deno`).
- Keep the `supabase/` directory (config, migrations, functions, tests) explicit and versioned.

## Database and migration flow

- Treat migrations as a source of truth, not as disposable artifacts.
- Prefer a local-first schema loop: create or capture a migration with `migration new` or `db diff -f`, replay it with `db reset`, and then regenerate types.
- Use `db push --dry-run` before applying remote changes when the blast radius is not trivial.
- Use `db pull` only for remote-originated changes. It creates a local migration file and can update the remote migration history to match the pulled state.
- When local and remote history drift, inspect it with `migration list` and repair it with `migration repair` rather than editing migration metadata manually.
- Remember that `migration squash` only preserves schema structure. Data mutations, cron jobs, storage buckets, and vault secrets need manual follow-up.
- Keep schema, seed, and test concerns separate enough that resets remain predictable.

## Client architecture and CRUD API

- Before exposing Data API access to client roles, enable RLS, add the required policies, and expose only the tables and functions the client must reach.
- Use `createClient(url, publishableKey)` for browser or unprivileged clients.
- For trusted server-side clients, disable browser session behaviors that do not apply, such as automatic refresh or URL session detection.
- Never put service-role or secret keys in browser code; privileged logic lives in trusted server
  code or Edge Functions.
- In read query chains, call `select()` before row filters.
- `insert()`, `update()`, `upsert()`, and `delete()` do not return modified rows unless you chain `.select()`.
- `update()` and `delete()` should always be combined with filters, and `delete()` under RLS only removes rows that are visible to a `SELECT` or `ALL` policy.
- Apply modifiers such as `order()`, `limit()`, `range()`, `single()`, and `maybeSingle()` after filters.
- Use pagination deliberately because Supabase projects return at most 1,000 rows by default.
- Use `rpc()` for database functions. If the function returns a table response, you can still apply filters and modifiers; use `overrideTypes()` when cross-schema inference falls short.
- Supply generated database types to the client with `createClient<Database>(...)`, and let generated `Row`, `Insert`, and `Update` types drive your data layer.

## Edge Functions

- Treat Edge Functions as Deno-based, TypeScript-first endpoints for webhooks, integrations, validation, and privileged server logic.
- Create locally with `supabase functions new`, run with `supabase functions serve`, and deploy with `supabase functions deploy`.
- Manage environment-specific values through `supabase secrets` rather than hardcoding them.
- Use `supabase functions serve` inspector flags when you need debugger-attached local execution.
- Invoke client-facing functions through `supabase.functions.invoke()` or a thin server wrapper rather than leaking privileged credentials into app code.
- Keep each function focused and explicit about its input, auth expectations, and side effects.

## ORM boundaries

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

- `db diff` can miss some changes, including publications, storage buckets, and views with `security_invoker`.
- In server environments without storage, auth defaults can log session persistence warnings unless you disable `persistSession` or provide a storage implementation.

## Before finishing

- Migration history, local schema, generated types, and the remote project agree.

## References

- Supabase LLM Reference: <https://supabase.com/llms.txt>
- Supabase CLI Reference: <https://supabase.com/docs/reference/cli/introduction>
- Supabase JavaScript Reference: <https://supabase.com/docs/reference/javascript/introduction>
- Supabase Functions Guide: <https://supabase.com/docs/guides/functions>
- Supabase Drizzle Guide: <https://supabase.com/docs/guides/database/drizzle>
- Read `./references/checklist.md` for a quick Supabase review pass.
