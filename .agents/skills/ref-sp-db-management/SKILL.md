---
name: ref-sp-db-management
description: "Portable database-management guidance for DBMS architecture, transactions, concurrency, storage, recovery, and operational safety. Use when: choosing how a system should store data, planning schema or storage changes, reviewing integrity and recovery guarantees, or tuning database-backed workloads."
license: MIT
metadata:
  owner-prefix: "sp"
  owner: "swiftpostlab/agentic-tools"
  scope: "db"
  visibility: "public"
---

# Database Management

## Purpose

Provide portable defaults for operating databases as durable systems of record, with explicit guidance for architecture, integrity, concurrency, recovery, storage, and controlled change.

## When to use this skill

- Choosing whether a workload should live in a relational database, a NoSQL store, or a hybrid architecture.
- Planning transactions, constraints, backup and restore, or migration workflows.
- Reviewing indexing, storage layout, read-write workload balance, or database tuning.
- Reviewing the overall operational posture for a database-backed system, including change, recovery, and ownership boundaries.
- Deciding how normalized source-of-truth tables relate to denormalized caches, marts, or read models.
- Reviewing web-facing database integration, DB-backed application boundaries, or browser-accessible database workflows.
- Separating transactional source-of-truth needs from analytical or OLAP-style reporting expectations.

## Defaults

- Treat the database as a deliberate system boundary, not as an interchangeable persistence detail.
- Distinguish the database environment from the DBMS itself: hardware, software, people, procedures, and data all affect reliability.
- Model data, keys, and constraints before tuning indexes or storage structures.
- Make multi-step writes transactional when they must succeed or fail as a unit.
- Prefer normalized source-of-truth storage for transactional systems, then add denormalized read models only for measured workload reasons.
- Plan for failures explicitly: bad migrations, partial writes, lock contention, replication lag, corruption, and operator mistakes.
- Keep backup and restore workflows rehearsed, not theoretical.
- Optimize for the observed workload and access pattern, not for imagined worst cases.
- Treat web integration as an application boundary around the DBMS, not as permission for clients to bypass access control, transaction handling, or vendor portability.
- For analytical or OLAP workloads, define multidimensional views, data-source transparency, reporting performance, and aggregation expectations separately from OLTP schema design.

## Core Rules

### Understand the system architecture before tuning it

- Distinguish external or view schemas, conceptual or logical schemas, and internal or physical schemas.
- Preserve data independence: physical changes should not break conceptual models, and conceptual changes should minimize impact on user-facing views.
- Separate decisions about what the data means from decisions about how the DBMS stores or serves it.
- Choose centralized, client-server, parallel, or distributed deployment intentionally instead of inheriting topology by accident.

### Treat web DBMS integration as a boundary design

- Keep browser, web server, application logic, and DBMS responsibilities distinct in multi-tier systems.
- Prefer standards-based, vendor-portable connectivity when a web application may need to change DBMS, browser, server, or integration technology later.
- Preserve DBMS features through the web layer: transactions, constraints, authorization, auditing, and recovery should still apply.
- Design request flows that can handle transactions spanning more than one HTTP request without leaving partial writes or hidden session state.
- Keep administration overhead, scalability, and interoperability explicit instead of assuming a web interface makes the database simpler.

### Model and constrain first

- Start by defining the data the system must preserve, the relationships it must enforce, and the invariants that must remain true.
- Put integrity rules in the database when the database can enforce them reliably, such as primary keys, foreign keys, uniqueness, and check constraints.
- Use application code to complement database rules, not to replace them.

### Make transaction boundaries explicit

- Use transactions for multi-step writes that must preserve consistency across several rows or tables.
- Name the ACID contract for important writes: atomicity, consistency, isolation, and durability should each have an owner in the DBMS or application design.
- Assume concurrent access is normal, not exceptional.
- Choose isolation and locking behavior deliberately when the workload can create races, lost updates, or inconsistent reads.
- Use lock-based or timestamp-based approaches deliberately when the system must coordinate simultaneous writers.
- Design idempotent recovery paths for retries, especially around distributed or externally visible side effects.

### Separate operational concerns from query design

- Indexes, storage layout, replication, and materialized views are operational choices that support workload needs; they are not substitutes for clear schema design.
- Add indexes to support real filters, joins, ordering, and uniqueness guarantees.
- Revisit indexes after schema or workload shifts instead of letting them accumulate blindly.
- Use materialized or replicated data to support read performance only when the refresh and consistency costs are acceptable.

### Treat optimization as a DBMS responsibility with real inputs

- Remember that high-level queries express what data is needed; the DBMS is responsible for choosing an efficient execution plan.
- Keep database statistics current enough for the optimizer to make sane choices.
- Inspect query plans, join order, predicate selectivity, and decomposition before adding ad hoc indexes or application-side workarounds.
- Use query tuning to support the model, not to excuse a broken schema.

### Separate transactional and analytical expectations

- Keep OLTP source-of-truth design distinct from analytical cubes, marts, or reporting models.
- For OLAP-style tools, define multidimensional business views, dimensions, hierarchy and aggregation behavior, sparse-data handling, and cross-dimensional operations explicitly.
- Set reporting-performance expectations as dimensions, data volume, and aggregation levels grow.
- Make accessibility to heterogeneous sources transparent to analysts without hiding data ownership, lineage, or freshness rules from maintainers.
- Require multi-user support, flexible reporting, and intuitive analysis workflows only where the workload is truly analytical.

### Treat change as a first-class workflow

- Plan schema evolution, data migration, rollback, and recovery before applying production changes.
- Keep migration steps reversible or at least decomposed into low-risk phases when the change is large.
- Prefer expand-migrate-contract sequences over single-step breaking changes for live systems.
- Validate backup and restore against realistic failure scenarios, not just successful backup creation.

### Choose topology deliberately and hand off distributed concerns explicitly

- Choose centralized, client-server, parallel, or distributed deployment intentionally instead of inheriting topology by accident.
- Use `ref-sp-db-distributed` when fragmentation, replica placement, local or global application behavior, or disconnected synchronization become first-class design concerns.
- Do not let topology decisions hide recovery, security, or migration responsibilities.

### Keep security explicit and delegated appropriately

- Database security depends on the DBMS, operating system, network, procedures, and human access patterns, not only SQL privileges.
- Use `ref-sp-db-security` when threat modeling, authorization models, views, auditing, encryption, or secure backup handling become first-class design concerns.
- Do not treat access control, recovery artifacts, or administrative procedures as separate from database operations.

### Treat recovery as a concrete mechanism, not a promise

- Backups, logs, checkpoints, and a recovery manager are separate responsibilities and should all exist in some form.
- Plan for main-memory loss, media failure, operator mistakes, software faults, and malicious corruption.
- Recovery goals should name both the target steady state and the acceptable amount of lost work.

## Gotchas

- A fast query on a broken schema is still a bad design.
- Denormalized read models drift unless refresh, invalidation, or repair rules are explicit.
- Backups are incomplete protection if restore time, restore procedure, and consistency guarantees are unknown.
- Topology changes add failure modes and operational cost even when the logical schema stays the same.
- ORM abstractions do not remove the need to understand transactions, constraints, locks, or indexing.
- A migration that works on a small local dataset can still fail on production volume, lock duration, or rollback behavior.
- A web interface does not remove the need for transaction design, authorization, vendor portability, or explicit DBMS boundaries.
- OLAP-friendly reporting structures are not replacements for transactional integrity in the source-of-truth schema.

## Validation

- The DBMS architecture, schema layers, and deployment topology are explicit enough to reason about change and failure.
- The system's source-of-truth store, constraints, and transactional boundaries are explicit.
- Recovery expectations include both backup creation and restore verification.
- Indexing and storage choices correspond to actual workload patterns.
- If sensitive data or privileged access is in scope, the design delegates database-specific protection and auditing details to a dedicated security review.
- If the system is distributed or replicated, the design delegates fragmentation, sync, and locality decisions to a dedicated distributed-data review instead of hand-waving them.
- Schema and data changes have a staged migration path instead of a hand-waved one-step rewrite.
- Web-facing database flows preserve DBMS guarantees across the application boundary and do not expose direct data access casually.
- Analytical or OLAP requirements state dimensions, aggregations, source transparency, reporting performance, and freshness separately from OLTP requirements.

## References

- Wikipedia: <https://en.wikipedia.org/wiki/Database>
- W3Schools DBMS Introduction: <https://www.w3schools.in/dbms/intro>
- W3Schools Database Architecture: <https://www.w3schools.in/dbms/database-architecture>
- W3Schools Data Recovery in DBMS: <https://www.w3schools.in/dbms/data-recovery-in-dbms>
- W3Schools DBMS Transaction: <https://www.w3schools.in/dbms/transaction>
- W3Schools DBMS Query: <https://www.w3schools.in/DBMS/query>
- W3Schools Web-based Database Management System: <https://www.w3schools.in/dbms/web-based-database-management-system>
- W3Schools Codd's 12 Rules for DBMS / OLAP tools: <https://www.w3schools.in/dbms/codds-rules>
