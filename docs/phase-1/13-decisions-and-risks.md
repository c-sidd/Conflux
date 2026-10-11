# Accepted Decisions, Assumptions, and Risks

## Accepted decisions
- Product name: Conflux.
- Repository: c-sidd/Conflux.
- Phase 1 provider: Google Drive only.
- Target audience: general users, individual-first.
- UI: polished Google Drive-like file manager.
- Account model: unified view with source labels and separate account views.
- Conflux login: email/password; Google authorization is separately used to connect Drive accounts.
- Existing files: remain in their original accounts unless the user explicitly operates on them.
- Upload placement: best-fit eligible account with manual override.
- Cross-account move: copy and verify, then explicit source-removal confirmation.
- Trash: Conflux-level trash/history backed by provider operations; no promise of content backup.
- Scope: broad practical Google Drive feature coverage, with honest API limitations.
- Shared drives: out of scope.
- Sync: balanced, using incremental change tracking, notifications where practical, periodic reconciliation, and manual refresh.
- Stack: React + TypeScript + Vite; FastAPI; PostgreSQL; SQLAlchemy/Alembic; Redis + Celery.
- Deployment: AWS managed infrastructure, separate API/worker, containerized.
- Devices: desktop-first responsive experience.
- Files: everyday and large files, resumable uploads where supported.
- Engineering: modular, documented, tested, readable, secure, no single-file architecture.

## External gates (must not be fabricated)
1. Google OAuth scopes and verification. Broad access to arbitrary existing files may require restricted scope and applicable verification/security assessment. Validate current requirements.
2. Google Cloud project, consent screen, exact redirect URIs, test users, quotas, and publishing status.
3. Email provider and sender-domain setup for verification/reset messages.
4. AWS account, region, domain, certificate, IAM, secrets, budget alarms, and deployment permissions.
5. Product owner must choose final availability/recovery objectives and monthly AWS budget before production sizing.
6. Real test Google accounts are required for live integration acceptance.

## Main risks and mitigations
- Scope/verification delay: prove OAuth scopes and verification path early; do not advertise unrestricted access before approval.
- API parity gap: maintain a feature/capability matrix and disable unsupported actions.
- Token compromise: envelope encryption, least privilege, no token logging, rotation/revocation.
- Duplicate/partial uploads: durable operation IDs, idempotency, verification, reconciliation.
- Quota race: reservations plus provider-side revalidation; explain quota is estimated.
- Cross-account data loss: copy first, verify, require confirmation before source removal, keep partial state visible.
- Permission mismatch after copy: warn that provider permissions and metadata may not transfer; do not silently broaden access.
- Stale metadata: timestamps, incremental sync, reconciliation, manual refresh.
- Worker backlog/outage: persistent operations, queue monitoring, dispatcher recovery, bounded retries.
- AWS baseline cost: cost estimate and billing alarms before provisioning; keep local development independent of AWS.
- Overengineering: modular monolith; no premature microservices/Kubernetes/search cluster.
- Vibecoding-generated poor code: enforce small modules, lint/type/test CI, acceptance gates, and no fake production paths.

## Assumptions to confirm during implementation
- Google account identity can be linked using a stable provider identity field.
- Exact quota fields and export formats vary by provider/API behavior and must be tested.
- Folder copy and recursive operations can partially succeed and require per-item results.
- Provider notification channels may require renewal and reconciliation remains necessary.
- The user will supply external credentials/configuration; none are present in this repository.
