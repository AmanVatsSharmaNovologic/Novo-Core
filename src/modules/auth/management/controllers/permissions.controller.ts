/**
* File: src/modules/auth/management/controllers/permissions.controller.ts
* Module: modules/auth/management
* Description: REST endpoints to manage permissions per tenant.
* Author: BharatERP
* @created 2025-11-15
*/

import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../entities/permission.entity';
import { CreatePermissionDto } from '../dtos/create-permission.dto';
import { AccessTokenGuard } from '../../rbac/access-token.guard';
import { TenantGuard } from '../../../../shared/tenancy/tenant.guard';

@Controller('/management/orgs/:tenantId/permissions')
@UseGuards(AccessTokenGuard, TenantGuard)
export class PermissionsController {
  constructor(@InjectRepository(Permission) private readonly perms: Repository<Permission>) {}

  @Get()
  async list(@Param('tenantId') tenantId: string) {
    const rows = await this.perms.find({ where: { tenantId }, order: { key: 'ASC' } });
    return rows.map((p) => ({ id: p.id, key: p.key, description: p.description }));
  }

  @Post()
  async create(@Param('tenantId') tenantId: string, @Body() body: CreatePermissionDto) {
    const key = body.key.toLowerCase();
    const exists = await this.perms.findOne({ where: { tenantId, key } });
    if (exists) throw new HttpException({ code: 'PERMISSION_EXISTS' }, HttpStatus.CONFLICT);
    const row = this.perms.create({ tenantId, key, description: body.description });
    const saved = await this.perms.save(row);
    return { id: saved.id, key: saved.key, description: saved.description };
  }
}


