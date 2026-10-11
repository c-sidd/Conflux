# Implementation Plan and Definition of Done

## Execution rule
Build a working, coherent product in vertical slices. Do not generate the entire application as a pile of unrelated files and declare completion. Each slice must include UI, API, persistence, tests, and documentation for the behavior it introduces.

## Stage 0 — Repository reconnaissance and decisions
- Inspect current tree and preserve the existing root README.
- Read all Phase 1 docs.
- Confirm supported library versions and their current compatibility.
- Identify external setup needs: Google Cloud OAuth project, consent screen, redirect URI, scopes, AWS credentials/roles, email provider.
- Write a concise implementation plan before code changes.
- Do not block the whole implementation because real credentials are unavailable; build safe configuration paths and provider tests, but clearly label real integration tests as pending.

Exit: architecture and repository structure are consistent with these docs.

## Stage 1 — Foundation and developer experience
- Add frontend and backend projects with lockfiles and pinned compatible dependencies.
- Add Dockerfiles, Docker Compose, .env.example, .gitignore, editor config, formatters, linters, type checking, and CI.
- Configure FastAPI app factory, settings, logging, error handlers, OpenAPI metadata, health/readiness.
- Configure SQLAlchemy, Alembic, PostgreSQL and Redis/Celery.
- Add frontend router, app providers, typed API client, error boundary, design tokens, and base layout.
- Add setup guide and deterministic test commands.

Exit: clean clone can start the application locally using documented commands; migrations and baseline tests pass.

## Stage 2 — Identity and security baseline
- Implement user model, password hashing, registration/login/logout, sessions, CSRF protection, reset/verification interfaces, rate limits.
- Implement ownership dependencies and negative tests before file routes.
- Configure CORS, trusted hosts, secure cookies, and security headers.
- Add auth screens and protected route behavior.

Exit: authentication and tenant-boundary tests pass; no placeholder auth that bypasses checks.

## Stage 3 — Google OAuth and account lifecycle
- Implement account connection/callback with state validation.
- Encrypt refresh tokens and implement refresh/revocation handling.
- Store Google identity and scopes; expose only safe account DTOs.
- Add account list/status/disconnect UI.
- Add a Google Drive adapter and a fake adapter for deterministic tests.
- Document exact OAuth setup and current scope/verification gate.

Exit: two real test accounts can connect when credentials are supplied; unit/integration tests pass with fake provider.

## Stage 4 — Metadata index and browse
- Implement file/account schema, repository/service boundaries, cursor pagination.
- Implement initial account scan and metadata upserts.
- Build unified and account-specific file lists, source labels, folder navigation, search, sorting, empty/loading/error states.
- Add favorites/recent as Conflux-level features and document their semantics.
- Avoid fetching whole account trees into memory.

Exit: users can browse files from multiple accounts with source identity and correct ownership.

## Stage 5 — Upload and download
- Implement best-fit placement, manual override, quota observations, reservation, and eligibility explanations.
- Implement upload initiation, resumable transfer strategy, progress, finalization, verification, retries, cancellation semantics.
- Implement download and native-document export with supported format/size handling.
- Add per-file operation tracking and frontend operation center.

Exit: supported transfers work end to end; uncertain outcomes are reconciled before retry.

## Stage 6 — Operations and trash
- Implement rename, same-account move, copy, provider trash, restore, and explicit permanent deletion if included.
- Implement cross-account copy-delete state machine with destination verification and second confirmation.
- Implement bulk operation item records and partial result reporting.
- Add capability-aware action availability.

Exit: destructive/cross-account tests pass; no operation claims atomicity where it is not.

## Stage 7 — Synchronization and reconciliation
- Implement per-account change cursors, incremental sync, notifications where appropriate, renewal, periodic reconciliation, and manual refresh.
- Add account-scoped worker leases and idempotent upserts.
- Add stale/error UI and retry affordances.

Exit: externally changed metadata converges; token errors and invalid cursors recover safely.

## Stage 8 — Sharing and broad file-type support
- Implement permission inspection and supported mutations using live capability checks.
- Add preview/open/export behavior for supported Google-native documents and common binary files.
- Document unsupported operations and account restrictions in the UI.
- Do not promise collaborative editing parity.

Exit: each advertised action has a tested provider path or is explicitly unavailable.

## Stage 9 — Hardening and AWS deployment
- Complete CI and container hardening.
- Add AWS IaC or a reproducible deployment definition, IAM least privilege, secrets, KMS, database backups, CloudWatch alarms, and deployment/rollback runbooks.
- Validate clean deployment in staging.
- Run security, accessibility, load, migration, recovery, and end-to-end tests.
- Complete Google verification/assessment tasks before public launch.

Exit: release gate in 10-testing-acceptance.md is satisfied or every external blocker is clearly documented.

## Code quality rules
- Prefer small files and cohesive modules; no giant route file, giant React component, or single-file backend.
- Keep route handlers thin and domain rules in services.
- Use typed schemas for API boundaries.
- Use repository/service boundaries where they improve testability; do not build abstractions with no clear purpose.
- Add tests with every business rule and bug fix.
- Avoid broad except blocks that swallow errors.
- No silent failures, TODO-only implementations for core flows, or hardcoded fake data in production paths.
- No mock provider selected automatically in production.
- Do not suppress TypeScript, Python, lint, or test errors to claim success.
- Keep naming consistent and use explicit enums/state transitions.
- Comment why for non-obvious decisions; do not add noisy comments that restate code.
- Keep secrets out of source and sample files.
- Update docs when behavior or API contracts change.

## Final delivery report
When implementation is complete, report:
- what was built;
- repository tree and major module boundaries;
- setup and run commands;
- environment variables requiring user configuration;
- migrations and test commands/results;
- API docs URL;
- Google OAuth setup/verification status;
- AWS deployment state and estimated operational assumptions;
- known limitations and remaining blockers;
- explicit confirmation of any feature that is not implemented.
Do not claim deployment, tests, OAuth verification, or external configuration succeeded unless actually verified.
