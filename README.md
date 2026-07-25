# Conflux — Unified Multi-Cloud Storage Platform

> **Many Clouds. One Workspace.**

**Conflux** is a unified cloud storage platform that combines multiple cloud storage accounts into a single virtual workspace. Users interact with one filesystem while Conflux intelligently manages storage placement, synchronization, and orchestration across connected providers.

---

## 🌟 Key Features

- **Unified Storage Pool**: Connect multiple Google Drive accounts (and future providers like Dropbox, OneDrive, and S3) into a single virtual disk space.
- **Smart Placement Engine (`MostFreeSpaceStrategy`)**: Uploaded files are automatically routed to the account with the largest available quota.
- **Conflux Workspace Isolation**: Managed files are strictly scoped inside a dedicated `Conflux` root folder on every provider account, preserving personal drive privacy.
- **Full File Operations**: Supports Rename, Move, Copy, Multi-select Batch Actions, Properties Sidebar, File Previews, and Recursive ZIP Downloads.
- **Soft Delete & 8-Second Undo Queue**: Deletions move items to Trash with instant undo window and guided safe account removal workflow.
- **API Versioning (`/api/v1/`)**: Production-ready versioned API endpoints with standard response payloads (`{"success": true, "data": ...}`).

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React Icons.
- **Backend**: Python 3.11, Django, Django REST Framework, SimpleJWT.
- **Database & Cache**: PostgreSQL, Redis.
- **Background Jobs**: Celery, Celery Beat.
- **Containerization**: Docker, Docker Compose.

---

## 🚀 Quick Start (Local Development)

### 1. Environment Setup
Copy template `.env.example` into `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

### 2. Run with Docker Compose
```bash
docker-compose up --build
```

### 3. Run Manually
- **Backend**:
  ```bash
  cd backend
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py runserver 127.0.0.1:8000
  ```
- **Frontend**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

---

## 📄 License & Metadata
- **Platform**: Conflux
- **Version**: 1.0.0
- **Support**: support@conflux.app
