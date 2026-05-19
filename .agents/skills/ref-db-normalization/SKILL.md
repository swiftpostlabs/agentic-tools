---
name: ref-db-normalization
description: "Portable normalization guidance for relational schema design, dependency analysis, anomaly prevention, and denormalization tradeoffs. Use when: decomposing wide tables, reviewing keys and functional dependencies, or deciding how far to normalize a transactional schema."
metadata:
  agentic-tools-category: "db"
  shareable-skills.visibility: "shareable"
---

# Database Normalization

## Purpose

Provide portable defaults for normalizing relational schemas so they minimize redundancy, preserve integrity, and make denormalization an explicit performance tradeoff instead of an accident.

## When to use this skill

- Breaking a wide or repetitive table into related tables.
- Reviewing insertion, update, or deletion anomalies in a relational schema.
- Deciding whether a schema should stop at 3NF, move to BCNF, or stay denormalized for workload reasons.
- Explaining how keys and functional dependencies drive schema decomposition.
- Refactoring an existing transactional model without losing business meaning.

## Defaults

- Normalize transactional source-of-truth schemas through 3NF by default.
- Use BCNF when 3NF still leaves determinant-driven redundancy or update risk.
- Treat 4NF and 5NF as specialized cases, not routine application design targets.
- Decompose tables losslessly and keep keys and referential constraints explicit after the split.
- Normalize first, then denormalize only when measured read patterns justify the extra maintenance cost.

## Core Rules

### Know what normalization is solving

- Normalization reduces redundancy and improves integrity by aligning tables with real dependencies.
- The main anomalies to eliminate are insertion anomalies, update anomalies, and deletion anomalies.
- Each decomposition should make it easier to state one fact in one place.

### Use the common normal forms deliberately

- 1NF: fields contain atomic values and rows are uniquely identifiable.
- 2NF: non-key attributes depend on the whole key, not just part of a composite key.
- 3NF: non-key attributes depend on the key, the whole key, and nothing but the key; remove transitive dependencies.
- BCNF: every determinant should be a superkey.
- 4NF addresses multivalued-dependency problems, and 5NF addresses rarer join-dependency problems.
- 4NF and 5NF are usually unnecessary for routine OLTP work unless the specific anomalies actually exist.

### Decompose by dependencies, not by aesthetics

- Split tables because dependencies demand it, not because smaller tables look cleaner.
- Move repeated facts into their own relation when multiple rows repeat the same business meaning.
- Preserve the ability to reconstruct the intended information with lossless joins.
- Carry keys and foreign keys through the decomposition so integrity survives the refactor.
- After decomposition, validate that the resulting relations still support the required user transactions cleanly.

### Denormalize only on purpose

- Denormalization is a workload optimization, not a modeling shortcut.
- Use it when read-heavy analytics, caching, or precomputed views need fewer joins and the duplication cost is acceptable.
- Keep normalized tables as the source of truth when correctness matters more than read convenience.
- Document how duplicated data is refreshed, repaired, or invalidated.

## Gotchas

- A table can satisfy 1NF and still be badly designed.
- Replacing joins with comma-separated lists or JSON blobs usually trades away integrity, not just elegance.
- A denormalized table can look simpler while quietly multiplying update risk.
- Over-normalization can make common reads harder if the workload does not need the extra decomposition.
- Normal forms beyond BCNF are real theory, but they are rarely the right daily target for application schemas.
- A normalized design that no longer supports the required transactions well is incomplete, not finished.

## Validation

- Each table stores one kind of fact at one consistent level of dependency.
- The design eliminates the anomalies that motivated the refactor.
- Lossless joins and explicit foreign keys preserve reconstructability and integrity.
- The stopping point for normalization is justified by workload needs, not habit.
- Required transactions still remain practical after decomposition.
- Any denormalized structures have an explicit refresh or consistency plan.

## References

- DigitalOcean: <https://www.digitalocean.com/community/tutorials/database-normalization>
- Wikipedia: <https://en.wikipedia.org/wiki/Database_normalization>
- W3Schools Database Normalization: <https://www.w3schools.in/dbms/database-normalization>
