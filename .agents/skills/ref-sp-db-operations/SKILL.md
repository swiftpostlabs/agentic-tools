---
name: ref-sp-db-operations
description: "Running a database as a system of record: transaction boundaries and isolation, indexes and the optimizer, expand-migrate-contract migrations, rehearsed backup and restore, OLTP vs analytics. Use for slow queries, lock contention, migrations, or checking that backups restore."
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

What happens to a schema once it exists: transactions, concurrency, indexes, migrations, recovery.
Operations tunes what design chose; a fast query on a broken schema is still a bad design, so fix
that in `ref-sp-db-schema-design`. Store choice is `ref-sp-db-nosql`. Once topology is a design concern
rather than a deployment detail, use `ref-sp-db-distributed`; protection is `ref-sp-db-security`.

## Defaults

- Treat the database as a deliberate system boundary, not an interchangeable persistence detail.
- Assume concurrent access is normal, and plan for failure: bad migrations, partial writes, lock
  contention, replication lag, corruption, operator mistakes.

## Make transaction boundaries explicit

- Use transactions for multi-step writes that must preserve consistency across rows or tables.
- Name the ACID contract for important writes: atomicity, consistency, isolation, and durability
  should each have an owner in the DBMS or the application design.
- Choose isolation and locking behavior deliberately when the workload can produce races, lost
  updates, or inconsistent reads. Lock-based and timestamp-based approaches are both choices, not
  defaults.
- Design idempotent recovery paths for retries, especially around externally visible side effects.

## Treat indexes and storage as workload decisions

- Indexes, storage layout, replication, and materialized views support workload needs. They are not
  substitutes for a clear schema.
- Add indexes to serve real filters, joins, ordering, and uniqueness guarantees.
- Revisit indexes after schema or workload shifts instead of letting them accumulate blindly.
- Use materialized or replicated data for read performance only when the refresh and consistency
  costs are acceptable and written down.

## Let the optimizer do its job, and give it real inputs

- A query expresses *what* data is needed; the DBMS chooses the execution plan.
- Keep statistics current enough for the optimizer to make sane choices.
- Inspect query plans, join order, and predicate selectivity before adding ad hoc indexes or
  application-side workarounds.
- Use query tuning to support the model, never to excuse a broken one.

## Treat change as a first-class workflow

- Plan schema evolution, data migration, rollback, and recovery *before* applying production changes.
- On live systems, prefer expand-migrate-contract over a single-step breaking change.
- Keep migrations reversible, or at least decomposed into low-risk phases when the change is large.
- A migration that works on a small local dataset can still fail on production volume, lock
  duration, or rollback behavior. Test against realistic size.

## Treat recovery as a mechanism, not a promise

- Backups, logs, checkpoints, and a recovery manager are separate responsibilities; all of them need
  to exist in some form.
- Plan for main-memory loss, media failure, operator mistakes, software faults, and malicious
  corruption.
- State recovery goals as both a target steady state and an acceptable amount of lost work.
- Validate restore against realistic failure scenarios — a successful backup job proves nothing about
  restore.

## Keep transactional and analytical expectations apart

- Keep OLTP source-of-truth design distinct from analytical marts, cubes, or reporting models.
- Set reporting-performance expectations explicitly as data volume and aggregation levels grow.
- Keep data ownership, lineage, and freshness rules visible to maintainers even when the analytical
  layer hides them from analysts.
- Denormalized read models are an operational commitment: `ref-sp-db-schema-design` decides when one
  is justified; their refresh, invalidation, and repair rules are owned here.

## Gotchas

- Denormalized read models drift unless refresh, invalidation, or repair rules are explicit.
- Backups are incomplete protection if restore time, restore procedure, and consistency guarantees
  are unknown.
- ORM abstractions do not remove the need to understand transactions, constraints, locks, or indexes.
- Topology changes add failure modes and operational cost even when the logical schema is unchanged.
- Analytical reporting structures are not a substitute for transactional integrity in the source of
  truth.

## Before finishing

- Indexes and tuning follow the observed workload, not imagined worst cases.

## References

- Wikipedia Database: <https://en.wikipedia.org/wiki/Database>
- W3Schools Database Architecture: <https://www.w3schools.in/dbms/database-architecture>
- W3Schools DBMS Transaction: <https://www.w3schools.in/dbms/transaction>
- W3Schools DBMS Query: <https://www.w3schools.in/DBMS/query>
- W3Schools Data Recovery in DBMS: <https://www.w3schools.in/dbms/data-recovery-in-dbms>
