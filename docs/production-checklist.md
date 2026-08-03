# Conflux Production Launch Checklist

Follow this checklist before releasing Conflux v1.0.0 to public users.

---

## 1. Secrets & Environment Variables

- [ ] Disable Debug Mode: Verify `DEBUG=False` in environment variables.
- [ ] Explicit Secrets: Verify `SECRET_KEY` and `ENCRYPTION_KEY` are explicitly configured (not using default fallbacks).
- [ ] Safe Hosts: Ensure `ALLOWED_HOSTS` only contains your specific API domain names.
- [ ] Restricted CORS: Verify `CORS_ALLOW_ALL_ORIGINS=False` and explicit allowed origins are set.
- [ ] CSRF Configuration: Confirm `CSRF_TRUSTED_ORIGINS` is configured with HTTPS schemas.

---

## 2. Infrastructure & Database

- [ ] Managed Database: Verify database points to Neon PostgreSQL (no development PostgreSQL containers in production).
- [ ] Run Migrations: Verify all Django migrations have successfully completed.
- [ ] Redis Broker: Verify Redis is running and Celery worker starts successfully.

---

## 3. Storage Providers & OAuth

- [ ] Google Client Credentials: Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correctly configured.
- [ ] Google OAuth Consent Screen: Confirm app has been submitted for verification in the Google Cloud Console.
- [ ] Redirect URIs: Verify the OAuth callback redirect URI contains the exact production URL.

---

## 4. Mail Service (SMTP)

- [ ] SMTP Credentials: Confirm `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` are set.
- [ ] STARTTLS: Confirm TLS or SSL ports (e.g. 587/465) are opened and configured correctly.
- [ ] Link Domains: Confirm `FRONTEND_URL` is set to the correct domain to generate valid verify-email/reset-password links.
