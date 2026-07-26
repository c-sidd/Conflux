# Security Policy

## Reporting Vulnerabilities

The Conflux team takes security seriously. If you discover a security vulnerability within Conflux, please follow these steps:

1. **Do NOT open a public GitHub issue.**
2. Send a detailed report to `support@conflux.app`.
3. Include reproduction steps, potential impact, and proof of concept if applicable.

We aim to acknowledge reports within 24 hours and issue a patch within 7 business days.

## Security Controls

- **OAuth Tokens**: Google OAuth refresh tokens are encrypted at rest using AES cryptography (`ENCRYPTION_KEY`).
- **Workspace Isolation**: Conflux only creates and accesses its dedicated `Conflux` root folder on Google Drive. Personal files outside this folder are untouched.
- **Authentication**: JWT authentication with 60-minute token lifetime and secure HTTP headers.
