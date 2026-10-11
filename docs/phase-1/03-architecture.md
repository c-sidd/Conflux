# System Architecture

## Architecture decision
Use a modular monolith with a separate background worker:
- Frontend: React, TypeScript, Vite.
- API: Python, FastAPI, Pydantic.
- Persistence: PostgreSQL with SQLAlchemy and Alembic.
- Queue: Redis broker and Celery worker.
- Provider: Google Drive adapter only in Phase 1.
- Deployment: AWS ECS/Fargate, RDS PostgreSQL, ElastiCache Redis, Secrets Manager, KMS, CloudWatch, and S3/CloudFront for static frontend assets if appropriate.

Do not use Streamlit for the product UI. Do not split the backend into microservices. Do not add Kubernetes, Kafka, Elasticsearch, or a separate search engine without measured need.

## Logical layers
1. Presentation: routes, pages, reusable components, accessible interactions.
2. Frontend API client: typed API calls, normalized errors, session behavior, query caching.
3. HTTP layer: FastAPI routers, dependencies, request/response schemas, authentication and authorization.
4. Application services: use cases and transaction boundaries.
5. Domain layer: file identity, account eligibility, operation state machines, provider-neutral types.
6. Provider adapters: Google API calls and provider response normalization.
7. Persistence: SQLAlchemy models, repositories, migrations.
8. Background tasks: sync, transfer coordination, reconciliation, token maintenance.
9. Infrastructure: config, secrets, logging, metrics, external service clients.

Keep business rules out of React components and HTTP route functions. Routes should validate inputs, authorize, call an application service, and return a schema. Provider calls should not be scattered across the codebase.

## Suggested repository layout
- frontend/
  - src/app/ (router, providers, app shell)
  - src/features/auth/
  - src/features/accounts/
  - src/features/files/
  - src/features/uploads/
  - src/features/trash/
  - src/features/operations/
  - src/features/settings/
  - src/components/ui/
  - src/lib/api/
  - src/lib/query/
  - src/lib/errors/
  - src/types/
  - tests/
- backend/
  - app/main.py (application composition only)
  - app/api/v1/routers/
  - app/api/dependencies/
  - app/core/ (config, security, logging, errors)
  - app/db/ (session, base, migrations)
  - app/models/
  - app/schemas/
  - app/repositories/
  - app/services/
  - app/providers/base.py
  - app/providers/google_drive/
  - app/workers/celery_app.py
  - app/workers/tasks/
  - app/domain/
  - tests/unit/
  - tests/integration/
- docs/ (developer docs and operational runbooks)
- infra/ (container definitions, IaC, deployment templates)
- docker-compose.yml for local development
- .env.example containing placeholders only
- .gitignore, .editorconfig, lint/type-check/test configuration, CI workflow.

Adjust names where the chosen library conventions require it, but preserve separation of concerns.

## API process
The API process handles short requests and creates durable operation records for long work. It must not keep an HTTP request open while copying large files, syncing a large account, or processing a bulk operation. Return 202 Accepted plus an operation ID for queued work.

## Worker process
The worker performs provider calls and long-running operations. Each task has bounded timeouts, retry classification, attempt tracking, idempotency strategy, correlation ID, and durable status updates. Worker tasks must not depend on in-memory state from the API process.

## Provider abstraction
Define a provider interface around normalized operations, including:
- account identity and health;
- quota/capabilities;
- list children and search;
- fetch metadata and content;
- upload initialization/finalization;
- download/export;
- rename and same-account move;
- copy;
- trash and restore;
- permissions and capability checks;
- change tracking and sync cursor operations.

Do not force every provider to implement unsupported capabilities. Represent capabilities explicitly, return typed unsupported-operation errors, and let the UI adapt.

## Frontend state
Use TanStack Query (or an equivalent maintained server-state library) for API state. Keep server data out of duplicated global stores. Use local component state for transient UI and a dedicated upload/operation store only when required. Invalidate relevant queries after mutations. Do not persist credentials in localStorage.

## Persistence and consistency
PostgreSQL is the durable source for Conflux identity, connected-account records, local metadata index, user preferences, operations, and sync cursors. Google Drive remains authoritative for provider-owned file content, permissions, quota, and actual provider existence. Local metadata can be stale and must carry timestamps/state.

## API contract and documentation
Use /api/v1. Keep Pydantic request/response schemas explicit. Generate OpenAPI from FastAPI and expose Swagger UI/ReDoc in development; document whether public docs are enabled in production. Include examples and common error responses. The frontend should consume a typed API client generated from OpenAPI where practical, or maintain types with tests to detect drift.

## Cross-cutting concerns
- Structured logs with correlation and operation IDs.
- Central exception-to-HTTP mapping.
- Rate limits and provider quota handling.
- UTC timestamps stored consistently.
- Pagination for large lists.
- DB transactions for local invariants.
- No long provider network call inside a DB transaction.
- Idempotent jobs and safe reconciliation.
- Feature flags/configuration only where useful; avoid an unnecessary flag framework.
