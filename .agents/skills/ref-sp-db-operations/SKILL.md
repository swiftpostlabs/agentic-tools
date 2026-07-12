---
name: ref-sp-db-operations
description: "Portable guidance for running a database as a durable system of record: transaction boundaries and ACID, concurrency and isolation, indexing and storage, query optimization, backup and recovery, and safe schema migration. Use when: planning transactions or isolation levels, diagnosing lock contention or a slow query, choosing or pruning indexes, planning a migration or rollback, or reviewing whether backups actually restore."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "db"
  shareable-skills.tags: "database, operations"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-db-schema-design, ref-sp-db-distributed, ref-sp-db-security"
---

# Database Operations

## Purpose

Keep a database trustworthy in production: correct under concurrency, fast enough for the real
workload, recoverable after failure, and changeable without breaking. This skill owns **what happens
to a schema once it exists**.

It does not own the schema itself. Designing it is `ref-sp-db-schema-design`.

## When to use this skill

- Planning transaction boundaries, isolation levels, or concurrency behavior.
- Diagnosing lock contention, lost updates, inconsistent reads, or a slow query.
- Choosing, justifying, or pruning indexes and storage layout.
- Planning a schema migration, its rollback, and its behavior at production volume.
- Reviewing whether backup and restore actually work, and how much work a failure may lose.
- Separating transactional (OLTP) expectations from analytical (OLAP) reporting expectations.

## Scope boundaries

- `ref-sp-db-schema-design` — entities, keys, constraints, normalization, and the physical design
  choices that flow from the model. Operations *tunes* what design *chose*. A fast query on a broken
  schema is still a bad design: fix it there, not here.
- `ref-sp-db-nosql` — whether the workload belongs in a relational store at all.
- `ref-sp-db-distributed` — fragmentation, replica placement, local vs global applications, and
  disconnected sync. Reach for it the moment topology becomes a first-class design concern rather
  than a deployment detail.
- `ref-sp-db-security` — threat modeling, authorization, views as exposure control, auditing,
  encryption, and secure handling of backups and logs.

## Defaults

- Treat the database as a deliberate system boundary, not an interchangeable persistence detail.
- Make multi-step writes transactional when they must succeed or fail as a unit.
- Assume concurrent access is normal, not exceptional.
- Optimize for the observed workload and access pattern, not for imagined worst cases.
- Plan for failure explicitly: bad migrations, partial writes, lock contention, replication lag,
  corruption, and operator mistakes.
- Keep backup *and restore* rehearsed, not theoretical.
- Prefer expand-migrate-contract over single-step breaking changes on live systems.

## Core rules

### Make transaction boundaries explicit

- Use transactions for multi-step writes that must preserve consistency across rows or tables.
- Name the ACID contract for important writes: atomicity, consistency, isolation, and durability
  should each have an owner in the DBMS or the application design.
- Choose isolation and locking behavior deliberately when the workload can produce races, lost
  updates, or inconsistent reads. Lock-based and timestamp-based approaches are both choices, not
  defaults.
- Design idempotent recovery paths for retries, especially around externally visible side effects.

### Treat indexes and storage as workload decisions

- Indexes, storage layout, replication, and materialized views support workload needs. They are not
  substitutes for a clear schema.
- Add indexes to serve real filters, joins, ordering, and uniqueness guarantees.
- Revisit indexes after schema or workload shifts instead of letting them accumulate blindly.
- Use materialized or replicated data for read performance only when the refresh and consistency
  costs are acceptable and written down.

### Let the optimizer do its job, and give it real inputs

- A query expresses *what* data is needed; the DBMS chooses the execution plan.
- Keep statistics current enough for the optimizer to make sane choices.
- Inspect query plans, join order, and predicate selectivity before adding ad hoc indexes or
  application-side workarounds.
- Use query tuning to support the model, never to excuse a broken one.

### Treat change as a first-class workflow

- Plan schema evolution, data migration, rollback, and recovery *before* applying production changes.
- Keep migrations reversible, or at least decomposed into low-risk phases when the change is large.
- A migration that works on a small local dataset can still fail on production volume, lock
  duration, or rollback behavior. Test against realistic size.

### Treat recovery as a mechanism, not a promise

- Backups, logs, checkpoints, and a recovery manager are separate responsibilities; all of them need
  to exist in some form.
- Plan for main-memory loss, media failure, operator mistakes, software faults, and malicious
  corruption.
- State recovery goals as both a target steady state and an acceptable amount of lost work.
- Validate restore against realistic failure scenarios — a successful backup job proves nothing about
  restore.

### Keep transactional and analytical expectations apart

- Keep OLTP source-of-truth design distinct from analytical marts, cubes, or reporting models.
- Set reporting-performance expectations explicitly as data volume and aggregation levels grow.
- Keep data ownership, lineage, and freshness rules visible to maintainers even when the analytical
  layer hides them from analysts.
- Denormalized read models are an operational commitment: `ref-sp-db-schema-design` decides when one
  is justified; their refresh, invalidation, and repair rules are owned here.

## Gotchas

- A fast query on a broken schema is still a bad design.
- Denormalized read models drift unless refresh, invalidation, or repair rules are explicit.
- Backups are incomplete protection if restore time, restore procedure, and consistency guarantees
  are unknown.
- ORM abstractions do not remove the need to understand transactions, constraints, locks, or indexes.
- Topology changes add failure modes and operational cost even when the logical schema is unchanged.
- Analytical reporting structures are not a substitute for transactional integrity in the source of
  truth.

## Validation

- Transactional boundaries and the source-of-truth store are explicit.
- Isolation and locking choices match the concurrency the workload actually produces.
- Indexing and storage choices correspond to observed workload patterns, not guesses.
- Recovery expectations cover restore verification, not just backup creation.
- Schema and data changes have a staged migration path rather than a hand-waved one-step rewrite.
- If the system is distributed or replicated, fragmentation, sync, and locality are delegated to a
  distributed-data review instead of hand-waved.
- If sensitive data or privileged access is in scope, protection and auditing are delegated to a
  security review.
- Analytical requirements state aggregation, freshness, and lineage separately from OLTP ones.

## References

- Wikipedia Database: <https://en.wikipedia.org/wiki/Database>
- W3Schools Database Architecture: <https://www.w3schools.in/dbms/database-architecture>
- W3Schools DBMS Transaction: <https://www.w3schools.in/dbms/transaction>
- W3Schools DBMS Query: <https://www.w3schools.in/DBMS/query>
- W3Schools Data Recovery in DBMS: <https://www.w3schools.in/dbms/data-recovery-in-dbms>
