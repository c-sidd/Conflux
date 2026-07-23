# DCS (Distributed Cloud Storage)

DCS is a Virtual Distributed Cloud Storage Platform. It combines multiple independent cloud storage accounts (such as Google Drive) into a single unified virtual cloud drive. The application acts as a smart storage orchestrator.

## Core Features
- **Unified Virtual Filesystem**: View all your files across multiple Google Drive accounts in one seamless dashboard.
- **Automated Routing**: DCS automatically decides which Google account should store each uploaded file based on available quota.
- **Provider Abstraction**: Files are managed via a generic StorageManager, allowing future integrations (Dropbox, S3, etc.).
- **Smart Dashboard**: Monitor quota, storage usage, and manage your connected accounts.

## Technology Stack
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python, Django, Django REST Framework
- **Database**: PostgreSQL
- **Background Jobs**: Celery, Redis
- **Deployment**: Docker, Nginx, Gunicorn

## Setup Instructions

### Environment Variables
The configuration relies on a `.env` file at the root. Do NOT expose real credentials. Use `.env.example` as a template.

### Running Locally (Docker)
Ensure Docker and Docker Compose are installed.
```bash
docker-compose up --build
```

### Manual Setup
1. **Database**: Create a local Postgres database named `multidrive` (default).
2. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements/local.txt
   python manage.py migrate
   python manage.py runserver
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Development
- We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for version history.
- Check `ROADMAP.md` for upcoming features.
- Check `CHANGELOG.md` for the version history.
