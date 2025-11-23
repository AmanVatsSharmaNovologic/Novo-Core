# Module: shared/cache

**Short:** In-memory caching utilities for cross-cutting concerns (e.g. RBAC permissions).

**Purpose:** Provide a lightweight, pluggable in-memory cache (LRU + TTL) that can later be replaced by Redis or another distributed cache without touching domain logic.

**Files:**
- cache.module.ts — Nest module wiring cache providers and options
- cache.types.ts — Cache interfaces and DI tokens
- memory-cache.service.ts — In-memory LRU cache implementation
- MODULE_DOC.md — this file

**Flow diagram:** `flowcharts/shared-cache-flow.svg`

**Dependencies:**
- Internal: none (used by RBAC and other modules, but does not depend on them)
- External: NestJS DI container only

**APIs:**
- `MemoryCacheService` — async `get`, `set`, and `del` methods for arbitrary JSON-serializable values.

**Env vars:**
- (none yet; future: `CACHE_MAX_ENTRIES`, `CACHE_DEFAULT_TTL_MS` when we externalize config)

**Tests:** See `memory-cache.service.spec.ts` for behavior of TTL, eviction, and basic CRUD.

**Change-log:**
- 2025-11-24 — Introduced `CacheModule`, `MEMORY_CACHE_OPTIONS` DI token, and wired RBAC to use `MemoryCacheService` without direct constructor-type injection errors.


