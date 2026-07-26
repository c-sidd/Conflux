# Conflux System Architecture

**Version**: 1.0  
**Tagline**: Many Clouds. One Workspace.

---

## High-Level Overview

Conflux is a unified cloud storage orchestration platform that pools multiple cloud storage accounts (e.g., Google Drive) into a single virtual filesystem. 

```
                               ┌─────────────────────────┐
                               │     Next.js 16 Web      │
                               │   (Google Drive Style)  │
                               └────────────┬────────────┘
                                            │ HTTP / JWT
                               ┌────────────▼────────────┐
                               │   Django REST Framework │
                               │        API v1           │
                               └──────┬───────────┬──────┘
                                      │           │
                       ┌──────────────▼─┐       ┌─▼──────────────┐
                       │ PostgreSQL 15  │       │ Redis 7 /      │
                       │ DB & Metadata  │       │ Celery Tasks   │
                       └────────────────┘       └─┬──────────────┘
                                                  │
                                       ┌──────────▼──────────┐
                                       │ Google Drive API v3 │
                                       │ (Conflux Workspace) │
                                       └─────────────────────┘
```

---

## Core Technical Principles

1. **Storage Pooling**: Virtual capacity is calculated dynamically by summing `total_storage` and `used_storage` across all active connected accounts.
2. **MostFreeSpace Placement**: Uploads use `MostFreeSpaceStrategy` to route new files to the provider account with the largest available quota.
3. **Workspace Isolation**: Conflux operates strictly inside its designated `Conflux` root folder on Google Drive. Personal files outside this directory are completely isolated.
4. **Desktop Operating System UX**: 48px row heights, Google Drive style list views, single/double click semantics, context menus, keyboard shortcuts (`Cmd+K`, `F2`, `Delete`), and non-blocking background upload queue drawers.
