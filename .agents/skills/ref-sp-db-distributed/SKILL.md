---
name: ref-sp-db-distributed
description: "Distributed and replicated database topology: fragmentation and replica placement, local vs global applications, failure and autonomy, parallel vs distributed DBMS, and offline mobile sync. Use when designing where data lives across sites or how replicas stay consistent."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "db"
  shareable-skills.visibility: "public"
---

# Distributed Databases

Topology: where data physically sits and how sites coordinate. The logical model is
`ref-sp-db-schema-design` (one model however many sites hold it); relational vs not is
`ref-sp-db-nosql`; what happens within a site is `ref-sp-db-operations`; securing replicas and links
is `ref-sp-db-security`.

## Separate logical design from physical placement

- Keep the distributed system understandable as one logical database even when data is fragmented or replicated across sites.
- Choose fragmentation boundaries based on access locality, autonomy, and failure domains rather than arbitrary organizational charts.
- Allocate fragments and replicas deliberately to sites based on who uses the data, who administers it, and what must remain available during failures.
- Make transparency goals explicit: decide which applications can ignore location, fragmentation, or replication details and which cannot.

## Distinguish local and global applications

- Local applications should complete against local data whenever the business rules allow it.
- Global applications must make remote dependencies, distributed joins, and cross-site failure handling explicit.
- Limit chatty cross-site transactions; prefer coarser workflows or asynchronous coordination when business rules permit it.
- Decide which invariants are enforced locally versus globally instead of assuming every rule must be synchronous everywhere.

## Use replication for concrete reasons

- Replicate for availability, read scaling, disconnected operation, or geographic locality, not because it sounds safer in the abstract.
- Choose full versus partial replication based on access frequency, storage cost, and update churn.
- Document the propagation model and freshness expectations: synchronous, near-real-time, batch, or manual reconciliation.
- Plan conflict detection and resolution whenever more than one site can update the same replicated fact.

## Design for failure and local autonomy

- Assume site failures and network partitions are normal distributed events, not rare edge cases.
- Define what each site can continue to do independently when peers are unreachable.
- Be explicit about degraded modes, queued writes, and what happens when reconnection reveals conflicts.
- Monitor replication lag, queue growth, link health, and cross-site recovery paths as first-class operational signals.

## Choose parallel architecture intentionally when scale is the real driver

- Distinguish a distributed DBMS across multiple sites from a parallel DBMS that uses multiple processors or disks to accelerate one system.
- Understand the tradeoffs among shared-memory, shared-disk, and shared-nothing parallel architectures.
- Avoid introducing cross-site coordination when a parallel deployment solves the actual throughput problem more simply.

## Treat mobile and intermittent clients as distributed peers

- Decide what data is downloaded, what can be created or edited offline, and how uploads are validated on reconnect.
- Design synchronization units for limited bandwidth and short-lived connections instead of assuming permanent sessions.
- Treat mobile replication metadata, retry behavior, and conflict repair as part of the database design, not as UI glue.

## Gotchas

- Distribution improves locality and availability for some workloads, but it also adds consistency, debugging, and operational complexity.
- Replication without freshness contracts or ownership rules creates silent drift.
- Distributed databases are not automatically NoSQL systems, and NoSQL systems are not automatically geographically distributed.
- A logically clean schema can still perform badly if fragmentation and site placement ignore workload locality.
- Offline support fails when synchronization and conflict repair are left as post-launch cleanup.

## Before finishing

- The architecture style in play is named: centralized, client-server, parallel, or distributed.
- The design states the concrete reason distribution exists (geography, autonomy, availability,
  throughput, disconnected work).

## References

- W3Schools Distributed DBMS: <https://www.w3schools.in/dbms/distributed-dbms>
- W3Schools Database Replication: <https://www.w3schools.in/dbms/database-replication>
- W3Schools Mobile Databases: <https://www.w3schools.in/dbms/mobile-databases>
- W3Schools Database Architecture: <https://www.w3schools.in/dbms/database-architecture>
- Wikipedia: <https://en.wikipedia.org/wiki/Database>
