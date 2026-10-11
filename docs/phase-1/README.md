# Conflux Phase 1 — Documentation Index

This folder is the implementation contract for Phase 1. Read every document before writing code.

## Start here
1. 00-product-brief.md — product definition and non-negotiable principles.
2. 01-requirements.md — functional requirements and feature boundaries.
3. 02-ux-ui.md — navigation, screens, states, accessibility, and interaction rules.
4. 03-architecture.md — application boundaries and deployment architecture.
5. 04-data-model.md — entities, relationships, constraints, and indexes.
6. 05-api-contract.md — REST API conventions and endpoint contract.
7. 06-google-drive-integration.md — OAuth, provider adapter, Drive API behavior.
8. 07-security-privacy.md — threat model and security controls.
9. 08-background-jobs-reliability.md — sync, uploads, idempotency, recovery.
10. 09-aws-deployment.md — AWS topology, environments, CI/CD, operations.
11. 10-testing-acceptance.md — quality gates and acceptance scenarios.
12. 11-implementation-plan.md — build order and definition of done.
13. 12-antigravity-master-prompt.md — the single prompt to give Antigravity.
14. 13-decisions-and-risks.md — accepted decisions, assumptions, unresolved external gates.

## Instructions for implementation agents
- Treat the docs as the source of truth; do not invent a smaller demo in place of the product.
- Inspect the existing repository before changes. At the time these docs were written, the root README is the only application file.
- Implement readable, modular, typed code. Never place the entire backend or frontend in one file.
- Do not claim a feature works unless it is implemented and tested against the real interface it depends on.
- Do not add credentials, real tokens, private keys, or production secrets to source control.
- If external credentials or Google verification are unavailable, implement the integration and configuration path, report the exact external setup needed, and do not fake success.
- Keep Phase 1 limited to Google Drive as a provider. The architecture must support later providers without building them now.
