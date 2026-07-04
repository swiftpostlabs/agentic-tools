---
name: ref-sp-db-security
description: "Portable database-security guidance for threats, access control, views, auditing, encryption, integrity, and secure recovery. Use when: protecting database-backed systems, designing authorization models, reviewing confidentiality, integrity, or availability risks, or securing backups, logs, and administrative access."
license: MIT
metadata:
  owner-prefix: "sp"
  owner: "swiftpostlab/agentic-tools"
  scope: "db"
  visibility: "public"
  tags: "security"
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
