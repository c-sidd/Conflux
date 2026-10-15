# Local Developer Workflow & Setup Guide

Conflux supports two convenient workflows for local development:
1. **Containerized Setup (Docker Compose)**: Full stack with PostgreSQL, Redis, FastAPI, Celery worker, and Vite dev server.
2. **Native Lightweight Setup**: Python virtual environment + Vite dev server (runs with in-memory SQLite / aiosqlite or local PostgreSQL, ideal for offline development and fast test runs).

---

## Option 1: Docker Compose (Full Stack)

### Prerequisites
- Docker Engine & Docker Compose installed.

### Steps
1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Start the services:
   ```bash
   docker compose up --build
   ```
3. Access the services:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
   - Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

## Option 2: Native Lightweight Setup

### Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup
1. Install Node dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start Vite development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running the Automated Test Suite

### Backend Unit & Integration Tests
```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```

### Frontend Type-Checking & Production Build
```bash
cd frontend
npm run build
```
