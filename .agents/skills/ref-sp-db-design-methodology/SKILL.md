---
name: ref-sp-db-design-methodology
description: "Portable database-design methodology guidance for fact-finding, conceptual or logical or physical design, transaction validation, and iterative user review. Use when: starting a schema from requirements, translating business processes into ER models and relations, or planning database design as a lifecycle instead of isolated table edits."
license: MIT
metadata:
  owner-prefix: "sp"
  owner: "swiftpostlab/agentic-tools"
  scope: "db"
  visibility: "public"
---

# Database Design Methodology

## Purpose

Provide a portable lifecycle for designing databases from requirements through conceptual, logical, and physical design without collapsing those phases into ad hoc table edits.

## When to use this skill

- Starting a new database-backed system from stakeholder requirements.
- Refactoring a schema that no longer matches business terminology, workflows, or transactions.
- Turning interviews, documents, and existing system knowledge into a structured data model.
- Reviewing whether a design has skipped conceptual or logical steps and jumped straight to implementation.
- Planning a database project that needs explicit user review, transaction validation, and iteration.

## Defaults

- Start with fact-finding and mission clarity before drawing tables.
- Treat conceptual, logical, and physical design as separate phases with separate decisions.
- Keep the conceptual model independent from the target DBMS as long as practical.
- Normalize and validate against required transactions before optimizing physical storage.
- Maintain a data dictionary and diagrams as part of the design, not as optional cleanup.
- Expect iteration; database design is rarely correct in one pass.

## Core Rules

### Start with mission, scope, and fact-finding

- Define what the database system is for, which users and processes it serves, and what success means.
- Capture enterprise terminology, current-system pain points, desired outcomes, constraints, and prioritized transactions.
- Use multiple fact-finding techniques as needed: documents, interviews, observation, research, and questionnaires.
- Spend most fact-finding effort in planning, system definition, requirements gathering, and early analysis, then revisit it when design exposes gaps.

### Build the conceptual model before implementation details

- Model entities, relationships, attributes, domains, keys, and integrity constraints without tying them to storage or vendor features too early.
- Use ER or EER notation to keep the model understandable to both technical and non-technical collaborators.
- Check for redundancy and missing concepts before translating the model into relations.
- Review the conceptual model with users before treating it as stable.

### Convert conceptual design into a logical model deliberately

- Derive relations from strong and weak entities, binary and recursive relationships, many-to-many structures, superclass or subclass hierarchies, and multivalued attributes.
- Normalize the resulting relations to remove avoidable redundancy and dependency problems.
- Validate the logical model against the required user transactions instead of assuming that normalized means usable.
- Check integrity constraints, future growth, and whether multiple local models need to be merged into a broader global model.

### Make physical design serve the logical model

- Choose the target DBMS, file organization, indexes, views, storage layout, and security mechanisms based on the logical design and workload.
- Analyze transactions before choosing indexes or controlled redundancy.
- Estimate space, define nullability and data types precisely, and plan monitoring and tuning from the start.
- Let physical decisions optimize the model, not distort it.

### Keep documentation and iteration alive

- Maintain diagrams, relation definitions, keys, constraints, and a data dictionary as the design evolves.
- Repeat steps when user review, transaction validation, or implementation feedback reveals missing facts.
- Treat design review as part of the lifecycle, not as approval theater after the schema is already fixed.

## Gotchas

- Designing tables directly from screens, reports, or API payloads usually skips the real conceptual model.
- Jumping to physical optimization before logical validation makes later fixes expensive.
- A normalized model that users cannot map back to their workflows is unfinished.
- Fact-finding that uses only one source, such as existing forms, often preserves the flaws of the current system.
- If mission statement, required transactions, or vocabulary stay fuzzy, the schema will stay fuzzy too.

## Validation

- The project has an explicit mission, scope, and fact-finding record.
- Conceptual, logical, and physical decisions are distinguishable.
- The logical model is normalized enough for its workload and validated against required transactions.
- Users or domain stakeholders have reviewed the conceptual or logical model.
- Physical design choices explain how the target DBMS will implement the logical model efficiently and safely.

## References

- W3Schools Planning, Design and Administration: <https://www.w3schools.in/dbms/planning-design-administration>
- W3Schools Fact Finding: <https://www.w3schools.in/dbms/fact-finding>
- W3Schools DBMS Methodology (Conceptual): <https://www.w3schools.in/dbms/conceptual-methodology>
- W3Schools DBMS Methodology (Logical): <https://www.w3schools.in/dbms/logical-methodology>
- W3Schools DBMS Methodology (Physical): <https://www.w3schools.in/dbms/physical-methodology>
