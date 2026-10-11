# Conflux — Phase 1 Product Brief

## Product
Conflux is a unified workspace for managing files across multiple Google Drive accounts. The product should feel familiar to Google Drive users while making source-account boundaries explicit. It is not a new physical filesystem and does not initially copy all file contents into Conflux.

## Problem
People with multiple Google Drive accounts must switch accounts to find files, understand capacity, upload to the right account, and perform routine operations. Conflux provides one interface and coordinates account-specific provider operations.

## Product promise
- One Conflux login.
- Multiple independently connected Google Drive accounts.
- One unified browse/search experience, with source-account labels and account-specific views.
- Best-fit account selection for new uploads, with a manual override.
- Familiar file operations where the Drive API and the user's permissions allow them.
- Background metadata synchronization and transparent operation status.
- Original file bytes remain in the original Google account unless a user explicitly performs a supported copy/move/delete action.

## Target users
General users, starting with individual users. Do not add enterprise administration, teams, billing, or shared-drive management in Phase 1 unless a later approved change explicitly adds them.

## Product principles
1. Provider truth wins: Google Drive is authoritative for file existence, content, quota, permissions, and provider-owned metadata.
2. Explicit source identity: every file row and destructive confirmation identifies its Google account.
3. No silent destructive actions: cross-account moves copy and verify first, then require explicit confirmation before removing the source.
4. Honest capabilities: unavailable or unsupported provider operations must be disabled or explained, never simulated.
5. Observable asynchronous work: every long-running operation has a visible state and recoverable failure behavior.
6. Secure by default: credentials remain server-side; all resources are tenant-scoped.
7. Maintainable engineering: small modules, typed contracts, tests, documented API, migrations, and consistent error handling.
8. Accessibility and responsiveness are requirements, not polish.
9. Avoid premature infrastructure: modular monolith plus a separate worker; no microservices or Kubernetes in Phase 1.

## Phase 1 scope
- Email/password Conflux authentication.
- Multiple Google Drive account connections.
- My Drive files and files visible to the connected account within the selected scope.
- Unified and per-account views.
- File browsing, metadata search, upload/download, previews where supported, export of Google-native documents where supported, rename, same-account move, copy, native sharing operations, Conflux trash, restore where possible, favorites, recents, bulk selection, storage overview.
- Best-fit upload placement and manual account override.
- Resumable uploads where supported.
- Incremental background sync, periodic reconciliation, manual refresh, and last-sync visibility.
- AWS deployment with managed PostgreSQL and Redis, containerized API and worker, logs, monitoring, backups, and secret management.

## Out of scope
- Shared drives as a managed product surface.
- S3, Dropbox, OneDrive, Box, or any provider other than Google Drive.
- Native collaborative editing equivalent to Google Docs/Sheets/Slides.
- Guaranteeing permission, comment, shortcut, version-history, or ownership parity after cross-account copy.
- Storing a duplicate permanent copy of all Drive content in Conflux-owned storage.
- Billing, subscriptions, teams, enterprise administration, mobile native apps, desktop sync clients.
- Kafka, Kubernetes, Elasticsearch, microservices, or other infrastructure without evidence that it is needed.

## Success indicators
- A user can connect two accounts and see files attributed to the correct source.
- A user can browse each account and the unified view without cross-user data exposure.
- Upload placement selects only eligible accounts and explains why no destination is available.
- Interrupted uploads and background jobs recover or expose actionable failures.
- Copy-delete moves never delete the source before destination verification and user confirmation.
- Sync eventually converges after external Drive changes and transient failures.
- API docs, setup instructions, tests, deployment instructions, and external OAuth setup are complete.
- No critical authorization, token leakage, or data-loss defects remain at release.

## User-visible language
Use “Connected account”, “Stored in”, “Last synced”, “Sync now”, “Upload destination”, “Copy to account”, and “Move (copy then remove source)” where applicable. Never describe multiple Drive accounts as one Google quota or imply Conflux can override Google permissions.
