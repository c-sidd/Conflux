# Background Jobs, State Machines, and Reliability

## General rules
- Redis is a broker/cache, not the only durable record of work.
- PostgreSQL operation records are the user-visible source of truth for long-running operations.
- Tasks are at-least-once in practice; design idempotently and assume duplicate delivery.
- Every task has a timeout, bounded retry policy, correlation ID, safe error code, and durable state transitions.
- Do not hold a database transaction open while making slow provider network calls.
- A timeout does not prove an external side effect failed. Reconcile before retrying ambiguous operations.
- Use a transactional outbox or an equivalent reliable enqueue pattern where a database commit and queue publication must not diverge. If not using an outbox initially, implement and test a recovery mechanism for committed QUEUED records not published to Redis.

## Operation states
QUEUED -> RUNNING -> VERIFYING -> COMPLETED
QUEUED/RUNNING/VERIFYING -> FAILED when non-retryable or retries exhausted
RUNNING -> CANCEL_REQUESTED -> CANCELLED when cancellation is confirmed safe
Cross-account move: QUEUED -> COPYING -> VERIFYING_DESTINATION -> AWAITING_SOURCE_REMOVAL -> REMOVING_SOURCE -> COMPLETED
A partial multi-item operation may end PARTIAL and retain per-item results.

Illegal state transitions must be rejected by a central state-transition service and covered by tests. Do not let arbitrary routes write any status string.

## Upload workflow
1. Validate request and account eligibility.
2. Create FileOperation and UploadReservation in a database transaction.
3. Initialize the provider upload session.
4. Persist safe session metadata and start/continue transfer according to the chosen client/server transfer design.
5. Record progress without writing an update for every tiny chunk; throttle progress persistence.
6. Finalize and verify provider object identity, size when available, MIME type, and metadata.
7. Upsert FileMetadata and mark operation complete.
8. Release capacity reservation.
9. On failure, determine whether provider object creation occurred before retrying.
10. On cancellation, distinguish stopping transfer from cleaning up an already-created provider file.

Use resumable upload for large files where supported. Define configurable size thresholds and limits. Do not set arbitrary small limits that contradict the product's large-file requirement, but do enforce safety limits and document them. A browser-direct upload can reduce API bandwidth; if used, the backend must initialize the session and never expose refresh tokens. Treat the session URI as secret. A server-proxied transfer is simpler to control but increases compute/network cost. Choose one design intentionally, document why, and test it.

## Best-fit placement
- Exclude disconnected, reauthorization-required, unhealthy, or operation-incompatible accounts.
- Use recent quota observations and known file size.
- Include active UploadReservation amounts to reduce concurrency races.
- Use deterministic tie-breaking, such as least-recently-used among equally suitable accounts.
- Permit manual destination override.
- Record chosen account, policy version, quota observation time, and reason code.
- Recheck provider state during upload; quota estimates are not guarantees.
- If all accounts fail eligibility, return a structured explanation rather than silently falling back.

## Cross-account copy-delete state machine
1. Validate source and destination ownership, status, capability, and destination capacity.
2. Create durable operation and per-item record.
3. Copy to destination; recursively process folders if supported.
4. Verify destination file ID and accessible metadata. Do not rely only on HTTP success.
5. Record destination identity and any known non-transferable attributes.
6. Set AWAITING_SOURCE_REMOVAL.
7. Ask the user for explicit confirmation.
8. On confirmation, revalidate source ownership and capability, then remove source through the provider's appropriate trash operation.
9. Reconcile both source and destination accounts.
10. If source removal fails, preserve destination and mark PARTIAL with a clear retry path. Never automatically delete the destination to “roll back” a partially completed move.
11. If copy outcome is ambiguous, search/reconcile by operation metadata where possible before retrying.
12. Folder operations report per-child results and do not imply atomicity.

## Trash and restore
- Record intent before provider side effect.
- After provider result, update the operation and trash record.
- On ambiguous response, query provider state before repeating.
- Restore verifies current provider trash state and permissions.
- Permanent deletion is separate and irreversible; require a distinct explicit user action.
- External deletion is reconciled as unavailable; never pretend Conflux has a content backup.

## Synchronization
- Initial sync uses pagination and writes metadata incrementally.
- Use per-account leases/locks so two full syncs do not mutate the same cursor concurrently.
- Incremental sync reads provider changes from a stored cursor.
- Apply upserts/deletions idempotently, then advance the cursor only after successful durable processing.
- If processing partially fails, retry safely without skipping changes.
- Use provider notifications only as triggers to fetch authoritative change records.
- Renew notification channels before expiry and stop old channels when appropriate.
- Periodic reconciliation checks stale records, invalid cursors, quota, and account status.
- A disconnected/reauth-required account must not enter infinite retry loops.
- Avoid syncing all accounts in one task; isolate failures per account.

## Retry policy
- Retry transient network errors, selected 5xx errors, and rate limits with exponential backoff plus jitter.
- Respect Retry-After when present.
- Do not retry invalid credentials, missing permission, invalid requests, unsupported operations, or quota conditions that require user action without a state change.
- Cap attempts and expose a safe actionable error.
- Dead-letter or mark exhausted jobs visibly; provide operator diagnostics without secrets.

## Cancellation and concurrency
- Cancellation is best effort and stateful; a provider operation may already have completed.
- Use database constraints and locks for reservations and cursor leases.
- Do not use in-memory Python locks as the only cross-process coordination mechanism.
- Prevent two workers from processing the same non-idempotent operation concurrently.
- Make job dispatch recovery possible after Redis or worker restarts.

## Observability
Every operation should include ID, user/account IDs in safe internal logs, type, state, timestamps, attempt count, duration, retryability, and error code. Avoid filenames in high-cardinality metrics and redact sensitive fields. Monitor queue depth, oldest queued job, failure rate, sync lag, provider latency, token refresh failures, upload failures, and reconciliation outcomes.
