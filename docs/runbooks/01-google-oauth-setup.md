# Google Cloud OAuth 2.0 Setup Guide for Conflux

This guide outlines the exact setup needed to connect real Google Drive accounts to Conflux.

## 1. Create Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top navigation bar and select **New Project**.
3. Name the project `Conflux` and click **Create**.

## 2. Enable Google Drive API
1. In the navigation menu, go to **APIs & Services > Library**.
2. Search for `Google Drive API`.
3. Click on **Google Drive API** and select **Enable**.

## 3. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Choose **External** user type and click **Create**.
3. Fill in the required fields:
   - **App name**: `Conflux`
   - **User support email**: Your support or administrator email.
   - **Developer contact information**: Your contact email.
4. Click **Save and Continue**.

### Scopes
1. Click **Add or Remove Scopes**.
2. For Phase 1 broad Google Drive browsing, file management, uploads, and cross-account coordination, select:
   - `https://www.googleapis.com/auth/drive` (Restricted Scope: Full Drive access for user-authorized management)
3. Click **Update** and then **Save and Continue**.

### Test Users
1. While the app is in "Testing" mode, only explicitly declared test users can authenticate.
2. Click **Add Users**.
3. Add the email addresses of the Google accounts you will use for testing (e.g., your primary and secondary test Google accounts).
4. Click **Save and Continue**.

## 4. Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Conflux Web Client`.
5. Under **Authorized redirect URIs**, click **Add URI**:
   - For Local Development: `http://localhost:8000/api/v1/accounts/google/callback`
   - For Production: `https://api.yourdomain.com/api/v1/accounts/google/callback`
6. Click **Create**.
7. Copy the generated **Client ID** and **Client Secret**.

## 5. Configure Conflux Environment
Add the copied values to your `.env` file (or AWS Secrets Manager):
```bash
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/accounts/google/callback
USE_FAKE_STORAGE_PROVIDER=false
```

## 6. Google Verification Gate (Production Requirement)
Because `https://www.googleapis.com/auth/drive` is classified by Google as a **Restricted Scope**:
- Before making Conflux publicly available to arbitrary Google users outside your test list, you must submit the application for Google Verification.
- Requirements include:
  1. A publicly accessible Privacy Policy URL explaining file data retention.
  2. A YouTube demonstration video showing the OAuth flow and why Drive access is required.
  3. Completion of a CASA (Cloud Application Security Assessment) Tier 2 evaluation if mandated by Google for restricted-scope data handling.
- **Never claim Google has approved the application until this verification process is officially certified.**
