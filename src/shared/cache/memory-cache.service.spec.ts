/**
 * @file src/shared/cache/memory-cache.service.spec.ts
 * @module shared/cache
 * @description Unit tests for MemoryCacheService behavior (CRUD, TTL, eviction)
 * @author BharatERP
 * @created 2025-11-24
 */

import { MemoryCacheService } from './memory-cache.service';

describe('MemoryCacheService', () => {
  it('stores and retrieves values by key', async () => {
    const service = new MemoryCacheService({ maxEntries: 10, defaultTtlMs: 1_000 });

    await service.set('foo', 'bar');
    const value = await service.get<string>('foo');

    expect(value).toBe('bar');
  });

  it('expires entries after TTL', async () => {
    const service = new MemoryCacheService({ maxEntries: 10, defaultTtlMs: 20 });

    await service.set('temp', 42);
    await new Promise((resolve) => setTimeout(resolve, 30));

    const value = await service.get<number>('temp');
    expect(value).toBeUndefined();
  });

  it('evicts least recently used entry when capacity exceeded', async () => {
    const service = new MemoryCacheService({ maxEntries: 2, defaultTtlMs: 1_000 });

    await service.set('a', 1);
    await service.set('b', 2);
    // Access 'a' so that 'b' becomes LRU
    await service.get('a');
    await service.set('c', 3);

    const a = await service.get<number>('a');
    const b = await service.get<number>('b');
    const c = await service.get<number>('c');

    expect(a).toBe(1);
    expect(b).toBeUndefined();
    expect(c).toBe(3);
  });
});


