# Phase 1 Functional and Non-Functional Requirements

## Priority notation
- P0: release-blocking core requirement.
- P1: required for a complete Phase 1 release.
- P2: only if the official provider API supports it safely and implementation does not undermine P0/P1.

## Identity and sessions
- AUTH-001 P0: users can register, log in, log out, and request password reset using email/password.
- AUTH-002 P0: normalize email addresses and enforce unique identity at the database level.
- AUTH-003 P0: passwords are hashed with Argon2id or a maintained framework-supported equivalent; never reversible or plaintext.
- AUTH-004 P0: session cookies are Secure in production, HttpOnly, SameSite configured, rotated after authentication, expiring, and revocable.
- AUTH-005 P0: state-changing requests have CSRF protection when cookie-authenticated.
- AUTH-006 P0: login, registration, reset, and OAuth endpoints have abuse controls and generic responses where needed to prevent account enumeration.
- AUTH-007 P1: email verification and password reset use expiring, single-use, hashed tokens. Email delivery requires environment configuration; do not fake delivery.

## Connected accounts
- ACC-001 P0: a Conflux user can connect more than one Google account.
- ACC-002 P0: each connected account stores Google identity, granted scopes, connection health, token expiry information where appropriate, quota observation, and sync state.
- ACC-003 P0: Google refresh tokens are encrypted at rest and never sent to the browser.
- ACC-004 P0: account disconnect prevents new provider calls and cancels or invalidates scheduled work safely.
- ACC-005 P0: reconnecting or connecting the same Google identity is idempotent and follows an explicit duplicate-account policy.
- ACC-006 P1: account list shows email/label, status, quota data when available, last successful sync, and errors requiring action.

## File identity and browsing
- FILE-001 P0: every file belongs to one connected account and includes provider-native file ID.
- FILE-002 P0: unified view includes a visible source-account label.
- FILE-003 P0: users can switch to a specific connected account view.
- FILE-004 P0: folder navigation, sorting, pagination, loading, empty, error, and stale-data states exist.
- FILE-005 P0: use stable Conflux file IDs in client routes; never trust a browser-supplied provider ID without ownership validation.
- FILE-006 P1: display name, MIME type, size when known, modified time, parent, web link when safe, thumbnail/preview capability, and sync status.
- FILE-007 P1: favorites and recent activity are Conflux preferences/history, not claims about Google metadata.
- FILE-008 P1: search combines the local index with provider search when needed; results must be account-scoped and must label source.

## File operations
- OP-001 P0: all operations check ownership, provider capabilities, and current authorization.
- OP-002 P0: upload supports drag/drop and file picker, progress, errors, and retry where safe.
- OP-003 P0: download streams or redirects through a secure server-mediated/provider-supported flow without exposing refresh tokens.
- OP-004 P0: rename and same-account move call provider APIs and reconcile resulting metadata.
- OP-005 P0: copy to another account records source and destination identities and verifies destination creation.
- OP-006 P0: a cross-account move never removes the source until the copy is verified and the user confirms source removal.
- OP-007 P0: delete-to-trash and restore are provider-backed where supported and tracked in Conflux trash.
- OP-008 P0: permanent deletion is a separate explicit action with a clear warning; never equate it with Conflux trash.
- OP-009 P1: bulk actions run as tracked jobs and report per-item success/failure rather than all-or-nothing claims.
- OP-010 P1: sharing UI supports only operations permitted by current Google capabilities and account policy.
- OP-011 P1: Google-native documents have supported preview/open/export behavior and clear limitations.
- OP-012 P1: shortcuts, comments, versions, and other advanced objects are handled explicitly; unsupported operations are disabled or explained.

## Upload placement
- PLACE-001 P0: default policy is best-fit among eligible connected accounts.
- PLACE-002 P0: eligibility considers connection health, known capacity, file size if known, operation support, and account-level restrictions.
- PLACE-003 P0: users can override automatic placement with a selected eligible account.
- PLACE-004 P0: placement records the policy and selected account for observability.
- PLACE-005 P0: capacity data is timestamped and treated as an estimate, not a guarantee.
- PLACE-006 P0: reservations or equivalent concurrency controls reduce simultaneous uploads overcommitting one account.
- PLACE-007 P1: if no account is eligible, explain why and offer account selection or connect-account actions.

## Trash
- TRASH-001 P0: Conflux trash records source account, provider file ID, prior parent when known, operation time, and provider result.
- TRASH-002 P0: trash does not imply that a duplicate copy of bytes is retained by Conflux.
- TRASH-003 P0: restore checks current provider state and permissions.
- TRASH-004 P0: if an item was permanently deleted or access revoked externally, mark it unavailable and explain that restoration is not possible through Conflux.
- TRASH-005 P1: trash entries show recoverability status and source account.

## Sync
- SYNC-001 P0: initial sync populates a per-account metadata index.
- SYNC-002 P0: incremental changes use the provider's change-tracking API where available.
- SYNC-003 P0: cursors are per account and persisted only after corresponding changes are processed safely.
- SYNC-004 P0: manual refresh schedules a job and returns an operation ID.
- SYNC-005 P0: periodic reconciliation repairs missed notifications and stale records.
- SYNC-006 P0: account sync failures do not block unrelated connected accounts.
- SYNC-007 P1: show last successful sync and actionable stale/error states.

## API and engineering quality
- ENG-001 P0: API is versioned under /api/v1 and documented with OpenAPI.
- ENG-002 P0: frontend and backend have separate modules; no giant single-file application.
- ENG-003 P0: request/response models are typed and validated.
- ENG-004 P0: database changes use versioned migrations.
- ENG-005 P0: background work is idempotent where possible and tracked in persistent operation records.
- ENG-006 P0: tests cover authorization boundaries, critical state machines, provider adapter behavior, and failure paths.
- ENG-007 P0: configuration is environment-based and validated at startup.
- ENG-008 P0: linting, formatting, type checking, tests, and build are automated in CI.
- ENG-009 P1: structured logs, correlation IDs, health/readiness endpoints, metrics, and actionable alerts are documented.

## Non-functional requirements
- Security: least privilege, tenant isolation, token encryption, secure cookies, CSRF controls, rate limiting, auditability.
- Reliability: retries with bounded exponential backoff and jitter; no blind retries of ambiguous side effects.
- Performance: paginate lists; avoid loading entire folders; use virtualized rows for large directories; do not block HTTP requests on long-running operations.
- Accessibility: keyboard navigation, focus management, semantic controls, visible focus, contrast, and accessible status announcements.
- Responsive design: desktop-first but usable on tablet and mobile.
- Maintainability: modules with clear ownership, typed contracts, docstrings for non-obvious logic, and no unexplained magic values.
- Privacy: collect only required metadata; do not log file contents, credentials, or sensitive provider responses.
- Observability: every background operation has status, timestamps, attempt count, and safe error summary.
