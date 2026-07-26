# Conflux Storage Architecture & Routing Strategy

## Storage Manager & Provider Abstraction

Conflux encapsulates storage operations behind a generic provider interface (`BaseStorageProvider`), isolating backend business logic from cloud API differences.

```
                  ┌───────────────────────┐
                  │    StorageManager     │
                  └───────────┬───────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
    ┌──────────▼──────────┐       ┌──────────▼──────────┐
    │ GoogleDriveProvider │       │ S3 / Dropbox (v2)  │
    └─────────────────────┘       └─────────────────────┘
```

---

## Placement Strategy: `MostFreeSpaceStrategy`

When a file upload request arrives:
1. Conflux queries active `StorageAccount` instances for the user.
2. Calculates available free space (`total_storage - used_storage`) for each account.
3. Selects the account with the **largest available quota**.
4. Uploads the file into the `Conflux` workspace folder on that drive.
5. Logs the activity event in `ActivityLog`.
