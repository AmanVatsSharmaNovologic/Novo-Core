/**
 * File: src/modules/auth/rbac/rbac.module.ts
 * Module: modules/auth/rbac
 * Purpose: RBAC module exposing guards and decorators
 * Author: Aman Sharma / Novologic
 * Last-updated: 2025-11-24
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
import { RolePermission } from '../entities/role-permission.entity';
import { Permission } from '../entities/permission.entity';
import { PermissionsService } from './permissions.service';
import { AuthClaimsGuard } from './auth-claims.guard';
import { CacheModule } from '../../../shared/cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, Role, RolePermission, Permission]), CacheModule],
  providers: [PolicyGuard, ScopesGuard, AccessTokenGuard, RbacService, PermissionsService, AuthClaimsGuard],
  exports: [PolicyGuard, ScopesGuard, AccessTokenGuard, RbacService, PermissionsService, AuthClaimsGuard],
})
export class RbacModule {}


