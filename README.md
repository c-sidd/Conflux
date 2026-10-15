# Conflux (Phase 1)

**Conflux** is an open-source, multi-account Google Drive file management platform. It aggregates multiple Google Drive accounts (such as personal, work, and university accounts) into a single, unified workspace with clear source attribution, aggregated quota tracking, and safe cross-account file operations.

> [!NOTE]
> **Phase 1 Focus & Boundaries**:
> Conflux Phase 1 is strictly scoped to multi-account Google Drive integration. Files and underlying data remain securely stored inside your respective Google Drive accounts. Conflux indexes file metadata, manages OAuth tokens with AES-256 envelope encryption, tracks capacity quotas, and coordinates file transfers. It does not replace Google Drive or provide real-time collaborative document editing.

---

## What Conflux Does in Phase 1

- **Multi-Account Google OAuth 2.0 Connection**: Securely authenticate and link multiple Google accounts via official Google OAuth 2.0 consent screens. Refresh tokens are encrypted at rest using AES-256-GCM.
- **Unified File Explorer**: Browse files and folders across all your connected accounts in one combined list. Every file clearly identifies its source Google account email.
- **Account Filtering & Folder Navigation**: Filter your view to a specific Google account or browse folder hierarchies seamlessly with breadcrumb navigation.
- **Aggregated Storage & Quota Observation**: Observe total combined storage across all your connected accounts, with real-time breakdowns of used and free space per drive.
- **Smart Best-Fit Upload Placement**: When uploading new files, Conflux automatically recommends or places the file into the connected account with the largest available free capacity (with manual override supported).
- **Safe Operations & Trash Management**: Rename, move within an account, copy, download, and export Google Docs/Sheets/Slides. Trashing files delegates to Google Drive's native trash with recoverable state inspection.

---

## Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────┐
│             Conflux Web Application (SPA)              │
│         React 18 • TypeScript • Tailwind CSS • Vite    │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (/api/v1)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  FastAPI Backend (API)                 │
│      Python 3.12 • SQLAlchemy 2.0 (Async) • Pydantic   │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│     PostgreSQL Database   │  │   Redis & Celery Worker │
│  (Neon Serverless Postgres│  │  Background Sync, Leases│
│   Free Tier or AWS RDS)   │  │  & Resumable Transfers  │
└───────────────────────────┘  └─────────────────────────┘
              │                            │
              └──────────────┬─────────────┘
                             │ Google Drive API v3
                             ▼
              ┌─────────────────────────────┐
              │ Google Drive Cloud Storage  │
              │ (Personal / Work / Student) │
              └─────────────────────────────┘
```

- **Frontend**: React 18 Single Page Application, TypeScript, Tailwind CSS, Lucide icons, TanStack Query.
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0 async engine with `asyncpg`, Pydantic v2 schemas.
- **Background Jobs**: Celery workers with Redis broker for asynchronous metadata sync and large transfers.
- **Database**: PostgreSQL 16. Works out of the box with **Neon Serverless PostgreSQL (Free Tier)** or AWS RDS.
- **Security**:
  - AES-256-GCM symmetric encryption for stored OAuth refresh tokens.
  - HttpOnly, SameSite, Secure session cookies.
  - Double-submit CSRF token protection on mutating endpoints.
  - Multi-tenant tenant isolation with user-scoped database queries.

---

## Quickstart: Local Development

### Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose
- A Google Cloud Project with the **Google Drive API** enabled

### 1. Clone & Configure Environment
```bash
git clone https://github.com/your-username/Conflux.git
cd Conflux

# Copy environment template
cp .env.example .env
```

Edit `.env` to configure your Google OAuth credentials:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 2. Start the Stack with Docker Compose
```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16**: `localhost:5432`
- **Redis 7**: `localhost:6379`
- **Backend API**: `http://localhost:8000` (Swagger docs at `/docs`)
- **Frontend SPA**: `http://localhost:5173`
- **Celery Worker**: Background processor for Google Drive sync

---

## Database Options (Including Neon Free Tier)

Conflux supports standard PostgreSQL and is pre-configured for **Neon Serverless PostgreSQL**:

1. Create a free database at [neon.tech](https://neon.tech/).
2. Copy your connection string:
   ```
   postgresql://user:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Set `DATABASE_URL` in your `.env` or deployment script. Conflux automatically handles asyncpg and psycopg2 connection normalization.

---

## AWS Production Deployment

Conflux includes full Infrastructure as Code (CloudFormation) for AWS deployment on ECS Fargate, ALB, S3, and CloudFront.

### One-Click Deployment:
- **Linux/macOS**:
  ```bash
  chmod +x infra/aws/deploy.sh infra/aws/run-migration.sh
  ./infra/aws/deploy.sh production
  ```
- **Windows (PowerShell)**:
  ```powershell
  .\infra/aws/deploy.ps1 -Environment production
  ```

For detailed infrastructure architecture, see the [AWS Deployment Runbook](docs/runbooks/03-aws-deployment.md).

---

## Continuous Integration & Quality Gates

Every pull request and push to `main` triggers automated GitHub Actions checks:
- **Backend**: Python 3.12 unit & integration tests (`pytest`), dependency auditing.
- **Frontend**: TypeScript type-checking (`tsc -b`), linting, and production bundling (`vite build`).

---

## What is Explicitly Out of Scope for Phase 1

To maintain engineering integrity, the following features are planned for future phases and are not in Phase 1:
- Non-Google providers (OneDrive, Dropbox, Box, iCloud).
- Collaborative in-app document editing (Google Docs must be opened in Google Drive).
- Automated deduplication using file content hashes.
- Public link sharing management across external domains without Google account authentication.
