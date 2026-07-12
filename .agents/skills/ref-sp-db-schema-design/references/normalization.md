# Normalization

The detail behind the "normalize by dependency, not by aesthetics" rule: what normalization solves,
the normal forms, how to decompose, and when to deliberately go the other way.

## What normalization is solving

Normalization reduces redundancy and improves integrity by aligning tables with the real functional
dependencies in the data. The goal is that **each fact is stated once, in one place**.

The three anomalies it eliminates:

- **Insertion anomaly** — you cannot record a fact without also inventing an unrelated one.
- **Update anomaly** — the same fact lives in several rows, so an update can leave them disagreeing.
- **Deletion anomaly** — removing one fact silently destroys another that happened to share the row.

If a proposed decomposition does not remove one of these, it is probably aesthetic rather than
structural.

## The normal forms

| Form | Rule | In practice |
| --- | --- | --- |
| **1NF** | Fields hold atomic values; rows are uniquely identifiable. | A table can satisfy 1NF and still be badly designed. |
| **2NF** | Non-key attributes depend on the *whole* key, not part of a composite key. | Only bites when the key is composite. |
| **3NF** | Non-key attributes depend on the key, the whole key, and nothing but the key — no transitive dependencies. | The working default for transactional schemas. |
| **BCNF** | Every determinant is a superkey. | Use when 3NF still leaves determinant-driven redundancy or update risk. |
| **4NF** | Addresses multivalued-dependency problems. | Specialized; apply only when the anomaly genuinely exists. |
| **5NF** | Addresses rarer join-dependency problems. | Specialized; same caveat. |

Normal forms beyond BCNF are real theory but rarely the right daily target for application schemas.

## Decomposing

- Split tables because dependencies demand it, not because smaller tables look cleaner.
- Move a repeated fact into its own relation when multiple rows carry the same business meaning.
- Decompose **losslessly**: the original information must be reconstructible by joining the parts
  back together.
- Carry keys and foreign keys through the decomposition so referential integrity survives the
  refactor.
- After decomposing, re-validate that the relations still support the required user transactions
  cleanly. A normalized design that no longer serves its transactions is incomplete, not finished.

## Denormalizing on purpose

Denormalization is a workload optimization, not a modeling shortcut.

- Use it when read-heavy analytics, caching, or precomputed views genuinely need fewer joins and the
  duplication cost is acceptable.
- Keep the normalized tables as the source of truth whenever correctness matters more than read
  convenience.
- Document how every duplicated fact is refreshed, invalidated, repaired, and who owns it.
  Duplication without ownership rules produces silent drift.
- A denormalized table can look simpler while quietly multiplying update risk. Measure before, not
  after.

Replacing joins with comma-separated lists or JSON blobs is not denormalization — it trades away
integrity, not just elegance.

## Sources

- DigitalOcean Database Normalization: <https://www.digitalocean.com/community/tutorials/database-normalization>
- Wikipedia Database Normalization: <https://en.wikipedia.org/wiki/Database_normalization>
- W3Schools Database Normalization: <https://www.w3schools.in/dbms/database-normalization>
