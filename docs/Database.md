# Conflux Database Schema & Entity Relationships

**Database**: PostgreSQL 15 / Neon DB  
**ORM**: Django ORM  

---

## Entity Relationship Diagram (ERD)

```
[ User ] 1 ──── N [ StorageAccount ] 1 ──── N [ StorageFolder ]
   │                                              │
   ├── 1 ──── N [ Folder ]                       1 ──── N [ File ]
   └── 1 ──── N [ ActivityLog ]
```

---

## Core Models

### `accounts.User`
Custom Django user model extending AbstractUser:
- `email` (EmailField, unique=True, db_index=True)
- `first_name`, `last_name`

### `storage.StorageAccount`
Connected cloud storage provider accounts:
- `user` (ForeignKey -> User)
- `provider` (CharField: 'google')
- `provider_account_id` (CharField)
- `provider_email` (CharField)
- `nickname` (CharField)
- `access_token` (TextField)
- `refresh_token` (TextField, AES-encrypted at rest)
- `token_expiry` (DateTimeField)
- `total_storage`, `used_storage` (BigIntegerField)
- `health_status` (CharField: 'healthy', 'expired_token', 'offline', 'unauthorized')
- `workspace_folder_id` (CharField)

### `folders.Folder`
Virtual directory tree in Conflux:
- `name` (CharField)
- `user` (ForeignKey -> User)
- `parent` (ForeignKey -> self, null=True)
- `visibility` (CharField: 'private')
- `is_trashed` (BooleanField, default=False)

### `files.File`
Stored file metadata:
- `name` (CharField)
- `user` (ForeignKey -> User)
- `folder` (ForeignKey -> Folder, null=True)
- `storage_account` (ForeignKey -> StorageAccount)
- `provider_file_id` (CharField)
- `size` (BigIntegerField)
- `mime_type` (CharField)
- `checksum` (CharField)
- `is_favorite`, `is_trashed` (BooleanField)
