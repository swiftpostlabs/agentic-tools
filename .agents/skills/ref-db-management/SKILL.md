---
name: ref-db-management
description: "Portable database-management guidance for DBMS architecture, transactions, concurrency, storage, recovery, and operational safety. Use when: choosing how a system should store data, planning schema or storage changes, reviewing integrity and recovery guarantees, or tuning database-backed workloads."
metadata:
  agentic-tools-category: "db"
  shareable-skills.visibility: "shareable"
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

## Defaults

- Treat the database as a deliberate system boundary, not as an interchangeable persistence detail.
- Distinguish the database environment from the DBMS itself: hardware, software, people, procedures, and data all affect reliability.
- Model data, keys, and constraints before tuning indexes or storage structures.
- Make multi-step writes transactional when they must succeed or fail as a unit.
- Prefer normalized source-of-truth storage for transactional systems, then add denormalized read models only for measured workload reasons.
- Plan for failures explicitly: bad migrations, partial writes, lock contention, replication lag, corruption, and operator mistakes.
- Keep backup and restore workflows rehearsed, not theoretical.
- Optimize for the observed workload and access pattern, not for imagined worst cases.

## Core Rules

### Understand the system architecture before tuning it

- Distinguish external or view schemas, conceptual or logical schemas, and internal or physical schemas.
- Preserve data independence: physical changes should not break conceptual models, and conceptual changes should minimize impact on user-facing views.
- Separate decisions about what the data means from decisions about how the DBMS stores or serves it.
- Choose centralized, client-server, parallel, or distributed deployment intentionally instead of inheriting topology by accident.

### Model and constrain first

- Start by defining the data the system must preserve, the relationships it must enforce, and the invariants that must remain true.
- Put integrity rules in the database when the database can enforce them reliably, such as primary keys, foreign keys, uniqueness, and check constraints.
- Use application code to complement database rules, not to replace them.

### Make transaction boundaries explicit

- Use transactions for multi-step writes that must preserve consistency across several rows or tables.
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

### Treat change as a first-class workflow

- Plan schema evolution, data migration, rollback, and recovery before applying production changes.
- Keep migration steps reversible or at least decomposed into low-risk phases when the change is large.
- Prefer expand-migrate-contract sequences over single-step breaking changes for live systems.
- Validate backup and restore against realistic failure scenarios, not just successful backup creation.

### Choose topology deliberately and hand off distributed concerns explicitly

- Choose centralized, client-server, parallel, or distributed deployment intentionally instead of inheriting topology by accident.
- Use `ref-db-distributed` when fragmentation, replica placement, local or global application behavior, or disconnected synchronization become first-class design concerns.
- Do not let topology decisions hide recovery, security, or migration responsibilities.

### Keep security explicit and delegated appropriately

- Database security depends on the DBMS, operating system, network, procedures, and human access patterns, not only SQL privileges.
- Use `ref-db-security` when threat modeling, authorization models, views, auditing, encryption, or secure backup handling become first-class design concerns.
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

## Validation

- The DBMS architecture, schema layers, and deployment topology are explicit enough to reason about change and failure.
- The system's source-of-truth store, constraints, and transactional boundaries are explicit.
- Recovery expectations include both backup creation and restore verification.
- Indexing and storage choices correspond to actual workload patterns.
- If sensitive data or privileged access is in scope, the design delegates database-specific protection and auditing details to a dedicated security review.
- If the system is distributed or replicated, the design delegates fragmentation, sync, and locality decisions to a dedicated distributed-data review instead of hand-waving them.
- Schema and data changes have a staged migration path instead of a hand-waved one-step rewrite.

## References

- Wikipedia: <https://en.wikipedia.org/wiki/Database>
- W3Schools DBMS Introduction: <https://www.w3schools.in/dbms/intro>
- W3Schools Database Architecture: <https://www.w3schools.in/dbms/database-architecture>
- W3Schools Data Recovery in DBMS: <https://www.w3schools.in/dbms/data-recovery-in-dbms>
*** Add File: c:\Users\fcole\Projects\agentic-tools\.agents\skills\ref-db-security\SKILL.md
---
name: ref-db-security
description: "Portable database-security guidance for threats, access control, views, auditing, encryption, integrity, and secure recovery. Use when: protecting database-backed systems, designing authorization models, reviewing confidentiality, integrity, or availability risks, or securing backups, logs, and administrative access."
metadata:
  agentic-tools-category: "db"
  shareable-skills.visibility: "shareable"
---

# Database Security

## Purpose

Provide portable defaults for protecting databases as socio-technical systems where confidentiality, integrity, availability, and privacy depend on more than SQL permissions alone.

## When to use this skill

- Designing or reviewing database access-control models, roles, and privileges.
- Protecting sensitive datasets, regulated data, or administrative interfaces.
- Deciding how to use views, auditing, encryption, integrity controls, or secure recovery workflows.
- Reviewing how backups, logs, replicas, exports, and operational tooling expose database data.
- Building a database threat model that includes accidental damage as well as malicious misuse.

## Defaults

- Treat database security as a combination of confidentiality, integrity, availability, and privacy, not as authentication alone.
- Assume the DBMS is only as secure as the surrounding operating system, network, procedures, and human controls.
- Grant the narrowest privileges that still let each user, service, or operator do its job.
- Prefer role separation and controlled access paths over broad direct table access.
- Treat backups, logs, replicas, exports, and recovery artifacts as sensitive data, not as harmless copies.
- Pair preventive controls with detection, auditability, and tested recovery paths.

## Core Rules

### Start from threats and risk, not from vendor features

- Identify both intentional and accidental threats, including theft, fraud, misuse, privacy loss, corruption, hardware failure, and loss of availability.
- Decide which datasets require confidentiality, integrity, availability, or privacy most strongly.
- Include insiders, operators, applications, infrastructure failures, and physical media exposure in the threat model.
- Match controls to realistic business damage rather than applying every feature uniformly.

### Control access explicitly

- Grant and revoke privileges deliberately instead of relying on default broad access.
- Separate application roles, read-only users, administrators, and auditors so each path has only the permissions it needs.
- Use discretionary access control when object owners can safely manage sharing, and mandatory access control when centrally enforced classification rules are required.
- Restrict privileged utilities and direct administrative access as tightly as ordinary data access.

### Reduce exposure with views, boundaries, and integrity controls

- Use views, stored interfaces, masking, or row and column restrictions to minimize direct exposure of underlying tables.
- Enforce integrity rules in the database so unauthorized or malformed changes cannot silently corrupt trusted data.
- Encrypt sensitive data at rest and in transit, and keep key management separated from routine application access.
- Treat redundancy technologies such as RAID as availability controls, not as substitutes for confidentiality or authorization.

### Audit and recover securely

- Log meaningful access, schema changes, privileged actions, and failed authorization attempts when the workload needs accountability.
- Protect audit logs from tampering and uncontrolled retention.
- Keep backup copies, log files, and restore media in secure locations with controlled access.
- Recovery plans should restore the latest consistent state without bypassing the normal protection model.

### Treat procedures and people as part of the design

- Define onboarding, offboarding, credential rotation, incident response, and emergency access procedures.
- Limit direct production access and make break-glass paths explicit, monitored, and reviewable.
- Patch and harden the DBMS, operating system, drivers, and adjacent tooling together instead of assuming the database can be secured in isolation.
- Test restore and incident procedures so security controls still hold during failures.

## Gotchas

- Database permissions alone do not secure exported files, backups, replicas, or logs.
- Encryption without good key management or role design is incomplete protection.
- Backups improve recovery but also expand the attack surface if they are copied broadly or stored carelessly.
- Views reduce exposure but do not replace least privilege or auditing.
- Security designs that ignore operations, people, or the surrounding host environment are brittle.

## Validation

- The design names the major confidentiality, integrity, availability, and privacy risks for the database.
- Roles, privileges, and administrative paths are explicit enough to verify least privilege.
- Views, auditing, encryption, and integrity controls match the sensitivity of the stored data.
- Backups, logs, replicas, and exports receive the same security attention as primary tables.
- Incident response and restore procedures preserve both availability and access control expectations.

## References

- W3Schools Database Security: <https://www.w3schools.in/dbms/database-security>
- W3Schools Data Recovery in DBMS: <https://www.w3schools.in/dbms/data-recovery-in-dbms>
- W3Schools Database Architecture: <https://www.w3schools.in/dbms/database-architecture>
- Wikipedia: <https://en.wikipedia.org/wiki/Database>
*** Add File: c:\Users\fcole\Projects\agentic-tools\.agents\skills\ref-db-distributed\SKILL.md
---
name: ref-db-distributed
description: "Portable distributed-database guidance for fragmentation, replica placement, local and global applications, parallel DBMS topologies, and disconnected synchronization. Use when: designing distributed or replicated databases, choosing site layout, planning mobile or intermittently connected data flows, or separating topology decisions from data-model decisions."
metadata:
  agentic-tools-category: "db"
  shareable-skills.visibility: "shareable"
---

# Distributed Databases

## Purpose

Provide portable defaults for designing databases that span multiple sites, processors, or intermittently connected clients without confusing topology with data model.

## When to use this skill

- Choosing between centralized, client-server, parallel, or distributed database deployment.
- Planning fragmentation, allocation, replication, or locality for major datasets.
- Designing local and global application paths across multiple database sites.
- Supporting mobile, offline-capable, or intermittently connected workflows.
- Reviewing whether distribution is justified by geography, autonomy, availability, throughput, or disconnected work.

## Defaults

- Treat distribution as a topology decision separate from relational versus NoSQL modeling.
- Keep one logical data model even when fragments or replicas are physically spread across sites.
- Start from data ownership, latency, failure domains, and required cross-site transactions before choosing fragmentation or replication.
- Prefer local processing for local workloads, and make global operations explicit and narrower.
- Replicate data only when availability, read locality, or disconnected work justify the synchronization cost.
- Define synchronization, freshness, and reconciliation rules before allowing disconnected or multi-site writes.

## Core Rules

### Separate logical design from physical placement

- Keep the distributed system understandable as one logical database even when data is fragmented or replicated across sites.
- Choose fragmentation boundaries based on access locality, autonomy, and failure domains rather than arbitrary organizational charts.
- Allocate fragments and replicas deliberately to sites based on who uses the data, who administers it, and what must remain available during failures.
- Make transparency goals explicit: decide which applications can ignore location, fragmentation, or replication details and which cannot.

### Distinguish local and global applications

- Local applications should complete against local data whenever the business rules allow it.
- Global applications must make remote dependencies, distributed joins, and cross-site failure handling explicit.
- Limit chatty cross-site transactions; prefer coarser workflows or asynchronous coordination when business rules permit it.
- Decide which invariants are enforced locally versus globally instead of assuming every rule must be synchronous everywhere.

### Use replication for concrete reasons

- Replicate for availability, read scaling, disconnected operation, or geographic locality, not because it sounds safer in the abstract.
- Choose full versus partial replication based on access frequency, storage cost, and update churn.
- Document the propagation model and freshness expectations: synchronous, near-real-time, batch, or manual reconciliation.
- Plan conflict detection and resolution whenever more than one site can update the same replicated fact.

### Design for failure and local autonomy

- Assume site failures and network partitions are normal distributed events, not rare edge cases.
- Define what each site can continue to do independently when peers are unreachable.
- Be explicit about degraded modes, queued writes, and what happens when reconnection reveals conflicts.
- Monitor replication lag, queue growth, link health, and cross-site recovery paths as first-class operational signals.

### Choose parallel architecture intentionally when scale is the real driver

- Distinguish a distributed DBMS across multiple sites from a parallel DBMS that uses multiple processors or disks to accelerate one system.
- Understand the tradeoffs among shared-memory, shared-disk, and shared-nothing parallel architectures.
- Avoid introducing cross-site coordination when a parallel deployment solves the actual throughput problem more simply.

### Treat mobile and intermittent clients as distributed peers

- Decide what data is downloaded, what can be created or edited offline, and how uploads are validated on reconnect.
- Design synchronization units for limited bandwidth and short-lived connections instead of assuming permanent sessions.
- Treat mobile replication metadata, retry behavior, and conflict repair as part of the database design, not as UI glue.

## Gotchas

- Distribution improves locality and availability for some workloads, but it also adds consistency, debugging, and operational complexity.
- Replication without freshness contracts or ownership rules creates silent drift.
- Distributed databases are not automatically NoSQL systems, and NoSQL systems are not automatically geographically distributed.
- A logically clean schema can still perform badly if fragmentation and site placement ignore workload locality.
- Offline support fails when synchronization and conflict repair are left as post-launch cleanup.

## Validation

- The design states why distribution exists: geography, autonomy, availability, throughput, disconnected work, or another concrete driver.
- Fragmentation, allocation, and replication rules are documented for the important datasets.
- Local and global application paths are explicit enough to reason about latency, failure, and integrity.
- Synchronization, freshness, and conflict-handling expectations are defined before multi-site writes go live.
- The design names the relevant architecture style clearly enough to distinguish centralized, client-server, parallel, and distributed concerns.

## References

- W3Schools Distributed DBMS: <https://www.w3schools.in/dbms/distributed-dbms>
- W3Schools Database Replication: <https://www.w3schools.in/dbms/database-replication>
- W3Schools Mobile Databases: <https://www.w3schools.in/dbms/mobile-databases>
- W3Schools Database Architecture: <https://www.w3schools.in/dbms/database-architecture>
- Wikipedia: <https://en.wikipedia.org/wiki/Database>
