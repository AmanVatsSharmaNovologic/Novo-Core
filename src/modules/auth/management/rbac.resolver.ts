/**
 * @file rbac.resolver.ts
 * @module modules/auth/management
 * @description GraphQL resolvers for roles and permissions administration.
 * @author BharatERP
 * @created 2025-11-24
 */

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PermissionGql, RoleGql } from './dtos/graphql-types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { GraphqlAuthGuard } from '../rbac/graphql-auth.guard';
import { RequestContext } from '../../../shared/request-context';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { LoggerService } from '../../../shared/logger';
import { CreateRoleInput } from './dtos/create-role.input';
import { UpdateRolePermissionsInput } from './dtos/update-role-permissions.input';

@Resolver()
@UseGuards(GraphqlAuthGuard)
export class RbacResolverGql {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly perms: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePerms: Repository<RolePermission>,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly logger: LoggerService,
  ) {}

  @Query(() => [RoleGql])
  async roles(@Args('tenantId', { type: () => String }) tenantId: string): Promise<RoleGql[]> {
    this.ensureTenantScope(tenantId);
    await this.ensureAdminOrOwner(tenantId);
    const rows = await this.roles.find({ where: { tenantId }, order: { name: 'ASC' } });
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      description: r.description ?? null,
    }));
  }

  @Query(() => [PermissionGql])
  async permissions(@Args('tenantId', { type: () => String }) tenantId: string): Promise<PermissionGql[]> {
    this.ensureTenantScope(tenantId);
    await this.ensureAdminOrOwner(tenantId);
    const rows = await this.perms.find({ where: { tenantId }, order: { key: 'ASC' } });
    return rows.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      key: p.key,
      description: p.description ?? null,
    }));
  }

  @Mutation(() => RoleGql)
  async createRole(@Args('input') input: CreateRoleInput): Promise<RoleGql> {
    this.ensureTenantScope(input.tenantId);
    await this.ensureAdminOrOwner(input.tenantId);

    const name = input.name.toLowerCase();
    const exists = await this.roles.findOne({ where: { tenantId: input.tenantId, name } });
    if (exists) {
      throw new HttpException({ code: 'ROLE_EXISTS' }, HttpStatus.CONFLICT);
    }
    const row = this.roles.create({
      tenantId: input.tenantId,
      name,
      description: input.description,
    });
    const saved = await this.roles.save(row);

    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: 'rbac.role.created',
      resource: saved.id,
      metadata: { name: saved.name },
    });
    this.logger.info(
      { tenantId: input.tenantId, roleId: saved.id, name: saved.name },
      'Role created via GraphQL',
    );

    return {
      id: saved.id,
      tenantId: saved.tenantId,
      name: saved.name,
      description: saved.description ?? null,
    };
  }

  @Mutation(() => Boolean)
  async updateRolePermissions(@Args('input') input: UpdateRolePermissionsInput): Promise<boolean> {
    this.ensureTenantScope(input.tenantId);
    await this.ensureAdminOrOwner(input.tenantId);

    const role = await this.roles.findOne({ where: { id: input.roleId, tenantId: input.tenantId } });
    if (!role) {
      throw new HttpException({ code: 'ROLE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const keys = Array.from(new Set(input.permissionKeys.map((k) => k.toLowerCase())));
    const perms = await this.perms.find({ where: { tenantId: input.tenantId, key: In(keys) } });
    const byKey = new Map(perms.map((p) => [p.key, p]));
    const missing = keys.filter((k) => !byKey.has(k));
    if (missing.length > 0) {
      throw new HttpException(
        { code: 'PERMISSIONS_NOT_FOUND', message: missing.join(',') },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.rolePerms.delete({ tenantId: input.tenantId, roleId: input.roleId });
    const rows = perms.map((p) =>
      this.rolePerms.create({
        tenantId: input.tenantId,
        roleId: input.roleId,
        permissionId: p.id,
      }),
    );
    await this.rolePerms.save(rows);

    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: 'rbac.role.permissions_updated',
      resource: input.roleId,
      metadata: { permissionKeys: keys },
    });
    this.logger.info(
      { tenantId: input.tenantId, roleId: input.roleId, count: rows.length },
      'Role permissions updated via GraphQL',
    );

    return true;
  }

  private ensureTenantScope(tenantId: string): void {
    const ctxTenant = RequestContext.get()?.tenantId;
    if (ctxTenant && ctxTenant !== tenantId) {
      throw new HttpException(
        { code: 'TENANT_MISMATCH', message: 'Tenant scope mismatch' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async ensureAdminOrOwner(tenantId: string): Promise<void> {
    const ctx = RequestContext.get();
    const userId = ctx?.userId;
    if (!userId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }
    const roles = await this.rbac.getUserRoleNames(tenantId, userId);
    if (!roles.includes('owner') && !roles.includes('admin')) {
      throw new HttpException({ code: 'FORBIDDEN', message: 'Insufficient role' }, HttpStatus.FORBIDDEN);
    }
  }
}


