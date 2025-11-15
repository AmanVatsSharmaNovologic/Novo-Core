/**
* File: src/modules/auth/management/management.module.ts
* Module: modules/auth/management
* Purpose: GraphQL management module for tenants and users
* Author: Cursor / BharatERP
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

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User, Invitation, Role, UserRole, Permission, RolePermission]), PasswordsModule, RbacModule],
  providers: [TenantResolver, UserResolverGql],
  controllers: [OrgsController, InvitationsController, RolesController, PermissionsController],
})
export class ManagementModule {}


