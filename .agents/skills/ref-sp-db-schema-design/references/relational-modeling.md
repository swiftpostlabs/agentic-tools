# Relational Modeling

The modeling vocabulary behind the "model the domain explicitly" rule: ER/EER notation, schema
layers, the relational operations, the query-language split, and where an ORM stops.

## ER and EER modeling

- Identify entities, attributes, relationships, and cardinality first. Make one-to-one, one-to-many,
  and many-to-many relationships explicit in the schema.
- Model many-to-many with an explicit join table. A hidden or skipped join table makes the
  relationship impossible to validate.
- Treat optionality and ownership as design decisions, not accidental nullability.
- Reach for enhanced ER concepts when the domain needs them: **specialization/generalization** for
  superclass and subclass hierarchies, **aggregation** for whole-part relationships. They are
  modeling tools, not excuses to leave entity boundaries unclear.
- Choose surrogate keys only when they simplify the design more than natural or composite keys
  would. A surrogate key does not remove the need to protect real-world uniqueness with a constraint.

## Schema layers and data independence

- Distinguish the **physical** schema (how it is stored), the **logical/conceptual** schema (what the
  data means), and **view/external** schemas (what a given user sees).
- Aim for physical data independence: storage and access-path changes should not force a conceptual
  redesign.
- Aim for logical data independence: conceptual refinements should have limited impact on
  user-facing views.
- Keep schema, instance, and view distinct. A schema is the blueprint, an instance is a snapshot, a
  view is a projection. Collapsing them makes refactors and performance work harder.
- Do not let a single reporting or UI view dictate the whole relational structure. Views can present
  business-friendly shapes without giving up the normalized model underneath.

## Constraints that preserve meaning

- **Primary keys** identify rows.
- **Foreign keys** preserve relationships across tables.
- **Unique constraints** protect candidate keys and business-meaningful identifiers.
- **Check constraints** encode simple invariants the database can verify cheaply and clearly.

Put integrity rules in the database when the database can enforce them reliably. Application code
complements those rules; it does not replace them.

## Reasoning with relational operations

- **Selection** filters rows; **projection** keeps only the needed attributes.
- **Union** and **difference** combine or compare compatible relations.
- **Cartesian product** is a stepping stone toward joins, not usually a result you want.
- **Joins** combine relations on a matching predicate. If the join predicate is vague, the model is
  probably vague too.
- **Rename** keeps expressions unambiguous when the same relation or attribute role appears twice.
- **Relational algebra** is procedural — it helps you reason about *how* a result is formed.
  **Relational calculus** is declarative — it helps you reason about *what* satisfies a predicate.
  Both are useful for correctness even when the implementation language is SQL.

## Query-language roles

- **DDL** for schema structure, **DML** for reading and updating rows, **DCL** for privileges, and
  **TCL** for transaction boundaries.
- Keep privilege design and transaction control close to the model rather than treating them as
  unrelated operational afterthoughts.
- SQL is one concrete language family built on relational ideas — not the theory itself.

## The ORM boundary

- Let the database own keys, constraints, and join semantics. Keep the schema authoritative.
- Use the ORM to reduce repetitive query code, not to replace relational thinking.
- Review generated queries when performance or correctness matters. ORM relationships routinely hide
  N+1 queries, duplicate joins, and incorrect nullability assumptions.
- If the ORM model and the database schema disagree, fix the boundary — do not compensate with ad hoc
  application logic.
- Prefer clear joins and predicates over ORM defaults that hide cardinality or silently duplicate
  rows.
- Never push referential meaning into string parsing, embedded lists, or opaque blobs when the data
  is relational.

## Sources

- W3Schools Relation Data Model: <https://www.w3schools.in/dbms/relation-data-model>
- W3Schools Data Schemas: <https://www.w3schools.in/dbms/data-schemas>
- W3Schools Data Independence: <https://www.w3schools.in/dbms/data-independence>
- W3Schools ER Model: <https://www.w3schools.in/dbms/er-model>
- W3Schools Generalization Aggregation: <https://www.w3schools.in/dbms/generalization-aggregation>
- W3Schools Relational Algebra: <https://www.w3schools.in/dbms/relational-algebra>
- W3Schools Relational Calculus: <https://www.w3schools.in/dbms/relational-calculus>
- W3Schools Database Languages: <https://www.w3schools.in/dbms/database-languages>
