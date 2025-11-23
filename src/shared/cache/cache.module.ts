/**
 * @file cache.module.ts
 * @module shared/cache
 * @description Nest module providing MemoryCacheService with configurable options
 * @author BharatERP
 * @created 2025-11-24
 */

import { Module } from '@nestjs/common';
import { MemoryCacheService } from './memory-cache.service';
import { MEMORY_CACHE_OPTIONS } from './cache.types';

@Module({
  providers: [
    {
      provide: MEMORY_CACHE_OPTIONS,
      useValue: {
        maxEntries: 5000,
        defaultTtlMs: 60_000,
      },
    },
    MemoryCacheService,
  ],
  exports: [MemoryCacheService],
})
export class CacheModule {}



