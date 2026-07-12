# Database Design Methodology

The lifecycle behind the "work the phases in order" rule. Read this when a design needs to be run as
a project rather than a table edit — new system from requirements, or a schema that has drifted away
from the business it serves.

## Mission, scope, and fact-finding

- Define what the database system is for, which users and processes it serves, and what success
  means. If the mission statement, required transactions, or vocabulary stay fuzzy, the schema stays
  fuzzy too.
- Capture enterprise terminology, current-system pain points, desired outcomes, constraints, and the
  prioritized transactions the system must support.
- Use several fact-finding techniques rather than one: documents, interviews, observation, research,
  and questionnaires. Fact-finding that reads only the existing forms tends to preserve the flaws of
  the existing system.
- Spend most of the effort in planning, system definition, requirements gathering, and early
  analysis — then revisit it when design exposes gaps.

## Conceptual design

- Model entities, relationships, attributes, domains, keys, and integrity constraints without tying
  them to storage or vendor features.
- Use ER or EER notation so the model stays legible to technical and non-technical collaborators
  alike.
- Check for redundancy and missing concepts *before* translating the model into relations.
- Review the conceptual model with users before treating it as stable. Review after the schema is
  fixed is approval theater.

## Logical design

- Derive relations from strong and weak entities, binary and recursive relationships, many-to-many
  structures, superclass/subclass hierarchies, and multivalued attributes.
- Normalize the resulting relations (see `./normalization.md`).
- Validate the logical model against the required user transactions. Normalized does not imply
  usable.
- Check integrity constraints and future growth, and decide whether several local models need
  merging into a global one.

## Physical design

- Choose the target DBMS, file organization, indexes, views, storage layout, and security mechanisms
  from the logical design and the observed workload.
- Analyze the transactions before choosing indexes or introducing controlled redundancy.
- Estimate space, define nullability and data types precisely, and plan monitoring and tuning from
  the start rather than bolting them on.
- Let physical decisions optimize the model, not distort it.

## Documentation and iteration

- Maintain diagrams, relation definitions, keys, constraints, and a data dictionary as the design
  evolves. They are part of the design, not optional cleanup afterwards.
- Repeat earlier steps when user review, transaction validation, or implementation feedback reveals
  missing facts.
- Treat design review as part of the lifecycle.

## Sources

- W3Schools Planning, Design and Administration: <https://www.w3schools.in/dbms/planning-design-administration>
- W3Schools Fact Finding: <https://www.w3schools.in/dbms/fact-finding>
- W3Schools Conceptual Methodology: <https://www.w3schools.in/dbms/conceptual-methodology>
- W3Schools Logical Methodology: <https://www.w3schools.in/dbms/logical-methodology>
- W3Schools Physical Methodology: <https://www.w3schools.in/dbms/physical-methodology>
