# Security, Privacy, and Threat Model

## Assets
- Conflux passwords, sessions, reset tokens, and email identity.
- Google refresh/access tokens and OAuth state.
- Provider file metadata, account identifiers, permissions, and quota snapshots.
- Upload/download session identifiers and resumable upload URLs.
- File operation history and audit events.
- AWS credentials, encryption keys, database records, and logs.

## Trust boundaries
1. Browser to public web/API endpoint.
2. Conflux API to PostgreSQL/Redis.
3. API/worker to Google OAuth and Drive APIs.
4. Application runtime to AWS secret/key services.
5. User-controlled filenames, search strings, provider metadata, callback parameters, and file content.

Treat provider responses and all user-supplied strings as untrusted input.

## Authentication
- Hash passwords with Argon2id or a maintained secure implementation.
- Use generic login/reset responses where appropriate to reduce account enumeration.
- Rate-limit login, registration, password reset, and OAuth initiation.
- Use opaque random session tokens in Secure, HttpOnly, SameSite cookies; store only token hashes in the database.
- Rotate session identifiers on login and privilege changes; revoke sessions on logout/password reset.
- Apply CSRF protection to cookie-authenticated state-changing requests.
- Set strict CORS allowlists; never use wildcard origins with credentials.
- Configure trusted hosts and proxy headers correctly behind AWS load balancing.
- Use secure headers and an appropriate Content Security Policy.

## Authorization and tenant isolation
- Every database query involving a user-owned resource must be scoped to the authenticated user.
- Every file operation validates that the file's connected account belongs to the current user.
- Never trust a user-supplied connected_account_id, provider_file_id, destination account, or operation_id without a database ownership check.
- Use 404 for resources that should not reveal cross-tenant existence.
- Workers revalidate ownership and account status before provider side effects.
- Include negative tests for cross-user account IDs, file IDs, operation IDs, and trash records.

## OAuth and token protection
- Validate OAuth state, callback origin, redirect URI, and expected session binding.
- Encrypt refresh tokens at rest using envelope encryption backed by AWS KMS or a reviewed cryptographic library.
- Restrict KMS decrypt permissions to the API/worker roles that require it.
- Never store secrets in frontend localStorage/sessionStorage.
- Never include token fields in response schemas, error messages, analytics, logs, traces, or audit metadata.
- Treat resumable upload session URIs as sensitive bearer-like secrets.
- Implement token key-version metadata and a documented rotation path.
- On disconnect, revoke provider authorization when supported, delete encrypted token material, stop jobs, and invalidate caches.

## Data protection
- TLS for all production traffic and external API calls.
- Encrypt RDS and supported cache storage at rest.
- Keep databases and Redis in private network segments.
- Use least-privilege IAM task roles; no long-lived AWS keys in containers.
- Store secrets in Secrets Manager and use KMS for supported encryption operations.
- Back up the database and test restoration.
- Keep file bytes in Google Drive by default; do not create unnecessary duplicate data stores.
- Minimize metadata retention and document deletion/disconnection behavior.

## Input and output safety
- Validate file sizes, MIME types, request bodies, sort fields, pagination, and operation parameters.
- Do not trust file extension as proof of content type.
- Prevent path traversal in any temporary file handling.
- Escape/render filenames and provider text as text, not HTML.
- Validate web_view_link/thumbnail destinations against allowed schemes and safe rendering rules.
- Avoid server-side URL fetching from arbitrary user/provider URLs; protect against SSRF.
- Do not expose internal exception text or raw provider responses to users.

## Operational security
- Structured logging with redaction.
- Correlation IDs must not contain secrets.
- Audit security-sensitive actions: login failure aggregates, account connect/disconnect, sharing changes, deletion, restore, cross-account source removal, and admin/security actions.
- Never log passwords, tokens, OAuth codes, cookies, session secrets, raw file content, or full sensitive callback URLs.
- Keep dependencies updated and run vulnerability checks in CI.
- Protect production deployment credentials and use separate dev/staging/prod environments.
- Add alerting for repeated auth failures, token decryption errors, suspicious access patterns, queue backlogs, and provider error spikes.

## Privacy requirements
- State clearly that Conflux manages files in linked Google accounts and that the original content remains in Google Drive unless moved/copied/deleted by the user.
- Explain what metadata Conflux indexes and how disconnect/deletion affects it.
- Avoid analytics containing filenames or file contents by default.
- Provide a documented account deletion and connected-account removal flow.
- Do not claim compliance certifications or Google's approval without evidence.

## Threat scenarios to test
- User guesses another user's UUID.
- CSRF attempts against account connect/disconnect or delete.
- OAuth state replay or callback mismatch.
- Leaked access token or resumable session URI in logs.
- Worker runs after account disconnect.
- Concurrent upload placement exceeds estimated quota.
- Provider metadata contains unsafe HTML or malicious URL.
- Repeated invalid credentials trigger infinite retries.
- Cross-account move deletes source after an unverified copy.
- Cache returns a file from the wrong tenant.
