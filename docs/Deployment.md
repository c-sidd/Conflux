# Conflux SaaS Production Deployment Guide

This guide provides step-by-step instructions to deploy Conflux to production using **Vercel** (Frontend), **Railway** (Backend), **Neon** (PostgreSQL), and **Upstash** (Redis).

---

## Architecture Topology

- **Frontend**: Next.js 16 deployed on **Vercel**
- **Backend API**: Django 6.0 REST API deployed on **Railway**
- **Database**: Managed PostgreSQL 15 on **Neon**
- **Redis Cache & Broker**: Serverless Redis on **Upstash**

---

## Step 1: Database Setup (Neon PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech) and create a project named `conflux`.
2. Copy the Connection String:
   `postgresql://username:password@ep-cool-db.us-east-2.aws.neon.tech/neondb?sslmode=require`

---

## Step 2: Redis Setup (Upstash Redis)

1. Sign up at [upstash.com](https://upstash.com) and create a Redis database.
2. Copy the `rediss://...` connection URL.

---

## Step 3: Backend Deployment (Railway)

1. Sign up at [railway.app](https://railway.app) and link your GitHub repository.
2. Select root directory `/` and set Dockerfile path to `Dockerfile.backend`.
3. Configure Environment Variables:
   - `DATABASE_URL`: Your Neon connection string
   - `CELERY_BROKER_URL`: Your Upstash Redis string
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
   - `SECRET_KEY`: Long 50+ character random string
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: `.railway.app`
4. Deploy service and copy public domain (e.g., `https://conflux-backend.up.railway.app`).

---

## Step 4: Frontend Deployment (Vercel)

1. Sign up at [vercel.com](https://vercel.com) and import the `frontend` folder.
2. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://conflux-backend.up.railway.app`
3. Deploy frontend project.

---

## Step 5: Google OAuth Redirect Configuration

1. In Google Cloud Console, add:
   - **Origin**: `https://conflux-frontend.vercel.app`
   - **Redirect URI**: `https://conflux-frontend.vercel.app/dashboard/storage/callback`
