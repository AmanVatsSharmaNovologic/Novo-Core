/**
* File: src/modules/auth/rbac/permissions.service.ts
* Module: modules/auth/rbac
* Description: Resolve effective permissions for a user within a tenant (DB-only).
* Author: BharatERP
* @created 2025-11-15
*/

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Permission } from '../entities/permission.entity';
import { MemoryCacheService } from '../../../shared/cache/memory-cache.service';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePermission) private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    private readonly cache: MemoryCacheService,
  ) {}

  async getPermissionsForUser(tenantId: string, userId: string): Promise<string[]> {
    const cacheKey = `perm:${tenantId}:${userId}`;
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) return cached;

    const userRoles = await this.userRoleRepo.find({ where: { tenantId, userId } });
    if (userRoles.length === 0) return [];
    const roleIds = userRoles.map((ur) => ur.roleId);

    const rolePerms = await this.rolePermRepo.find({
      where: { tenantId, roleId: In(roleIds) },
    });
    if (rolePerms.length === 0) return [];
    const permissionIds = rolePerms.map((rp) => rp.permissionId);

    const perms = await this.permRepo.findBy({ id: In(permissionIds) });
    const keys = new Set(perms.map((p) => p.key));
    const result = Array.from(keys).sort();
    await this.cache.set(cacheKey, result, 60_000);
    return result;
  }
}


