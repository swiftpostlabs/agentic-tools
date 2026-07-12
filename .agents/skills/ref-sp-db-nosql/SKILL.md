---
name: ref-sp-db-nosql
description: "Portable NoSQL guidance for choosing document, key-value, graph, or wide-column models, handling CAP and eventual-consistency tradeoffs, and modeling denormalized access patterns deliberately. Use when: relational joins stop matching the workload, horizontal scale or flexible schema dominates, or a distributed data model is being designed."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "db"
  shareable-skills.tags: "database, nosql"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-db-schema-design, ref-sp-db-distributed"
---

# NoSQL Databases

## Purpose

Provide portable defaults for deciding when non-relational databases fit better than a purely relational model and for designing their tradeoffs consciously.

## When to use this skill

- Choosing between relational and non-relational persistence for a new workload.
- Designing document, key-value, graph, or wide-column data models.
- Planning horizontally scaled or geographically distributed data systems.
- Reviewing denormalized schemas, duplication strategy, or eventual-consistency behavior.
- Deciding how a NoSQL store should coexist with a relational system of record.

## Scope boundaries

This skill owns the **store-choice decision** — relational, non-relational, or hybrid — and
non-relational modeling. Once the answer is "relational", hand off.

- `ref-sp-db-schema-design` — relational modeling, keys, constraints, and normalization.
- `ref-sp-db-operations` — transactions, indexing, recovery, and migration for whichever store wins.
- `ref-sp-db-distributed` — site topology, fragmentation, and replica placement. Distribution is a
  separate axis from the data model: distributed databases are not automatically NoSQL, and NoSQL
  systems are not automatically distributed.

## Defaults

- Choose the database model from access patterns, consistency needs, and operational constraints, not trend-following.
- Treat denormalization as a deliberate modeling technique in NoSQL, not as a failure to normalize.
- Keep stable identifiers so related data can still be correlated across documents, keys, or services.
- Make the consistency contract explicit: strong, bounded-staleness, or eventual consistency.
- Prefer hybrid architectures when one store handles transactional truth better and another handles scale, caching, search, or specialized reads better.

## Core Rules

### Match the model to the workload

- Use document databases when aggregates are naturally read and written as documents with flexible shape.
- Use key-value stores when access is primarily by identifier and the main need is fast lookup or caching.
- Use graph databases when relationships and traversals are the core query shape.
- Use wide-column or similar distributed models when throughput, partitioning, and access by known clustering patterns dominate.

### Own the distribution tradeoffs

- Distributed databases force tradeoffs between consistency, availability, and partition tolerance.
- If the system chooses availability and partition tolerance during faults, stale reads or delayed convergence must be acceptable.
- Eventual consistency is an application contract, not just a database feature flag.
- Design conflict detection or repair paths when multiple writers can touch overlapping data.

### Model duplication intentionally

- Duplicate data to satisfy read patterns, locality, or partition boundaries when it reduces operational or query cost.
- Document the source of truth for each duplicated fact.
- Define how duplicated data is refreshed, invalidated, reconciled, or rebuilt.
- Do not transplant a fully normalized relational design into a document store and expect it to remain a good fit.

### Keep boundaries clear in hybrid systems

- Use relational databases for transactions and strict integrity when those properties dominate.
- Use NoSQL stores for read scale, flexible aggregates, graph traversal, or partition-friendly workloads when those properties dominate.
- Be explicit about which system is authoritative for each fact.

## Gotchas

- Flexible schema does not remove the need for disciplined data contracts.
- Eventual consistency surprises downstream systems unless staleness and repair are expected in the design.
- Duplication without ownership rules creates silent drift.
- NoSQL is not automatically faster; it is only faster for the workloads its model serves well.
- Recreating joins manually in application code can be worse than using a relational database in the first place.

## Validation

- The chosen NoSQL model matches the actual query and write patterns.
- Consistency and partitioning tradeoffs are stated clearly.
- Duplicated data has a defined owner and reconciliation strategy.
- Hybrid architectures specify which store is authoritative for which facts.
- The design does not depend on hidden relational assumptions that the chosen store will not enforce.

## References

- Wikipedia: <https://en.wikipedia.org/wiki/Database>
- DigitalOcean: <https://www.digitalocean.com/community/tutorials/database-normalization>
