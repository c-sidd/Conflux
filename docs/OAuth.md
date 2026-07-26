# Google OAuth 2.0 Integration & Setup Guide

Conflux integrates with Google Drive API v3 using Google OAuth 2.0.

---

## Required OAuth Scopes

- `https://www.googleapis.com/auth/drive.file` — View and manage Google Drive files and folders created or opened by Conflux.
- `https://www.googleapis.com/auth/userinfo.email` — Access primary email address for account identification.

---

## Production OAuth Setup Checklist

1. **Google Cloud Console**: Go to [console.cloud.google.com](https://console.cloud.google.com).
2. **Create Project**: Name: `Conflux Storage OS`.
3. **Enable APIs**: Enable **Google Drive API**.
4. **OAuth Consent Screen**:
   - User Type: External.
   - App Name: `Conflux`.
   - Support Email: `support@conflux.app`.
   - Authorized Domains: `conflux.app`, `railway.app`, `vercel.app`.
5. **Credentials**: Create OAuth 2.0 Web Application Client ID:
   - **Authorized JavaScript Origins**:
     - `http://localhost:3000`
     - `https://conflux-frontend.vercel.app`
     - `https://your-domain.com`
   - **Authorized Redirect URIs**:
     - `http://localhost:3000/dashboard/storage/callback`
     - `https://conflux-frontend.vercel.app/dashboard/storage/callback`
     - `https://your-domain.com/dashboard/storage/callback`
