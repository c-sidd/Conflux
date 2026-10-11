# REST API Contract

## Conventions
- Base path: /api/v1.
- JSON requests and responses except file transfer endpoints.
- UUIDs for Conflux resource identifiers.
- UTC ISO-8601 timestamps.
- Use a consistent response schema for operations and a consistent error schema.
- FastAPI OpenAPI is the canonical machine-readable contract. Add descriptions, examples, response codes, and authentication requirements to every route.
- Never expose provider refresh tokens, raw encrypted secrets, or internal stack traces.

## Error response
Use a normalized error body with:
- code: stable machine-readable code, e.g. AUTH_REQUIRED, RESOURCE_NOT_FOUND, PROVIDER_REAUTH_REQUIRED, PROVIDER_RATE_LIMITED, QUOTA_INSUFFICIENT, OPERATION_CONFLICT, UNSUPPORTED_CAPABILITY.
- message: safe user-facing explanation.
- request_id: correlation ID.
- details: optional safe field errors or capability limitations.
Do not include tokens, raw provider payloads, SQL errors, or stack traces.

## Authentication
- POST /auth/register — create account; return safe user profile and session cookie if policy permits immediate login.
- POST /auth/login — validate credentials, rotate session, set secure session cookie.
- POST /auth/logout — revoke current session and clear cookie.
- GET /auth/me — current user and non-sensitive profile.
- POST /auth/forgot-password — generic response regardless of whether email exists.
- POST /auth/reset-password — validate one-time token and update password.
- POST /auth/verify-email — validate single-use email verification token if verification is enabled.
- POST /auth/csrf — if a CSRF token bootstrap endpoint is needed by the selected cookie strategy.

## Connected accounts
- GET /accounts — list account identity, connection state, quota snapshot, last sync; never token fields.
- POST /accounts/google/authorize — initiate OAuth and return a server-generated authorization URL or redirect.
- GET /accounts/google/callback — validate state, exchange code, identify account, persist encrypted credentials, enqueue initial sync.
- GET /accounts/{account_id} — account details.
- POST /accounts/{account_id}/sync — enqueue sync and return 202 with operation.
- POST /accounts/{account_id}/reconnect — begin reauthorization.
- DELETE /accounts/{account_id} — disconnect with explicit confirmation semantics and safe job cancellation.

## Files and folders
- GET /files — unified list with cursor/page pagination and filters.
- GET /accounts/{account_id}/files — account-specific list.
- GET /folders/{file_id}/children — children of a folder after verifying folder/account ownership.
- GET /files/{file_id} — metadata and normalized capability summary.
- GET /files/{file_id}/content — secure content/download response or short-lived provider-supported flow.
- GET /files/{file_id}/export?mime_type=... — supported Google-native export.
- GET /search?q=... — unified search with account filters and pagination.
- PATCH /files/{file_id} — allowlisted metadata changes such as rename; never generic mass assignment.
- POST /files/{file_id}/copy — create tracked copy operation.
- POST /files/{file_id}/move — same-account move or explicit cross-account copy-delete workflow.
- POST /files/{file_id}/trash — provider-backed trash plus Conflux operation record.
- POST /files/{file_id}/restore — restore where provider permits.
- DELETE /files/{file_id} — permanent deletion only if deliberately supported and after explicit confirmation token/intent.
- GET /trash — list Conflux trash records and current recoverability state.

## Uploads and operations
- POST /uploads — validate metadata, select destination according to best-fit or explicit account, create durable operation, initialize transfer.
- GET /uploads/{operation_id} — operation state and safe progress.
- POST /uploads/{operation_id}/complete — finalize/verify where upload protocol requires explicit completion.
- POST /operations/{operation_id}/cancel — request cancellation; cancellation is best-effort for provider operations.
- GET /operations — user's operation history with pagination.
- GET /operations/{operation_id} — operation detail including safe per-item outcomes.
- POST /operations/{operation_id}/confirm-source-removal — explicit confirmation for cross-account move source deletion.
- POST /operations/{operation_id}/retry — retry only when safe and allowed by operation state.

## Sharing
- GET /files/{file_id}/permissions — normalized permission records and supported capabilities.
- POST /files/{file_id}/permissions — create supported permission.
- PATCH /files/{file_id}/permissions/{permission_id} — modify only if permitted by provider.
- DELETE /files/{file_id}/permissions/{permission_id} — remove permission only if permitted.
- Every permission route rechecks live provider capability and ownership.

## Request/response design
- List endpoints return items, next_page_token or next_cursor, and optional metadata such as last_synced_at.
- Long-running operations return 202 Accepted with operation_id, status, and status_url.
- Synchronous operations return the resource representation only when truly complete.
- Use 400 for invalid request, 401 for unauthenticated, 403 for forbidden, 404 for inaccessible/not-found resources (avoid leaking existence across tenants), 409 for invalid state conflict, 413 for configured size limits, 422 for schema validation, 429 for rate limits, 502/503 for provider failures, and 500 only for unexpected internal failures.
- Use provider retry-after when appropriate.
- Do not use 200 with an error-shaped response.

## Pagination and filtering
- Never fetch an unbounded account or folder into memory.
- Support bounded page size and reject excessive values.
- Cursor pagination is preferred for large/changing collections. Provider page tokens are account-specific and should not be exposed as authorization tokens.
- Validate sort fields against an allowlist.

## Idempotency
- For POST operations that can create external side effects, accept an Idempotency-Key where appropriate.
- Scope idempotency keys to the authenticated user and operation type.
- Store the key and operation result transactionally.
- A repeated key returns the existing operation/result.
- If the external outcome is ambiguous, reconcile provider state before retrying.

## Documentation and compatibility
- Include request/response examples for auth, account connect, file list, upload, copy-delete move, trash/restore, and operation polling.
- Document all 401/403/409/422/429/provider error cases.
- Version incompatible contract changes; do not rename fields casually.
- Generate frontend types from OpenAPI when feasible and run a CI drift check.
