/**
 * @file cache.types.ts
 * @module shared/cache
 * @description Cache interfaces for pluggable caching (memory now, Redis later)
 * @author BharatERP
 * @created 2025-11-16
 */

export interface CacheProvider {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export interface CacheOptions {
  maxEntries?: number;
  defaultTtlMs?: number;
}

// DI token used to configure MemoryCacheService options via Nest providers.
export const MEMORY_CACHE_OPTIONS = 'MEMORY_CACHE_OPTIONS';


