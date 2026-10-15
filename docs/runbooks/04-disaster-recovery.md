# Disaster Recovery, Backups, and Incident Response

## 1. Google Account Reauthorization (NEEDS_REAUTH)
When Google invalidates an account's refresh token (e.g. user revoked consent via Google Security dashboard, password changed, or enterprise policy forced token expiry):
1. The backend automatically catches the `invalid_grant` error and marks the account status as `NEEDS_REAUTH`.
2. The UI immediately displays an amber "Needs Attention" badge on that account.
3. User navigates to **Connected Accounts** and clicks **Sync Now** or **Reconnect**.
4. The OAuth flow is triggered to obtain a fresh refresh token.
5. All other connected Google accounts remain fully operational without disruption.

---

## 2. Cross-Account Move Source Deletion Recovery
In the event that destination copy verification succeeded, but source removal failed:
1. Conflux marks the operation status as `PARTIAL`.
2. The verified copy in the destination account is **preserved intact**.
3. Conflux does not automatically roll back or delete the destination file.
4. The user or operator can inspect the item in the Operations Center and manually re-trigger source deletion once network or quota issues resolve.

---

## 3. Database Restoration (RDS PostgreSQL)
Conflux uses Amazon RDS automated point-in-time recovery (PITR).
To restore from a backup:
```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier conflux-production-db \
  --target-db-instance-identifier conflux-production-db-restored \
  --restore-time 2026-10-11T12:00:00Z
```
Once restored, verify schema integrity and point the ECS task definition `DATABASE_URL` secret to the restored endpoint.
