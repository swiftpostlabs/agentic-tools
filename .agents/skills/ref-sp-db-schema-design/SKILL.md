---
name: ref-sp-db-schema-design
description: "Designing a relational schema from requirements: fact-finding, ER/EER model, normalization (functional dependencies, 3NF/BCNF), then physical design from the workload. Use when starting a schema, decomposing a wide table, or deciding how far to normalize or denormalize."
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

Relational design end to end. Whether to be relational at all is `ref-sp-db-nosql`; transactions,
indexing, and migrations are `ref-sp-db-operations` (physical design *chooses* indexes; operations
*tunes* them); topology is `ref-sp-db-distributed`; access control is `ref-sp-db-security`.

## Defaults

- Keep the conceptual model DBMS-independent as long as practical, and expect iteration.
- Make keys and constraints explicit in the database rather than relying on application discipline.

## Work the phases in order

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

## Model the domain explicitly

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

## Normalize by dependency, not by aesthetics

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

## Before finishing

- The point where normalization stops is justified by the workload, not by habit.

## References

- `./references/methodology.md` — the design lifecycle: fact-finding, conceptual, logical, physical,
  documentation, and iteration.
- `./references/relational-modeling.md` — ER/EER modeling, schema layers and data independence,
  relational algebra and calculus, query-language roles, and the ORM boundary.
- `./references/normalization.md` — normal forms, functional dependencies, decomposition, and
  denormalization tradeoffs.
