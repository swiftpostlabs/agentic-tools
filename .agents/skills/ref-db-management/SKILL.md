---
name: ref-db-management
description: "Portable database-management guidance for DBMS responsibilities, transactions, concurrency, storage, recovery, migration, and operational safety. Use when: choosing how a system should store data, planning schema or storage changes, reviewing integrity and recovery guarantees, or tuning database-backed workloads."
metadata:
  agentic-tools-category: "db"
  shareable-skills.visibility: "shareable"
---

# Database Management

## Purpose

Provide portable defaults for operating databases as durable systems of record, with explicit guidance for integrity, concurrency, recovery, storage, and controlled change.

## When to use this skill

- Choosing whether a workload should live in a relational database, a NoSQL store, or a hybrid architecture.
- Planning transactions, constraints, backup and restore, replication, or migration workflows.
- Reviewing indexing, storage layout, read-write workload balance, or database tuning.
- Designing security, access-control, auditing, or failure-recovery expectations for database-backed systems.
- Deciding how normalized source-of-truth tables relate to denormalized caches, marts, or read models.

## Defaults

- Treat the database as a deliberate system boundary, not as an interchangeable persistence detail.
- Model data, keys, and constraints before tuning indexes or storage structures.
- Make multi-step writes transactional when they must succeed or fail as a unit.
- Prefer normalized source-of-truth storage for transactional systems, then add denormalized read models only for measured workload reasons.
- Plan for failures explicitly: bad migrations, partial writes, lock contention, replication lag, corruption, and operator mistakes.
- Keep backup and restore workflows rehearsed, not theoretical.
- Optimize for the observed workload and access pattern, not for imagined worst cases.

## Core Rules

### Model and constrain first

- Start by defining the data the system must preserve, the relationships it must enforce, and the invariants that must remain true.
- Put integrity rules in the database when the database can enforce them reliably, such as primary keys, foreign keys, uniqueness, and check constraints.
- Use application code to complement database rules, not to replace them.

### Make transaction boundaries explicit

- Use transactions for multi-step writes that must preserve consistency across several rows or tables.
- Assume concurrent access is normal, not exceptional.
- Choose isolation and locking behavior deliberately when the workload can create races, lost updates, or inconsistent reads.
- Design idempotent recovery paths for retries, especially around distributed or externally visible side effects.

### Separate operational concerns from query design

- Indexes, storage layout, replication, and materialized views are operational choices that support workload needs; they are not substitutes for clear schema design.
- Add indexes to support real filters, joins, ordering, and uniqueness guarantees.
- Revisit indexes after schema or workload shifts instead of letting them accumulate blindly.
- Use materialized or replicated data to support read performance only when the refresh and consistency costs are acceptable.

### Treat change as a first-class workflow

- Plan schema evolution, data migration, rollback, and recovery before applying production changes.
- Keep migration steps reversible or at least decomposed into low-risk phases when the change is large.
- Prefer expand-migrate-contract sequences over single-step breaking changes for live systems.
- Validate backup and restore against realistic failure scenarios, not just successful backup creation.

### Make security operational

- Grant the narrowest database privileges that still support the application.
- Log meaningful access and change events when the workload needs auditability.
- Protect sensitive data with encryption, role separation, and controlled access paths.
- Treat administrative access, secrets, and emergency procedures as part of the database design, not as follow-up work.

## Gotchas

- A fast query on a broken schema is still a bad design.
- Denormalized read models drift unless refresh, invalidation, or repair rules are explicit.
- Backups are incomplete protection if restore time, restore procedure, and consistency guarantees are unknown.
- Replication improves availability and scale, but introduces lag, failure modes, and operational complexity.
- ORM abstractions do not remove the need to understand transactions, constraints, locks, or indexing.
- A migration that works on a small local dataset can still fail on production volume, lock duration, or rollback behavior.

## Validation

- The system's source-of-truth store, constraints, and transactional boundaries are explicit.
- Recovery expectations include both backup creation and restore verification.
- Indexing and storage choices correspond to actual workload patterns.
- Security design specifies who can read, write, administer, and audit the data.
- Schema and data changes have a staged migration path instead of a hand-waved one-step rewrite.

## References

- Wikipedia: <https://en.wikipedia.org/wiki/Database>
- W3Schools DBMS Introduction: <https://www.w3schools.in/dbms/intro>
