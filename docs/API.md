# Conflux REST API Documentation (v1)

All endpoints are versioned under `/api/v1/` and require `Authorization: Bearer <jwt_access_token>`.

---

## Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register/` | Register new Conflux user account |
| `POST` | `/api/v1/auth/login/` | Log in and obtain JWT access/refresh tokens |
| `POST` | `/api/v1/auth/refresh/` | Refresh JWT access token |

---

## Workspace Explorer & File Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/files/` | List non-trashed files |
| `POST` | `/api/v1/files/` | Upload file (multipart form data) |
| `GET` | `/api/v1/files/{id}/download/` | Stream binary file download |
| `PATCH` | `/api/v1/files/{id}/` | Rename file |
| `DELETE` | `/api/v1/files/{id}/` | Move file to Trash |
| `POST` | `/api/v1/files/{id}/restore/` | Restore file from Trash |
| `POST` | `/api/v1/files/{id}/favorite/` | Toggle file favorite star |
| `POST` | `/api/v1/files/bulk-delete/` | Soft delete multiple selected files |
| `POST` | `/api/v1/files/bulk-download/` | Download multiple selected files as ZIP |

---

## Storage Accounts & Operations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/storage/accounts/` | List connected storage accounts |
| `GET` | `/api/v1/storage/accounts/google-auth-url/` | Generate Google OAuth authorization URL |
| `POST` | `/api/v1/storage/accounts/connect-oauth/` | Exchange OAuth code and link storage account |
| `POST` | `/api/v1/storage/accounts/{id}/test-connection/` | Test connection and update health status |
| `POST` | `/api/v1/storage/accounts/{id}/sync-quota/` | Refresh drive storage quotas |
| `GET` | `/api/v1/storage/accounts/{id}/disconnect-preview/` | Analyze files/folders for safe disconnection |
