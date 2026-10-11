# Data Model and Persistence Rules

Use PostgreSQL, SQLAlchemy, and Alembic. Model ownership explicitly. All primary keys should be UUIDs unless there is a strong reason to use another type. Store timestamps in UTC as timezone-aware values. Add created_at and updated_at where meaningful. Use foreign keys, uniqueness constraints, and indexes to enforce invariants in the database, not only in application code.

## Entity overview

### User
- id: UUID primary key
- email_normalized: unique, required
- password_hash: required
- email_verified_at: nullable
- status: active, pending_verification, disabled
- created_at, updated_at, last_login_at

### UserSession
- id: UUID primary key
- user_id: FK User
- token_hash: hash of opaque session secret; never store the raw cookie secret
- created_at, expires_at, last_seen_at, revoked_at
- user_agent_summary and coarse IP risk metadata only if justified; avoid unnecessary tracking
- index on user_id and active expiry fields

### PasswordResetToken
- id, user_id, token_hash, expires_at, used_at, created_at
- store only a hash of the single-use token
- enforce expiry and single use in a transaction

### ConnectedAccount
- id: UUID
- user_id: FK User
- provider: enum/string initially GOOGLE_DRIVE
- provider_account_id: stable Google identity identifier where available
- email, display_name nullable
- encrypted_refresh_token and encryption metadata
- granted_scopes: array or normalized representation
- connection_status: CONNECTED, NEEDS_REAUTH, DISCONNECTED, ERROR
- last_successful_sync_at, last_sync_attempt_at, last_error_code
- quota_total_bytes, quota_used_bytes, quota_observed_at, quota_source
- change_cursor or reference to SyncState
- created_at, updated_at, disconnected_at
- uniqueness policy: one active connection per (user_id, provider, provider_account_id); define reconnect behavior.
- Never return encrypted tokens in API responses.

### FileMetadata
- id: UUID stable Conflux ID
- user_id: FK User for fast tenant scoping and defense in depth
- connected_account_id: FK ConnectedAccount
- provider: GOOGLE_DRIVE
- provider_file_id: provider-native ID
- name, mime_type, description nullable
- parent_provider_file_id nullable; root representation must be explicit
- size_bytes nullable (Google-native documents may not have ordinary byte size)
- modified_time_provider, created_time_provider nullable
- web_view_link nullable; treat as untrusted provider data and validate allowed schemes/hosts before rendering
- thumbnail metadata only if safe and useful; do not assume public access
- trashed_provider boolean or normalized provider state
- is_folder, is_shortcut, shortcut_target metadata if supported
- capability snapshot as normalized fields, with observed_at; never use stale capability snapshots as the only authorization check
- checksum/etag/version fields only when provider supplies useful values
- last_synced_at, sync_state, missing_since nullable
- created_at, updated_at
- unique (connected_account_id, provider_file_id)
- indexes for (user_id, connected_account_id, parent_provider_file_id), name search, modified time, trashed state, and provider ID.
- Search index may use PostgreSQL full-text/trigram features only after deciding appropriate language and indexing behavior; do not add an external search engine in Phase 1.

### UserFilePreference
- id, user_id, file_metadata_id
- is_starred, created_at, updated_at
- unique (user_id, file_metadata_id)
- Preference is Conflux-specific and must not be misrepresented as Google Drive starring unless the product explicitly syncs native starring.

### RecentActivity
- id, user_id, file_metadata_id nullable, connected_account_id nullable
- action, occurred_at, safe metadata JSON
- Use bounded retention or a documented cleanup policy.
- Do not duplicate sensitive provider payloads.

### FileOperation
- id: UUID
- user_id: FK User
- operation_type: UPLOAD, DOWNLOAD, COPY, CROSS_ACCOUNT_MOVE, RENAME, MOVE, TRASH, RESTORE, SHARE, SYNC, BULK_OPERATION, RECONCILE
- status: QUEUED, RUNNING, VERIFYING, AWAITING_CONFIRMATION, COMPLETED, PARTIAL, FAILED, CANCEL_REQUESTED, CANCELLED
- source_account_id, destination_account_id nullable
- source_file_id, destination_file_id nullable references to FileMetadata
- provider IDs may be stored as explicit operation snapshots if metadata rows can be removed
- idempotency_key nullable; unique per user and operation scope where appropriate
- progress_current, progress_total nullable; progress unit must be documented
- attempt_count, next_retry_at nullable, started_at, finished_at, created_at, updated_at
- requested_options JSON validated by typed schema; do not store secrets
- safe_error_code, safe_error_message, retryable boolean
- confirmation_requested_at, confirmed_at, cancelled_at
- correlation_id
- index by user_id/status/created_at and queue eligibility fields.

### OperationItem
For bulk actions and folder recursion:
- id, operation_id, source account/file identifiers, destination identifiers
- status, attempt_count, safe error code/message, timestamps
- unique key that prevents duplicate processing of the same operation item
- allow per-item success/failure in partial bulk operations.

### SyncState
- id, connected_account_id unique
- cursor/change token encrypted only if provider requires it to be treated as sensitive; never log it
- initial_sync_status, last_started_at, last_success_at, last_error_code
- notification_channel_id, expiration time, resource identifier when applicable
- reconciliation_due_at, lease/lock metadata if used
- cursor must only advance after corresponding changes are durably processed.

### UploadReservation
- id, user_id, connected_account_id, operation_id unique
- estimated_bytes nullable, state ACTIVE/RELEASED/EXPIRED
- created_at, expires_at, released_at
- reserve capacity transactionally to reduce races; periodically clean up abandoned reservations.
- Reservation is advisory and cannot guarantee provider quota.

### AuditEvent
- id, user_id nullable for system events, connected_account_id nullable, operation_id nullable
- event_type, occurred_at, outcome, safe structured metadata
- Never log credentials, raw OAuth payloads, file bytes, or unnecessary sensitive metadata.
- Use append-only application behavior; protect audit access.

## Relationships
- User 1:N ConnectedAccount.
- User 1:N UserSession.
- ConnectedAccount 1:N FileMetadata.
- User 1:N FileOperation.
- FileOperation 1:N OperationItem.
- ConnectedAccount 1:1 SyncState.
- FileMetadata 1:N or 1:1 UserFilePreference depending on preference design; enforce one preference per user/file.
- FileOperation and AuditEvent may refer to source/destination accounts and files.

## Deletion and retention
- Disconnecting a provider account must stop provider access and scheduled jobs. Define whether cached metadata is deleted or retained briefly; default to removing/marking inaccessible provider metadata after user confirmation and preserving minimal operation/audit records needed for safety.
- Deleting a Conflux user must revoke/delete connected-account tokens, invalidate sessions, cancel jobs, and execute a documented metadata-retention policy.
- A Conflux trash record is not a backup of file contents.
- Do not cascade-delete audit records without considering security and legal retention requirements; keep retention minimal and documented.

## Migration rules
- Every schema change is an Alembic migration.
- Never edit an already-applied migration to change history.
- Add indexes based on access patterns and verify migrations in CI.
- Use constraints for idempotency and tenant ownership invariants.
- Include migration tests for critical constraints.
