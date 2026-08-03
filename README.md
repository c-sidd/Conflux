# Conflux — Unified Multi-Cloud Storage Platform

Conflux is a unified multi-cloud storage platform that aggregates storage capacity across multiple connected cloud accounts (such as Google Drive) into a single virtual filesystem.

---

## 🌟 Features

- **Multi-Account Storage Pooling**: Connect multiple Google Drive accounts to pool storage capacity seamlessly.
- **Smart Placement Engine (`StorageManager`)**: Automatically routes uploaded files to the connected account with the most free space (`most_free` strategy), or uses round-robin / best-fit placement.
- **High-Performance React 19 + Vite SPA**: Built with React Router DOM v7, TanStack Query v5, Axios, and TailwindCSS.
- **Full File & Folder Virtual Filesystem**: Nested virtual folders, breadcrumb navigation, grid/list views, multi-attribute sorting, search, quick filter pills, starred favorites, recent files, and soft-delete trash recovery.
- **Rich Desktop File Explorer UX**:
  - Drag-and-drop file upload overlay (`ExplorerDropZone`)
  - Floating multi-select batch action bar (`ExplorerFloatingBar`)
  - Native right-click context menu (`ExplorerContextMenu`)
  - Persistent properties side panel (`ExplorerProperties`)
  - Keyboard shortcuts (`Delete`, `Ctrl+A`, `Esc`)
  - Upload queue widget with MB/s transfer speed & ETA monitor (`ExplorerUploadQueue`)
  - Pre-flight duplicate filename conflict resolver (`ExplorerConflictModal`)
  - In-browser file preview modal (`FilePreviewModal` for images, PDFs, text)
  - Bulk ZIP download & folder `.zip` streaming download
- **Direct Django DRF Authentication**: Registration, login, direct JWT auth, password reset, email verification, active device session tracking, and audit logging.
- **Light / Dark Theme System**: Persisted theme switcher (`localStorage`) supporting dark mode styling.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite v6.4, React Router DOM v7, TanStack Query v5, Axios, TailwindCSS
- **Backend**: Python 3.12, Django 6.0.7, Django REST Framework, SimpleJWT, Celery, Redis, drf-spectacular (OpenAPI 3.0)
- **Database**: Neon PostgreSQL

---

## ⚙️ Quick Start Guide

### 1. Environment Setup
Create environment configuration based on `.env.example`:
```bash
cp .env.example .env
```

### 2. Start Backend Server
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Unix
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Backend API will run on **`http://127.0.0.1:8000`** (Swagger docs at **`http://127.0.0.1:8000/api/docs/`**).

### 3. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on **`http://localhost:3000`**.

---

## 🐳 Docker Deployment

### Local Development Stack
To launch the entire stack locally with postgres, redis, backend, and frontend:
```bash
docker compose up --build
```
The application will be accessible at **`http://localhost:3000`**.

### Production Stack (Neon DB)
To build and launch the production containers (without local DB, connecting directly to Neon PostgreSQL):
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

---

## 🧪 Automated Testing

Run the Django test suite:
```bash
cd backend
python manage.py test
```
All 17 unit tests pass 100% successfully.

---

## 📄 Documentation

Additional documentation is available under `/docs`:
- [System Architecture](file:///d:/CD/docs/architecture.md)
- [API Endpoints Reference](file:///d:/CD/docs/api.md)
- [Docker Setup Guide](file:///d:/CD/docs/docker.md)
- [Production Deployment Guide](file:///d:/CD/docs/deployment.md)
- [Production Launch Checklist](file:///d:/CD/docs/production-checklist.md)

---

## 📄 License
MIT License.
