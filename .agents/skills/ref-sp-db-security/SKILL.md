---
name: ref-sp-db-security
description: "Protecting a database beyond SQL permissions: threat model, least-privilege roles, views and masking, integrity, encryption and keys, auditing, and securing backups, logs, replicas, and break-glass access. Use when designing or reviewing database security."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "db"
  shareable-skills.visibility: "public"
  shareable-skills.tags: "security"
---

# Database Security

Database security as confidentiality, integrity, availability, and privacy, which depend on the host,
network, procedures, and people as much as on SQL grants. Agent file access is the unrelated
`ref-sp-agents-security`; constraints for *correctness* are `ref-sp-db-schema-design`; how backup,
restore, and migration work is `ref-sp-db-operations`; where replicas live is `ref-sp-db-distributed`.

## Defaults

- Treat backups, logs, replicas, exports, and recovery artifacts as sensitive data, not harmless
  copies.
- Pair preventive controls with detection, auditability, and tested recovery.

## Start from threats and risk, not from vendor features

- Identify both intentional and accidental threats, including theft, fraud, misuse, privacy loss, corruption, hardware failure, and loss of availability.
- Decide which datasets require confidentiality, integrity, availability, or privacy most strongly.
- Include insiders, operators, applications, infrastructure failures, and physical media exposure in the threat model.
- Match controls to realistic business damage rather than applying every feature uniformly.

## Control access explicitly

- Grant and revoke privileges deliberately instead of relying on default broad access.
- Separate application roles, read-only users, administrators, and auditors so each path has only the permissions it needs.
- Use discretionary access control when object owners can safely manage sharing, and mandatory access control when centrally enforced classification rules are required.
- Restrict privileged utilities and direct administrative access as tightly as ordinary data access.

## Reduce exposure with views, boundaries, and integrity controls

- Use views, stored interfaces, masking, or row and column restrictions to minimize direct exposure of underlying tables.
- Enforce integrity rules in the database so unauthorized or malformed changes cannot silently corrupt trusted data.
- Encrypt sensitive data at rest and in transit, and keep key management separated from routine application access.
- Treat redundancy technologies such as RAID as availability controls, not as substitutes for confidentiality or authorization.

## Audit and recover securely

- Log meaningful access, schema changes, privileged actions, and failed authorization attempts when the workload needs accountability.
- Protect audit logs from tampering and uncontrolled retention.
- Keep backup copies, log files, and restore media in secure locations with controlled access.
- Recovery plans should restore the latest consistent state without bypassing the normal protection model.

## Treat procedures and people as part of the design

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

## Before finishing

- The major confidentiality, integrity, availability, and privacy risks are named, and roles are
  explicit enough to verify least privilege.

## References

- W3Schools Database Security: <https://www.w3schools.in/dbms/database-security>
- W3Schools Data Recovery in DBMS: <https://www.w3schools.in/dbms/data-recovery-in-dbms>
- W3Schools Database Architecture: <https://www.w3schools.in/dbms/database-architecture>
- Wikipedia: <https://en.wikipedia.org/wiki/Database>
