# Conflux — Unified Multi-Cloud Storage Platform

Conflux is a unified multi-cloud storage platform that pools storage capacity across multiple connected cloud accounts (Google Drive, S3, Dropbox) into a single virtual filesystem.

---

## 🌟 Features

- **Multi-Account Storage Pooling**: Connect multiple Google Drive accounts to pool storage capacity seamlessly.
- **Smart Placement Engine (`StorageManager`)**: Automatically routes uploaded files to the connected account with the most free space (`most_free` strategy), or uses round-robin / best-fit placement.
- **High-Performance React 19 + Vite SPA**: Rebuilt from scratch with React Router DOM v7, TanStack Query, Axios, TailwindCSS, and shadcn/ui.
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

- **Frontend**: React 19, Vite v6.4, React Router DOM v7, TanStack Query v5, Axios, TailwindCSS, Lucide Icons
- **Backend**: Python 3.14, Django 5.1, Django REST Framework, SimpleJWT, Celery, Redis, drf-spectacular (OpenAPI 3.0)
- **Database**: Neon PostgreSQL

---

## ⚙️ Quick Start Guide

### 1. Environment Setup
Create environment configuration based on `.env.example`:
```bash
cp .env.example .env
cp .env.example backend/.env
cp .env.example frontend/.env
```

### 2. Start Backend Server
```bash
cd backend
.\venv\Scripts\Activate.ps1
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

## 🧪 Automated Testing

Run the Django test suite:
```bash
cd backend
python manage.py test
```
All 16 unit tests pass 100%.

---

## 📄 License
MIT License.
