/**
* File: src/modules/auth/rbac/rbac.module.ts
* Module: modules/auth/rbac
* Purpose: RBAC module exposing guards and decorators
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Register PolicyGuard locally or globally as needed
*/

import { Module } from '@nestjs/common';
import { PolicyGuard } from './policy.guard';

@Module({
  providers: [PolicyGuard],
  exports: [PolicyGuard],
})
export class RbacModule {}


