# Conflux Docker Integration & Setup Guide

This guide details how to build, run, and configure the Conflux containerized environment.

---

## Prerequisites

- **Docker Desktop** installed on Windows/macOS/Linux.
- **Docker Compose** v2+ installed.

---

## 1. Local Development Stack

To spin up the local development database, task runner, and API services:
```bash
docker compose up --build
```

Services exposed:
- **Frontend SPA**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Database (PostgreSQL)**: `localhost:5432`
- **Redis Cache & Celery Broker**: `localhost:6379`

To shut down the local stack:
```bash
docker compose down -v
```

---

## 2. Production Stack (Neon DB Integration)

The production configuration removes the local database service and connects directly to your Neon managed instance.

Build and launch:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### Build Arguments in Production
The frontend Vite container builds the static bundle *at build time*, meaning environment variables must be passed as Docker build arguments:
- `VITE_API_URL`: The backend API domain (e.g. `https://api.conflux.com`).
- `VITE_GOOGLE_CLIENT_ID`: The Google OAuth client credentials.

These can be configured in your environment or directly inside the `.env` file referenced by compose.
