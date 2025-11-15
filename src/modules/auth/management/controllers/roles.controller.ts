/**
* File: src/modules/auth/management/controllers/roles.controller.ts
* Module: modules/auth/management
* Description: REST endpoints to manage roles and their permissions per tenant.
* Author: BharatERP
* @created 2025-11-15
*/

import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { SetRolePermissionsDto } from '../dtos/set-role-permissions.dto';
import { AccessTokenGuard } from '../../rbac/access-token.guard';
import { TenantGuard } from '../../../../shared/tenancy/tenant.guard';

@Controller('/management/orgs/:tenantId/roles')
@UseGuards(AccessTokenGuard, TenantGuard)
export class RolesController {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly perms: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePerms: Repository<RolePermission>,
  ) {}

  @Get()
  async list(@Param('tenantId') tenantId: string) {
    const rows = await this.roles.find({ where: { tenantId }, order: { name: 'ASC' } });
    return rows.map((r) => ({ id: r.id, name: r.name, description: r.description }));
  }

  @Post()
  async create(@Param('tenantId') tenantId: string, @Body() body: CreateRoleDto) {
    const exists = await this.roles.findOne({ where: { tenantId, name: body.name.toLowerCase() } });
    if (exists) throw new HttpException({ code: 'ROLE_EXISTS' }, HttpStatus.CONFLICT);
    const row = this.roles.create({ tenantId, name: body.name.toLowerCase(), description: body.description });
    const saved = await this.roles.save(row);
    return { id: saved.id, name: saved.name, description: saved.description };
  }

  @Post('/:roleId/permissions')
  async setPermissions(
    @Param('tenantId') tenantId: string,
    @Param('roleId') roleId: string,
    @Body() body: SetRolePermissionsDto,
  ) {
    const role = await this.roles.findOne({ where: { id: roleId, tenantId } });
    if (!role) throw new HttpException({ code: 'ROLE_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const keys = Array.from(new Set(body.permissionKeys.map((k) => k.toLowerCase())));
    const perms = await this.perms.find({ where: { tenantId, key: In(keys) } });
    const permsByKey = new Map(perms.map((p) => [p.key, p]));
    const missing = keys.filter((k) => !permsByKey.has(k));
    if (missing.length > 0) {
      throw new HttpException({ code: 'PERMISSIONS_NOT_FOUND', message: missing.join(',') }, HttpStatus.BAD_REQUEST);
    }

    // Remove existing then insert new for idempotency (simpler than diff)
    await this.rolePerms.delete({ tenantId, roleId });
    const rows = perms.map((p) => this.rolePerms.create({ tenantId, roleId, permissionId: p.id }));
    await this.rolePerms.save(rows);
    return { ok: true, roleId, count: rows.length };
  }
}


