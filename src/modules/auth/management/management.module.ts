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

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User]), PasswordsModule],
  providers: [TenantResolver, UserResolverGql],
})
export class ManagementModule {}


