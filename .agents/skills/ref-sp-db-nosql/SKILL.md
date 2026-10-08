---
name: ref-sp-db-nosql
description: "Choosing relational vs document, key-value, graph, or wide-column stores, and designing NoSQL deliberately: CAP trade-offs, explicit consistency, owned duplication, hybrid systems. Use when picking a database model or reviewing a NoSQL design."
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

The store-choice decision and non-relational modeling. Once the answer is relational, use
`ref-sp-db-schema-design`; transactions, indexing, and recovery for any store are
`ref-sp-db-operations`; site topology is `ref-sp-db-distributed` (distribution is a separate axis:
distributed isn't automatically NoSQL, and NoSQL isn't automatically distributed).

## Defaults

- Choose the model from access patterns, consistency needs, and operational constraints, not trends.
- Keep stable identifiers so related data can still be correlated across documents, keys, or services.
- State the consistency contract: strong, bounded staleness, or eventual.

## Match the model to the workload

- Use document databases when aggregates are naturally read and written as documents with flexible shape.
- Use key-value stores when access is primarily by identifier and the main need is fast lookup or caching.
- Use graph databases when relationships and traversals are the core query shape.
- Use wide-column or similar distributed models when throughput, partitioning, and access by known clustering patterns dominate.

## Own the distribution tradeoffs

- Distributed databases force tradeoffs between consistency, availability, and partition tolerance.
- If the system chooses availability and partition tolerance during faults, stale reads or delayed convergence must be acceptable.
- Eventual consistency is an application contract, not just a database feature flag.
- Design conflict detection or repair paths when multiple writers can touch overlapping data.

## Model duplication intentionally

- Duplicate data to satisfy read patterns, locality, or partition boundaries when it reduces operational or query cost.
- Document the source of truth for each duplicated fact.
- Define how duplicated data is refreshed, invalidated, reconciled, or rebuilt.
- Do not transplant a fully normalized relational design into a document store and expect it to remain a good fit.

## Keep boundaries clear in hybrid systems

- Use relational databases for transactions and strict integrity when those properties dominate.
- Use NoSQL stores for read scale, flexible aggregates, graph traversal, or partition-friendly workloads when those properties dominate.
- Be explicit about which system is authoritative for each fact.

## Gotchas

- Flexible schema does not remove the need for disciplined data contracts.
- Eventual consistency surprises downstream systems unless staleness and repair are expected in the design.
- Duplication without ownership rules creates silent drift.
- NoSQL is not automatically faster; it is only faster for the workloads its model serves well.
- Recreating joins manually in application code can be worse than using a relational database in the first place.

## Before finishing

- Nothing in the design relies on a relational guarantee (a join, a constraint) the chosen store won't
  enforce.

## References

- Wikipedia: <https://en.wikipedia.org/wiki/Database>
- DigitalOcean: <https://www.digitalocean.com/community/tutorials/database-normalization>
