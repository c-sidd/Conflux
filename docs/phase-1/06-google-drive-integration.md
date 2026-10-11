# Google Drive Integration Specification

## Provider scope
Google Drive is the only Phase 1 storage provider. Implement it behind a provider-neutral interface so later providers can be added without rewriting domain services. Do not implement S3/Dropbox/OneDrive now.

## OAuth model
Conflux email/password identity and Google Drive authorization are separate. A user first signs into Conflux, then explicitly connects one or more Google accounts.

- Use authorization-code flow with a server-side callback.
- Validate a cryptographically random state value and bind it to the initiating Conflux session.
- Use exact configured redirect URIs and HTTPS in production.
- Request offline access only when needed for background sync; securely handle refresh-token issuance and cases where Google does not return a new refresh token.
- Store only required granted scopes and show the connected identity.
- Encrypt refresh tokens at rest with an envelope-encryption design backed by AWS KMS or a well-reviewed equivalent. Include key version metadata for rotation.
- Access tokens are short-lived and cached only in server-side memory/cache as appropriate; never send refresh tokens to the frontend.
- On invalid_grant or revoked consent, mark NEEDS_REAUTH, stop retry storms, and prompt the user to reconnect.
- Do not log OAuth authorization codes, tokens, full callback query strings, or sensitive Google API payloads.

## OAuth scope gate
Broad management of arbitrary existing Drive files may require the restricted https://www.googleapis.com/auth/drive scope. The narrower drive.file scope does not automatically grant full access to every pre-existing file. Do not silently use a narrow scope and pretend that full-drive parity works.

Before public launch:
1. Test exact features against the chosen scope set.
2. Review current Google verification requirements for sensitive/restricted scopes.
3. Confirm whether a security assessment applies to the deployment's restricted-scope data handling.
4. Complete consent-screen configuration and verification requirements.
5. Document limitations if some operations cannot be offered.

Never claim Google has approved the application unless approval has actually been completed.

## Account identity and duplicate handling
Use a stable Google identity identifier where available, not email alone as the sole immutable identity. Display email for user recognition. Define whether the same Google identity may be linked more than once; default to one active connection per Conflux user and provider identity.

## Provider adapter contract
Use normalized domain models, not raw Google API responses in the frontend. The adapter should expose methods for:
- account identity and quota/capabilities;
- list files and children with pagination;
- search;
- get metadata;
- download binary content;
- export Google-native documents to supported MIME types;
- upload using resumable transfer where appropriate;
- rename and same-account parent change where supported;
- copy file;
- trash, restore, and permanent delete only when explicitly authorized;
- list/read/create/update/delete permissions where supported;
- change cursor creation and incremental changes;
- notification channel creation/renewal/stop where used;
- capability mapping and error normalization.

Represent unsupported capabilities explicitly. A provider adapter must not invent behavior to satisfy a generic interface.

## File types
- Binary files: download using provider-supported media endpoints.
- Google-native files: use export formats supported for the type. Do not treat native docs as ordinary binary downloads.
- Export output can have API limits; handle size/format limitations with clear errors and tests.
- Previews may use safe thumbnails, embedded preview, or opening the Google Drive web view. Validate URLs and avoid exposing private content through public proxies.
- Folder copies require recursive handling of contents and per-item results; do not assume one API call clones an entire folder.
- Shortcuts and shared content require explicit detection and conservative handling.
- Shared drives are out of scope for product UI, but the adapter must not accidentally claim it fully supports them.

## Sharing and permissions
- Read live capability data before displaying or executing actions.
- Permission inheritance, organization policy, and account roles can limit changes.
- Copying a file creates a new object and may not preserve permissions, comments, versions, ownership, or other metadata.
- Show the permission limitations that matter before cross-account operations.
- Treat provider permission state as authoritative; local permission records are cache only.
- Never broaden access silently.

## Quota and placement
Read available quota fields where Google provides them, record observation time, and account for unknown values. Do not assume all accounts expose identical quota semantics or that an estimate guarantees an upload will succeed. Provider quota errors are authoritative and must update account health/capacity observations.

## API limits and errors
- Respect Google rate-limit and retry guidance.
- Use bounded exponential backoff with jitter for transient errors and rate limits.
- Honor Retry-After when supplied.
- Do not retry invalid credentials, insufficient permissions, invalid requests, or unsupported operations indefinitely.
- Map provider errors to safe internal error codes.
- Use request IDs/correlation IDs in logs, but redact tokens and private file content.

## Change tracking
- Initial sync lists metadata in pages.
- Persist a separate change cursor for every connected account.
- Process changes idempotently and advance cursor only after durable processing.
- Notifications are wake-up signals; fetch the change feed to obtain authoritative updates.
- Renew notification channels before expiry and handle missed/expired channels.
- Periodic reconciliation compares indexed metadata to provider state.
- If the provider invalidates a cursor, perform a controlled resync without wiping unrelated account state.

## Acceptance tests for real integration
- Connect two distinct Google accounts.
- Verify existing-file visibility with actual granted scopes.
- Verify refresh token persistence and refresh after access-token expiry.
- Revoke consent and confirm the account becomes NEEDS_REAUTH.
- Upload/download an ordinary file and verify provider metadata.
- Export at least one Google-native document to a supported format.
- Test quota unavailable, insufficient quota, rate limiting, and permission-denied cases.
- Verify changes made directly in Google Drive appear after sync/reconciliation.
- Verify disconnect prevents further provider calls.
