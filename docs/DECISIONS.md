# Conflux Platform — Architecture Decision Records (ADR)

This document records the fundamental architectural decisions, rationale, and tradeoffs for the Conflux platform (*"Many Clouds. One Workspace."*).

---

## Decision 001: Authentication Separated from Storage Connections

- **Date**: 2026-07-25
- **Status**: Accepted & Implemented
- **Context**: Initially, early prototypes relied directly on Google OAuth for user login and user identity.
- **Decision**: Intentionally separated Conflux User Authentication (email/password with JWT tokens) from Cloud Storage Connections (OAuth tokens stored in `StorageAccount`).
- **Rationale**:
  1. Conflux users can log into their workspace regardless of whether any cloud storage provider is connected.
  2. Allows connecting multiple Google Drive, Dropbox, S3, or OneDrive accounts under a single Conflux user account.
  3. Prepares the platform for future multi-provider routing without tying user authentication to a single OAuth vendor.

---

## Decision 002: Conflux Workspace Isolation

- **Date**: 2026-07-25
- **Status**: Accepted & Implemented
- **Context**: Connecting a personal cloud drive (such as Google Drive) could risk exposing or modifying existing personal files.
- **Decision**: All Conflux-managed files and folders are strictly isolated inside a dedicated root folder named `Conflux` on every connected storage provider.
- **Rationale**:
  1. Conflux never accesses, inspects, modifies, or deletes any files outside `Conflux`.
  2. Guarantees 100% safety and privacy for the user's personal drive contents.
  3. Safe Account Disconnect can delete or unlink `Conflux` without touching personal folders.

---

## Decision 003: StorageManager Placement Algorithm (`MostFreeSpaceStrategy`)

- **Date**: 2026-07-25
- **Status**: Accepted & Implemented
- **Context**: Conflux combines multiple connected cloud storage accounts into a unified virtual storage pool.
- **Decision**: Implemented an extensible strategy pattern (`PlacementStrategy`) with `MostFreeSpaceStrategy` as the default placement algorithm for file uploads.
- **Rationale**:
  1. Automatically routes new file uploads to the storage account with the largest available free space.
  2. Maximizes overall storage pool efficiency and prevents individual account quota exhaustion.
  3. Easily supports alternative placement strategies such as Round-Robin or Best-Fit.

---

## Decision 004: One Google Account = One Conflux User Uniqueness Constraint

- **Date**: 2026-07-25
- **Status**: Accepted & Implemented
- **Context**: Multiple Conflux users connecting the same Google Drive account could lead to file ownership conflicts and quota corruption.
- **Decision**: Enforced a global uniqueness constraint where one Google Drive email address can only be linked to a single Conflux user account across the entire system.
- **Rationale**:
  1. Prevents cross-user data leaking and race conditions on provider workspace folders.
  2. Guarantees clear ownership for all files uploaded through Conflux.
