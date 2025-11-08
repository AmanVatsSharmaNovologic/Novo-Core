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
import { RbacService } from './rbac.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { ScopesGuard } from './scopes.guard';
import { AccessTokenGuard } from './access-token.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, Role])],
  providers: [PolicyGuard, ScopesGuard, AccessTokenGuard, RbacService],
  exports: [PolicyGuard, ScopesGuard, AccessTokenGuard, RbacService],
})
export class RbacModule {}


