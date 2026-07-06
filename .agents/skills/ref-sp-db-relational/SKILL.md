---
name: ref-sp-db-relational
description: "Portable relational-database guidance for ER and EER modeling, schema layers, keys, joins, relational algebra and calculus, and SQL-oriented schema design. Use when: designing tables, translating business rules into schema, reviewing joins and constraints, or deciding whether a relational model fits the problem."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "db"
  shareable-skills.visibility: "public"
---

# Relational Databases

## Purpose

Provide portable defaults for designing and reasoning about relational databases, from conceptual modeling through schema layers, joins, constraints, and query structure.

## When to use this skill

- Turning a domain model into tables, keys, and relationships.
- Reviewing entity-relationship diagrams, cardinality, and join structure.
- Translating conceptual models into relational schemas without collapsing logical and physical concerns.
- Choosing primary keys, foreign keys, uniqueness rules, or many-to-many representations.
- Explaining or rewriting SQL in terms of relational reasoning.
- Deciding how much schema ownership should stay in the database versus an ORM.

## Defaults

- Start from entities, relationships, cardinality, and business rules before writing SQL.
- Keep schema, instance, and view concerns distinct: a schema is the blueprint, an instance is a snapshot, and user views are projections of the model.
- Make keys and constraints explicit instead of relying on application discipline.
- Model many-to-many relationships with an explicit join table.
- Prefer declarative queries that express the desired result, not procedural row-by-row assembly.
- Use relational algebra and relational calculus concepts to reason about correctness even when the implementation language is SQL.
- Keep the database schema authoritative; an ORM may help with queries, but it should not erase relational structure.

## Core Rules

### Model the domain explicitly

- Use entity-relationship thinking first: identify entities, attributes, relationships, and cardinality.
- Make one-to-one, one-to-many, and many-to-many relationships explicit in the schema.
- Treat optionality and ownership as design decisions, not accidental nullability.
- Use enhanced ER concepts when the domain needs them: specialization or generalization for superclass and subclass hierarchies, and aggregation for whole-part relationships.
- Choose surrogate keys only when they simplify the design more than natural or composite keys would.

### Keep schema layers and data independence explicit

- Distinguish physical, logical, and view schemas when reviewing or evolving a relational system.
- Aim for physical data independence so storage and access-path changes do not force conceptual redesign.
- Aim for logical data independence so conceptual refinements have limited impact on user-facing views.
- Do not let one reporting or UI view dictate the entire relational structure.

### Use constraints to preserve meaning

- Primary keys identify rows.
- Foreign keys preserve relationships across tables.
- Unique constraints protect candidate keys and business-meaningful identifiers.
- Check constraints should encode simple invariants that the database can verify cheaply and clearly.

### Reason with relational operations

- Selection filters rows.
- Projection keeps only needed attributes.
- Union and difference combine or compare compatible relations.
- Cartesian product is mainly a stepping stone for joins, not a result you usually want directly.
- Joins combine relations according to matching predicates; if the join predicate is vague, the model is probably vague too.
- Rename exists to keep expressions unambiguous when the same relation or attribute role appears multiple times.
- Relational algebra is procedural and helps reason about how a result can be formed from relations.
- Relational calculus is declarative and helps reason about what tuples or domains satisfy a predicate.

### Keep query languages tied to their role

- Use DDL for schema structure, DML for reading and updating rows, DCL for privileges, and TCL for transaction boundaries.
- Keep privilege design and transaction control close to the relational model instead of treating them as unrelated operational afterthoughts.
- Remember that SQL is one concrete language family built on top of relational ideas, not the theory itself.

### Keep SQL close to the model

- Design tables so common queries reflect real relationships instead of compensating for modeling mistakes.
- Prefer clear joins and predicates over magical ORM defaults that hide cardinality or duplicate rows.
- Do not push referential meaning into string parsing, embedded lists, or opaque blobs when the data is relational.
- Views can present business-friendly shapes without giving up the normalized underlying model.
- Query processing starts by decomposing high-level queries into lower-level relational operations and then optimizing execution strategy; write queries so that this remains tractable.

### Keep ORMs subordinate to the schema

- Let the database own keys, constraints, and join semantics.
- Use the ORM to reduce repetitive query code, not to replace relational thinking.
- Review generated queries when performance or correctness matters.
- If the ORM model and the database schema disagree, fix the boundary instead of compensating with ad hoc application logic.

## Gotchas

- A table-per-screen design often mirrors UI convenience rather than domain truth.
- Lists embedded in a single column usually signal a missing relation.
- Many-to-many relationships become hard to validate if the join table is hidden or skipped.
- Treating schema, instance, and view as interchangeable concepts usually makes refactors and performance work harder.
- Generalization, specialization, and aggregation are modeling tools, not excuses to hide unclear entity boundaries.
- ORM relationships can hide N+1 queries, duplicate joins, or incorrect nullability assumptions.
- Surrogate keys are useful, but they do not eliminate the need to protect real-world uniqueness.

## Validation

- The schema reflects the domain's entities, relationships, and cardinality clearly.
- Schema, instance, and user-view concerns are not collapsed into one layer.
- Keys and constraints are explicit and enforceable.
- Common queries can be expressed with straightforward joins and predicates.
- Many-to-many and optional relationships are modeled intentionally.
- ORM usage does not obscure the underlying relational rules.

## References

- Wikipedia: <https://en.wikipedia.org/wiki/Database>
- W3Schools Relation Data Model: <https://www.w3schools.in/dbms/relation-data-model>
- W3Schools Data Schemas: <https://www.w3schools.in/dbms/data-schemas>
- W3Schools Data Independence: <https://www.w3schools.in/dbms/data-independence>
- W3Schools ER Model: <https://www.w3schools.in/dbms/er-model>
- W3Schools Generalization Aggregation: <https://www.w3schools.in/dbms/generalization-aggregation>
- W3Schools Relational Algebra: <https://www.w3schools.in/dbms/relational-algebra>
- W3Schools Relational Calculus: <https://www.w3schools.in/dbms/relational-calculus>
- W3Schools Database Languages: <https://www.w3schools.in/dbms/database-languages>
