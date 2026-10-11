# AWS Deployment and Operations

## Deployment principles
- AWS is the production target.
- Use a small, well-understood managed architecture, not Kubernetes.
- Separate API and worker processes so they can scale and restart independently.
- Keep PostgreSQL and Redis private; expose only required web/API entry points.
- Infrastructure is reproducible and configuration is environment-specific.
- Never commit credentials, secret values, private keys, real OAuth tokens, or production environment files.

## Proposed production topology
- DNS/domain: Route 53 or existing DNS provider.
- TLS: AWS Certificate Manager.
- Frontend: static build on S3 behind CloudFront, or a similarly managed static-hosting path.
- API: ECS Fargate service behind an Application Load Balancer.
- Worker: separate ECS Fargate service running Celery.
- Database: RDS PostgreSQL with encryption, automated backups, private subnet placement, security groups, and a defined restore plan.
- Queue/cache: ElastiCache for Redis in private network segments.
- Secrets: Secrets Manager; KMS for supported encryption/key-management tasks.
- Logs/metrics/alerts: CloudWatch.
- Container images: ECR.
- CI/CD: GitHub Actions or an equivalent pipeline using short-lived AWS federation/OIDC rather than long-lived AWS keys.
- Google OAuth callback uses the public HTTPS API domain and an exact configured redirect URI.

The initial topology may run in one AWS region. Multi-region active-active is out of scope. For reliability, use supported multi-AZ database options when the budget and target availability require them. Do not claim high availability without configuring and testing it.

## Network
- ALB is public; application tasks may be in private subnets with controlled egress.
- RDS and Redis must not be public.
- Restrict inbound traffic by security groups to only required peers.
- Use VPC endpoints where justified by cost/security and service access patterns.
- Configure outbound connectivity for Google APIs, email provider, AWS services, and package/runtime requirements.
- Keep security-group rules narrow and document why each exists.

## Environments
- Local: Docker Compose for PostgreSQL, Redis, API, worker, and frontend.
- Test/CI: ephemeral or isolated services; no real production Google tokens.
- Staging: separate database, Redis, OAuth client/configuration, domain, and secrets.
- Production: separate account or tightly isolated environment, locked-down IAM, backups, alerts, and release approvals.
- Never reuse staging OAuth credentials or secrets in production.

## Configuration
Provide .env.example with placeholder names only. Validate configuration at startup using typed settings. Required settings should fail fast with an actionable message; optional email/observability features should clearly report disabled status instead of pretending to work.

Document settings for:
- APP_ENV, PUBLIC_APP_URL, API_PUBLIC_URL, CORS_ALLOWED_ORIGINS.
- DATABASE_URL, REDIS_URL, Celery configuration.
- SESSION_SECRET or session signing/encryption configuration if used.
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, requested scopes.
- TOKEN_ENCRYPTION_KEY or KMS key identifier and key version metadata.
- EMAIL provider configuration for verification/reset.
- LOG_LEVEL, error reporting DSN, rate-limit configuration.
- Upload size thresholds and transfer timeouts.
- Sync intervals, retry limits, notification settings.
Never put real values in the repository.

## Containers
- Use multi-stage Docker builds where useful.
- Pin compatible dependency ranges and commit lockfiles.
- Run as non-root.
- Use health checks, signal handling, graceful shutdown, and bounded worker concurrency.
- Keep images small without sacrificing reproducibility.
- Do not bake .env files or credentials into image layers.
- Separate frontend static hosting from API container where practical.

## Database operations
- Run Alembic migrations as a controlled deployment step, not concurrently from every API replica.
- Back up automatically and test restoration.
- Document point-in-time recovery if configured.
- Monitor connection count, storage, CPU, memory, slow queries, and migration duration.
- Use connection pooling appropriate for Fargate task count.
- Define RPO/RTO with the owner before production launch.

## Redis operations
- Treat Redis as replaceable queue/cache infrastructure; PostgreSQL retains durable operation state.
- Configure authentication/encryption/private networking as supported.
- Monitor memory, eviction, connection failures, and queue depth.
- Ensure worker restarts do not lose the only record of pending work.
- Add a dispatcher/recovery process for persisted QUEUED jobs if using a transactional outbox or equivalent.

## CI/CD
Required checks on every pull request:
- frontend formatting, linting, TypeScript type-check, unit tests, and production build;
- backend formatting, linting, type checks, unit tests, and integration tests;
- migration validation;
- dependency/security scan;
- OpenAPI generation/contract drift check where configured.
Deploy only after checks pass. Build immutable images, use environment-specific configuration, health-check deployments, and document rollback. Do not auto-run destructive data migrations without a recovery plan.

## Observability and alerts
- Structured application logs with request/operation IDs and redaction.
- Liveness and readiness endpoints.
- API error rate and latency, worker queue depth, oldest queued operation, failed jobs, sync lag, provider 429/5xx rates, token refresh failures, database saturation, Redis errors, and disk/storage thresholds.
- Alerts must have a runbook and avoid exposing sensitive values.
- Do not log filenames or account emails as high-cardinality metrics labels.

## Cost controls
The chosen approach prioritizes reliability, but AWS managed services can incur a baseline monthly cost. Before production provisioning, estimate the selected region, task count, ALB, RDS sizing, Redis tier, data transfer, logs, NAT gateway, backups, and CloudFront. Use budgets and billing alerts. Avoid provisioning expensive production infrastructure just to run local development. Keep the local Docker Compose path complete.

## Deployment runbooks
Document:
- first deployment;
- environment variable setup;
- Google OAuth consent-screen and redirect setup;
- migration execution;
- rollback;
- secret rotation;
- database restore;
- worker backlog and failed-job recovery;
- Google account reauthorization;
- user/account deletion;
- incident response and credential leak response.
