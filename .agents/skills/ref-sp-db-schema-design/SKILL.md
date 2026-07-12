---
name: ref-sp-db-schema-design
description: "Portable guidance for designing a relational schema end to end: fact-finding and mission scope, conceptual ER/EER modeling, logical derivation and normalization, and physical design driven by the workload. Use when: starting a schema from requirements, turning business rules into entities, keys, and relationships, decomposing a wide table or reviewing functional dependencies and normal forms, deciding how far to normalize or when to denormalize, or reviewing whether a design skipped straight to implementation."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "db"
  shareable-skills.tags: "database, modeling"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-db-nosql, ref-sp-db-operations"
---

# Relational Schema Design

## Purpose

Design a relational schema as a lifecycle — requirements, conceptual model, logical model,
physical model — instead of a pile of ad hoc table edits. This skill owns **what the data means and
how it is shaped**: entities, relationships, keys, constraints, dependencies, and normal forms.

It does not own what happens once the schema exists. Running it is `ref-sp-db-operations`; choosing
a non-relational store instead is `ref-sp-db-nosql`.

## When to use this skill

- Starting a database-backed system from stakeholder requirements.
- Turning business rules into entities, relationships, keys, and cardinality.
- Decomposing a wide or repetitive table, or reviewing insertion/update/deletion anomalies.
- Deciding whether a schema should stop at 3NF, move to BCNF, or stay denormalized.
- Refactoring a schema that no longer matches business terminology or workflows.
- Reviewing whether a design skipped conceptual or logical steps and jumped to implementation.

## Scope boundaries

- `ref-sp-db-nosql` — whether the workload should be relational at all, and non-relational modeling.
  Come back here once the answer is "relational".
- `ref-sp-db-operations` — transactions, concurrency, indexing, the optimizer, recovery, and
  migrations. Physical design *chooses* indexes; operations *tunes* them.
- `ref-sp-db-distributed` — fragmentation, replica placement, and site topology. Keep one logical
  model here; distribution is a separate axis.
- `ref-sp-db-security` — access control, views-as-exposure-control, auditing, and encryption.

## Defaults

- Start with fact-finding and mission clarity before drawing tables.
- Treat conceptual, logical, and physical design as separate phases with separate decisions.
- Keep the conceptual model independent of the target DBMS as long as practical.
- Make keys and constraints explicit in the database instead of relying on application discipline.
- Normalize transactional source-of-truth schemas through 3NF by default; use BCNF when 3NF still
  leaves determinant-driven redundancy.
- Validate the normalized model against the required transactions before optimizing physical storage.
- Normalize first; denormalize only when measured read patterns justify the maintenance cost.
- Expect iteration. Schema design is rarely right in one pass.

## Core rules

### Work the phases in order

- **Fact-finding**: define what the system is for, who it serves, the enterprise vocabulary, and the
  prioritized transactions it must support. Use more than one source — forms alone preserve the
  flaws of the current system.
- **Conceptual**: model entities, relationships, attributes, domains, and constraints without tying
  them to storage or vendor features. Review it with users before treating it as stable.
- **Logical**: derive relations, normalize them, and validate against the required transactions.
  Normalized does not automatically mean usable.
- **Physical**: choose file organization, indexes, views, and storage from the logical design and
  the real workload. Physical decisions optimize the model; they must not distort it.

Full phase-by-phase method, fact-finding techniques, and the data-dictionary discipline:
`./references/methodology.md`.

### Model the domain explicitly

- Identify entities, attributes, relationships, and cardinality before writing SQL.
- Make one-to-one, one-to-many, and many-to-many relationships explicit; model many-to-many with a
  real join table.
- Treat optionality and ownership as design decisions, not accidental nullability.
- Choose surrogate keys only when they simplify the design more than natural or composite keys do —
  and never let them replace a real uniqueness constraint.
- Keep schema, instance, and view distinct: the schema is the blueprint, the instance is a snapshot,
  a view is a projection. Do not let one report dictate the whole structure.

ER/EER notation, generalization and aggregation, relational algebra and calculus, the DDL/DML/DCL/TCL
split, and the ORM boundary: `./references/relational-modeling.md`.

### Normalize by dependency, not by aesthetics

- Normalization exists to kill insertion, update, and deletion anomalies by making each fact live in
  one place. Split tables because dependencies demand it, not because smaller tables look tidier.
- 3NF is the working default; BCNF when a determinant is not a superkey. 4NF and 5NF are real but
  rarely the right daily target.
- Decompose losslessly, and carry keys and foreign keys through so integrity survives the refactor.
- Denormalize only on purpose, and document how the duplicated data is refreshed, invalidated, or
  repaired. A denormalized table can look simpler while quietly multiplying update risk.

Normal forms with worked reasoning, functional dependencies, and decomposition rules:
`./references/normalization.md`.

## Gotchas

- Designing tables directly from screens, reports, or API payloads usually skips the real conceptual
  model.
- Lists embedded in a single column — comma-separated or JSON — usually signal a missing relation,
  and trade away integrity, not just elegance.
- A normalized model users cannot map back to their workflows is unfinished, not finished.
- Jumping to physical optimization before logical validation makes later fixes expensive.
- A fast query on a broken schema is still a bad design.
- Over-normalization can make common reads harder if the workload never needed the decomposition.

## Validation

- The design has an explicit mission, scope, and fact-finding record.
- Conceptual, logical, and physical decisions are distinguishable from each other.
- The schema reflects the domain's entities, relationships, and cardinality clearly.
- Keys and constraints are explicit and enforceable in the database.
- Each table stores one kind of fact; the anomalies that motivated any refactor are gone.
- The stopping point for normalization is justified by workload, not habit.
- The model still supports the required transactions after decomposition.
- Any denormalized structure has an explicit refresh or consistency plan.

## References

- `./references/methodology.md` — the design lifecycle: fact-finding, conceptual, logical, physical,
  documentation, and iteration.
- `./references/relational-modeling.md` — ER/EER modeling, schema layers and data independence,
  relational algebra and calculus, query-language roles, and the ORM boundary.
- `./references/normalization.md` — normal forms, functional dependencies, decomposition, and
  denormalization tradeoffs.
