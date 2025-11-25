/**
* File: src/modules/auth/management/management.module.ts
* Module: modules/auth/management
* Purpose: GraphQL management module for tenants and users
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Extend with roles, clients, policies
*/

import { Module } from '@nestjs/common';
import { TenantResolver } from './tenant.resolver';
import { UserResolverGql } from './user.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { PasswordsModule } from '../passwords/passwords.module';
import { OrgsController } from './controllers/orgs.controller';
import { InvitationsController } from './controllers/invitations.controller';
import { Invitation } from '../entities/invitation.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { RbacModule } from '../rbac/rbac.module';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { TenantStatusGuard } from '../../../shared/tenancy/tenant-status.guard';
import { APP_GUARD } from '@nestjs/core';
import { OrgResolverGql } from './org.resolver';
import { RbacResolverGql } from './rbac.resolver';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User, Invitation, Role, UserRole, Permission, RolePermission]), PasswordsModule, RbacModule, AuditModule],
  providers: [
    TenantResolver,
    UserResolverGql,
    OrgResolverGql,
    RbacResolverGql,
    {
      provide: APP_GUARD,
      useClass: TenantStatusGuard,
    },
  ],
  controllers: [OrgsController, InvitationsController, RolesController, PermissionsController],
})
export class ManagementModule {}


