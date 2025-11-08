---
title: Util Module
description: Lightweight utilities used by GraphQL resolvers or services
updated: 2025-11-08 IST
---

Purpose
- Provide simple helpers/services that are feature-agnostic but not cross-cutting

Boundaries
- Keep generic; move cross-cutting to `src/shared/` if needed by many features
- No business logic

Contents
- `util.module.ts`, `util.service.ts`

Changelog
- 2025-11-08: Initial module extraction and docs


