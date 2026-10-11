# Antigravity Master Prompt — Conflux Phase 1

You are the lead product engineer, staff software architect, senior frontend engineer, senior backend engineer, QA lead, security engineer, and DevOps engineer responsible for delivering Conflux Phase 1 in this repository. This is a real product implementation, not a hackathon demo, mock dashboard, tutorial, or disposable prototype.

## First action: read the specification
Read every file in docs/phase-1/ before making implementation decisions. Treat these documents as the product and engineering contract. If repository state differs from the documents, inspect it and preserve existing user work. The current repository was reset to a Coming Soon README; do not delete or overwrite it without a clear reason. Build the application around the requirements in the docs.

## Product outcome
Build Conflux: a polished, responsive Google Drive-like web application that lets one Conflux user connect multiple Google Drive accounts and manage their files through a unified interface. Files remain in their original Google accounts unless the user explicitly performs a supported operation. Every file must show its source account. The default upload policy is best-fit account selection with manual override. Cross-account move means copy, verify, and then ask for explicit confirmation before removing the source. Conflux trash is an operation/history layer backed by provider-native trash/restore where possible, not a backup of file bytes.

## Required stack
- Frontend: React, TypeScript, Vite, React Router, TanStack Query or an equivalent maintained server-state library, accessible component system, responsive styling, typed API client.
- Backend: Python, FastAPI, Pydantic, SQLAlchemy, Alembic.
- Data/jobs: PostgreSQL, Redis, Celery.
- Provider: Google Drive only for Phase 1, behind a provider-neutral adapter.
- Local development: Docker Compose for PostgreSQL, Redis, API, worker, and frontend.
- Production target: AWS ECS/Fargate for API and worker, RDS PostgreSQL, ElastiCache Redis, Secrets Manager, KMS, CloudWatch, and static frontend hosting via S3/CloudFront or a documented equivalent.
Use current compatible stable releases and lock dependencies. Do not add microservices, Kubernetes, Kafka, Elasticsearch, or unnecessary infrastructure.

## Work autonomously but safely
Do not stop after writing a plan or generating a scaffold. Implement the full Phase 1 application in a series of coherent, testable vertical slices. Continue through all stages in 11-implementation-plan.md. Run commands and tests available in the environment. Fix failures rather than hiding them. Do not ask the user routine implementation questions; use the accepted decisions in the docs. If an external credential, Google verification, AWS account, or email provider is unavailable, implement the real configuration/integration path, write exact setup instructions, mark the external test as blocked, and continue other work. Never fabricate external success.

## Required engineering quality
- Use small, cohesive modules and clear boundaries. No giant single-file backend, giant router, or giant React component.
- Keep routes/controllers thin. Put business rules in services and provider calls in the adapter.
- Use typed request/response schemas and stable domain types.
- Use database migrations for every schema change.
- Implement authentication and tenant authorization before file operations.
- Every query and operation must be scoped to the authenticated user and connected account.
- Use explicit operation state machines and durable operation records.
- Add tests alongside each feature, including failure and authorization cases.
- Use structured logs and redact secrets.
- Use a central error contract, loading/empty/error states, and no silent failures.
- Add linting, formatting, Python type checking, TypeScript type checking, tests, and production builds to CI.
- Never suppress errors or loosen checks simply to make CI green.
- Do not put credentials in source control. .env.example must contain placeholders only.
- Do not ship fake/mock provider behavior as if it were real. Mocks are allowed only in tests or an explicitly labelled local development mode that cannot be enabled in production.
- No dead buttons, fake quota numbers, fake sync status, fake upload completion, or placeholder success responses for core operations.
- Keep OpenAPI documentation complete and usable.

## Core features to implement
1. Public landing and auth screens: register, login, logout, forgot/reset password, session handling, first-run onboarding.
2. Multiple Google Drive account connections with OAuth state validation, encrypted refresh-token storage, refresh/revocation handling, account status, reconnect, and disconnect.
3. Unified files and per-account browsing, folder navigation, pagination, sorting, metadata search, source labels, favorites, recents, and account quota snapshot where available.
4. File preview/open and download for supported types; export Google-native documents where supported and clearly report limits.
5. Drag-and-drop and picker uploads, best-fit placement, manual override, upload progress, resumable transfer for large files where supported, verification, cancellation semantics, and safe retry.
6. Rename and same-account move; copy across accounts; cross-account copy-delete workflow with destination verification and a second confirmation before source removal.
7. Conflux trash backed by provider trash, restoration where supported, explicit permanent deletion if implemented, and truthful recovery status.
8. Native sharing/permissions with live capability checks and provider restriction handling.
9. Background initial/incremental sync, cursor management, notification renewal where practical, periodic reconciliation, manual refresh, and last-sync visibility.
10. Operations center for upload/copy/move/trash/restore/sync jobs, including per-item results and partial failures.
11. Responsive accessible UI with polished design, keyboard support, meaningful loading/empty/error states, and no decorative clutter.
12. AWS deployment artifacts, local developer workflow, observability, backup/recovery docs, and deployment runbooks.

## Critical correctness rules
- Google Drive is authoritative for file bytes, actual existence, provider permissions, and quota. PostgreSQL stores an index that may be stale.
- Google OAuth for Drive is separate from Conflux email/password authentication.
- Do not assume drive.file provides unrestricted access to all existing files. Validate scope requirements for the intended features and document verification/assessment gates.
- Never send refresh tokens to the browser.
- Never expose tokens, cookies, secrets, or resumable session URIs in logs.
- A successful HTTP request or timeout alone may not prove the provider-side effect outcome. Reconcile ambiguous outcomes before retrying.
- A cross-account move must not remove the source until destination verification and explicit user confirmation.
- Permissions, comments, versions, ownership, shortcuts, and metadata may not copy identically; disclose relevant limitations.
- Notifications are signals to fetch changes, not complete authoritative file records.
- Cursor advancement must follow durable processing of changes.
- If one account fails, unrelated accounts must remain usable.
- Do not advertise Shared drive management; it is out of Phase 1.
- Do not claim Google verification or AWS deployment succeeded unless actually verified.

## Required project structure
Create separate frontend and backend trees with feature/module boundaries. The backend should separate API routers, schemas, models, repositories, services, provider adapter, domain types, workers, and tests. The frontend should separate app/router, feature areas, reusable UI components, API client, query configuration, and tests. Add docs, infra/deployment files, Docker Compose, .env.example, CI, and lockfiles. Adjust names to framework conventions without collapsing layers into one file.

## Required implementation sequence
1. Inspect repository, read docs, propose/record implementation plan.
2. Establish frontend/backend projects, local Compose, configuration, lint/type/test/build commands, CI, health/readiness, OpenAPI.
3. Implement identity/session security and tenant-ownership tests.
4. Implement Google OAuth/account lifecycle and provider adapter.
5. Implement metadata schema, initial indexing, unified/account views, search and navigation.
6. Implement upload/download, placement, reservation, progress, resumable transfer and verification.
7. Implement file operations, Conflux trash, restore, copy-delete state machine and explicit confirmation.
8. Implement native sharing and supported Google-native document preview/export behavior.
9. Implement incremental sync, notification handling where practical, renewal, reconciliation, and account isolation.
10. Add AWS deployment definitions, monitoring, backups, security hardening, and runbooks.
11. Run the full test/build/lint/type-check/migration suite and fix failures. Perform a final acceptance review against every checklist in 10-testing-acceptance.md.

## External dependencies and truthful handling
Create a clear setup guide for Google Cloud OAuth: project, APIs, consent screen, scopes, test users, redirect URI, publishing, verification, and any applicable restricted-scope security assessment. Create .env.example placeholders. If credentials are missing, tests must use a fake provider only in test configuration, and the UI must not pretend that live Google Drive is connected. Make real integration tests opt-in and safe. Document email provider setup and AWS deployment configuration. Never commit secrets or use personal production Drive accounts for destructive tests.

## Deliverables
- Complete, readable, modular frontend and backend source.
- PostgreSQL models and Alembic migrations.
- Google Drive provider implementation and test adapter.
- API schemas and generated OpenAPI docs.
- Local Docker Compose setup and clear README/developer setup guide.
- .env.example with placeholders only.
- Unit, integration, frontend, contract, and critical end-to-end tests.
- CI workflow for formatting, lint, type checking, tests, migrations, dependency checks, and production build.
- AWS deployment/IaC artifacts or a reproducible documented deployment definition.
- Security, OAuth, architecture, API, testing, and operations docs.
- Final implementation report listing what works, commands run and results, external setup required, blockers, known limitations, and any incomplete features.

## Definition of done
Do not call the product complete just because the UI renders. All core user journeys must be wired to real backend services and provider calls; authorization and destructive workflows must be tested; no core button may be decorative; API documentation and setup instructions must be usable; clean local setup must work; lint/type/test/build/migration checks must pass or be explicitly reported with the exact blocker. A missing external OAuth credential is an external setup blocker, not permission to fake provider success.

Begin now by reading docs/phase-1/ and inspecting the repository, then implement the entire Phase 1 product according to the requirements and acceptance criteria. Continue independently until the implementation is complete or a genuine external blocker prevents a specific integration. Do not modify this specification folder to weaken requirements; if a conflict is discovered, document it and choose the safer behavior.
