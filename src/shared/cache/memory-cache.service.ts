/**
 * @file memory-cache.service.ts
 * @module shared/cache
 * @description Simple in-memory LRU cache with TTL; swappable for Redis later
 * @author BharatERP
 * @created 2025-11-16
 */

import { Injectable } from '@nestjs/common';
import { CacheOptions, CacheProvider } from './cache.types';

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class MemoryCacheService implements CacheProvider {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(options: CacheOptions = { maxEntries: 5000, defaultTtlMs: 60_000 }) {
    this.maxEntries = options.maxEntries ?? 5000;
    this.defaultTtlMs = options.defaultTtlMs ?? 60_000;
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh LRU: move to end
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      // evict least-recently used (first inserted)
      const oldestKey = this.store.keys().next().value as string | undefined;
      if (oldestKey) this.store.delete(oldestKey);
    }
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}


