---
title: Common Module
description: Feature-scoped common utilities for the app (filters, middleware)
updated: 2025-11-08 IST
---

Purpose
- Houses request context middleware and global HTTP exception filter
- Keeps feature-scoped helpers separate from shared cross-cutting utilities

Boundaries
- Do not add business logic here
- Cross-cutting stays in `src/shared/`; domain errors remain in `src/common/errors/`

Contents
- `middleware/request-context.middleware.ts`
- `filters/http-exception.filter.ts`

Changelog
- 2025-11-08: Initial module extraction and docs
- 2025-11-15 IST: Global GraphQL driver migrated to Yoga; common middleware continues to propagate `requestId` used in GraphQL context.


