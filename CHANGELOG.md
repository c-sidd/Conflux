# Changelog — Conflux

All notable changes to the Conflux platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-25

### 🚀 Added & Rebranded
- **Conflux Product Rebranding**: Global platform rename to **Conflux** (*"Many Clouds. One Workspace."*).
- **Centralized Brand Modules**: `frontend/lib/brand.ts` and `backend/apps/common/branding.py`.
- **Product Metadata Endpoint**: `GET /api/v1/about/` returning product version, tagline, description, workspace root folder, and active capabilities.
- **Conflux Workspace Isolation**: Default drive root folder set to `Conflux`.
- **Architecture Freeze (v1.5A.5)**: Feature flags taxonomy (`FEATURE_FLAGS`), standard error codes taxonomy (`ErrorCode`), and Architecture Decision Records (`docs/DECISIONS.md`).
- **Production Hardening (v1.5A)**: API v1 versioning, soft-delete trash system with 8-second undo toast queue, recent items, starred favorites, properties sidebar, file preview modal, recursive folder ZIP streaming, and guided safe account removal.
- **System Health Endpoint**: `GET /api/v1/health/` monitoring database and provider connectivity.
