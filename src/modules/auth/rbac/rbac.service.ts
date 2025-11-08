/**
 * @file rbac.service.ts
 * @module modules/auth/rbac
 * @description RBAC utilities to resolve role names for a user within a tenant.
 * @author BharatERP
 * @created 2025-11-08
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  async getUserRoleNames(tenantId: string, userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepo.find({ where: { tenantId, userId } });
    if (userRoles.length === 0) return [];
    const roleIds = userRoles.map((ur) => ur.roleId);
    const roles = await this.roleRepo.findBy({ id: In(roleIds) });
    return roles.map((r) => r.name);
  }
}


