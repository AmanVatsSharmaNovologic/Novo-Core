/**
* File: src/shared/tenancy/tenancy.module.ts
* Module: shared/tenancy
* Purpose: Global tenancy module exposing TenantResolverService
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Consumed by middleware and services that require tenant context
*/

import { Global, Module } from '@nestjs/common';
import { TenantResolverService } from './tenant-resolver.service';

@Global()
@Module({
  providers: [TenantResolverService],
  exports: [TenantResolverService],
})
export class TenancyModule {}


