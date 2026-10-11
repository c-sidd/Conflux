# Testing Strategy and Acceptance Criteria

## Testing philosophy
Tests must validate behavior, tenant boundaries, failure recovery, and provider integration. A passing frontend mock is not proof that Google Drive integration works. Use mocks for deterministic unit tests and real Google test accounts for a controlled integration suite.

## Backend test layers
### Unit
- settings validation and secret redaction;
- password/session/token helpers;
- authorization policies and ownership checks;
- account eligibility and best-fit placement;
- state transition validation;
- provider error normalization and retry classification;
- operation idempotency;
- quota reservation calculations;
- sync cursor update logic;
- trash recoverability logic.

### Integration
- database migrations and constraints;
- API authentication and cookie/CSRF behavior;
- user-to-account-to-file ownership enforcement;
- operation records and queue dispatch;
- worker behavior against fake provider;
- retry and ambiguous-outcome reconciliation;
- upload reservation concurrency;
- account disconnect while jobs are queued;
- API schema and error contracts.

### Google Drive integration
Use dedicated test Google accounts and explicit environment opt-in. Never run destructive integration tests against a user's personal/production Drive by default.
- connect two accounts;
- list existing files using actual configured OAuth scopes;
- upload, download, rename, same-account move, copy, trash, restore where supported;
- export Google-native document in a supported format;
- inspect permission capabilities and a supported permission mutation;
- refresh access token and handle revoked consent;
- simulate rate limit/quota errors where possible;
- verify external Drive changes become visible after incremental sync;
- verify disconnect prevents new provider calls.

## Frontend test layers
- component tests for file rows, account switcher, upload status, operation list, confirmation dialogs, and error states;
- route/auth tests for unauthenticated and expired sessions;
- API client tests for normalized errors and retries;
- accessibility checks for forms, dialogs, menus, keyboard navigation, and status announcements;
- end-to-end flows for sign-up/login, account connection (test configuration), browsing, upload, source labeling, trash/restore, and failed-operation recovery.

## Contract tests
- Validate OpenAPI generation.
- Validate example responses and error codes.
- Ensure frontend generated types or hand-maintained contracts match backend schema.
- Reject undocumented fields or inconsistent error bodies in tests.

## Critical security tests
- User A cannot access User B's connected account, file, operation, trash record, or destination account.
- A forged provider file ID does not bypass ownership checks.
- A stale worker cannot operate after disconnect without revalidation.
- OAuth state replay and callback mismatch are rejected.
- Tokens and cookies never appear in logs or API responses.
- CSRF is rejected for cookie-authenticated state changes.
- Arbitrary external URLs cannot be used to trigger server-side fetches.
- HTML-like filenames render as text.
- Permission changes require current provider capability.

## Critical reliability tests
- duplicate task delivery does not create duplicate operations;
- queue/worker restart recovers queued work;
- a timeout after successful provider creation does not cause blind duplicate retry;
- cursor advances only after durable change processing;
- an invalid cursor triggers controlled resync;
- partial folder copy shows per-item state;
- source removal is impossible before destination verification and explicit confirmation;
- source removal failure leaves the verified destination intact and reports PARTIAL;
- upload reservation releases on completion/failure/expiry;
- revoked account does not create infinite retry loops;
- reconciliation repairs missing/stale local metadata.

## Product acceptance scenarios
1. A new user signs up, signs in, and sees onboarding.
2. The user connects Google Account A and B.
3. The user sees both accounts' files in a unified view, with correct source labels.
4. The user filters to one account and navigates folders using pagination.
5. The user searches for a file and receives correctly attributed results.
6. The user uploads with automatic best-fit placement and sees why the account was chosen.
7. The user overrides the destination and uploads to an eligible account.
8. A large upload uses resumable behavior where supported and handles interruption.
9. The user opens/exports a Google-native document using supported operations.
10. The user renames a file and sees the reconciled metadata.
11. The user copies a file between accounts, verifies destination, and sees a separate source-removal confirmation.
12. If source removal fails, the destination remains and the operation is marked PARTIAL.
13. The user trashes and restores a file where the provider allows it.
14. The user sees unsupported capability or permission errors honestly.
15. An external Drive change appears after background sync or reconciliation.
16. One account's revoked credentials do not block another account.
17. Disconnect stops provider calls and scheduled sync for that account.
18. Keyboard-only users can complete core browsing and upload flows.
19. Mobile/tablet layouts remain usable without hidden critical actions.
20. Production build, migrations, tests, and deployment runbook complete successfully.

## Release gate
Do not call Phase 1 complete while any of these remain:
- critical/high security issue;
- known cross-tenant authorization defect;
- untested destructive workflow;
- silent loss or duplicate creation in core operation paths;
- secrets in source control/logs;
- missing migration or broken clean setup;
- core API undocumented;
- fake/mock provider behavior presented as real;
- external OAuth verification blockers undisclosed.
