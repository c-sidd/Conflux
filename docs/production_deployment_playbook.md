# Conflux v1.0.0 Production Deployment Playbook

This playbook contains all the guides, environment references, checklists, and procedures required to deploy and operate Conflux v1.0.0 in a production environment.

---

## 📖 1. Deployment Guide

### A. Database Setup (Neon PostgreSQL)
1. Sign up/log in at [neon.tech](https://neon.tech) and create a project.
2. Under Dashboard, copy the connection URI:
   `postgresql://neondb_owner:password@ep-host.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
3. Save this value as your production database URL.

### B. Backend Deployment (Render)
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your Git repository.
3. Configure the build parameters:
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile.backend`
4. Add all environment variables listed in Section 2.
5. Deploy. Gunicorn will serve the API on port `8000`.

### C. Frontend Deployment (Vercel)
1. Log into [Vercel](https://vercel.com) and create a new project.
2. Select the repository and set the root folder to `/frontend`.
3. Set the build parameters:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the environment variables:
   - `VITE_API_URL`: Your backend API domain.
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
5. Click **Deploy**.

---

## 🔑 2. Production Environment Variable Reference

### Django Backend (Render)
| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `DEBUG` | Must be explicitly set to `False` in production. | `False` |
| `SECRET_KEY` | Secure key for cryptographic signing. | `long-random-string-here` |
| `ENCRYPTION_KEY` | 32-character AES key for encrypting OAuth tokens. | `32-char-encryption-key-here` |
| `DATABASE_URL` | Production PostgreSQL connection URL. | `postgresql://...` |
| `ALLOWED_HOSTS` | Comma-separated allowed domain headers. | `api.conflux.app` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend domains for CORS preflight. | `https://conflux.app` |
| `CSRF_TRUSTED_ORIGINS` | Trusted origins for CSRF protection. | `https://conflux.app` |
| `GOOGLE_CLIENT_ID` | Google Console OAuth Client ID. | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Google Console OAuth Client Secret. | `secret-key-here` |
| `EMAIL_HOST_USER` | Gmail address for SMTP server. | `conflux.hq@gmail.com` |
| `EMAIL_HOST_PASSWORD` | App password generated from Gmail. | `abcd-efgh-ijkl-mnop` |
| `FRONTEND_URL` | Core production web client URL. | `https://conflux.app` |

### React Frontend (Vercel)
| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Endpoint targeting the backend Web Service. | `https://api.conflux.app` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID matching the backend. | `xxxx.apps.googleusercontent.com` |

---

## 📝 3. Deployment Checklist

- [ ] Run backend tests locally: `python manage.py test --keepdb` (17/17 OK).
- [ ] Run frontend build locally: `npm run build` (Clean build).
- [ ] Export database backup from Neon before executing updates.
- [ ] Configure all Vercel environment variables.
- [ ] Configure all Render environment variables.
- [ ] Add the production redirect callback to Google Cloud Console Credentials page.
- [ ] Run health check: `GET /api/v1/health/` returns 200 OK.
- [ ] Confirm email verification, file upload, and download work.

---

## ⚡ 4. Rollback Procedure

If a major incident occurs during production deployment:

### Backend Rollback
1. Go to the Render Web Service dashboard.
2. Select **Activity** and locate the previous successful deployment.
3. Click the options menu and select **Rollback to this deploy**.
4. If database migration issues are present, access the Render shell terminal and execute:
   ```bash
   python manage.py migrate <app_name> <previous_successful_migration_name>
   ```

### Frontend Rollback
1. Open the Vercel project dashboard.
2. Go to the **Deployments** tab.
3. Select the previous stable deployment and click **Promote to Production**.

---

## 🚀 5. Final Release Notes (v1.0.0)

### What's New
- **Multi-Account Storage Pooling**: Connect and pool storage space across multiple cloud drives dynamically.
- **Smart Placement Engine**: Automatic upload routing using the `MostFreeSpaceStrategy` strategy.
- **Session Revocation Middleware**: Injected `session_jti` claim to monitor active device logins and enforce session termination.
- **Direct Auth & Password Recovery**: Native JWT-based credentials registration, password recovery via SMTP, and email verification.
- **High-Performance Explorer UI**: Re-architected in React 19 and Vite with grid views, drag-and-drop zones, and conflict resolution modal alerts.
- **Production Hardened**: Replaced print statements with structured logging, restricted wildcard origins, and enforced non-root execution inside backend containers.
