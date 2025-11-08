/**
 * @file orgs.controller.ts
 * @module modules/auth/management
 * @description REST endpoints to create organisations (tenants) and seed owner invitation.
 * @author BharatERP
 * @created 2025-11-08
 */

import { Body, Controller, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../entities/tenant.entity';
import { CreateOrgDto } from '../dtos/create-org.dto';
import { AccessTokenGuard } from '../../rbac/access-token.guard';
import { Invitation } from '../../entities/invitation.entity';
import { randomUUID, createHash } from 'crypto';
import { Role } from '../../entities/role.entity';

@Controller('/management/orgs')
export class OrgsController {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Invitation) private readonly invites: Repository<Invitation>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async createOrg(@Body() body: CreateOrgDto) {
    const existing = await this.tenants.findOne({ where: { slug: body.slug } });
    if (existing) {
      throw new HttpException({ code: 'ORG_SLUG_TAKEN', message: 'Organisation slug already exists' }, HttpStatus.CONFLICT);
    }
    const tenant = this.tenants.create({ slug: body.slug, name: body.name, status: 'active' });
    const saved = await this.tenants.save(tenant);
    // Ensure 'owner' role exists for this tenant
    let ownerRole = await this.roles.findOne({ where: { tenantId: saved.id, name: 'owner' } });
    if (!ownerRole) {
      ownerRole = this.roles.create({ tenantId: saved.id, name: 'owner', description: 'Organisation owner' });
      await this.roles.save(ownerRole);
    }
    // Create owner invitation
    const { token, hash, expiresAt } = this.generateInviteToken();
    const inv = this.invites.create({
      tenantId: saved.id,
      email: body.ownerEmail.toLowerCase(),
      tokenHash: hash,
      roleName: 'owner',
      expiresAt,
    });
    await this.invites.save(inv);
    return {
      tenantId: saved.id,
      invite: {
        id: inv.id,
        token, // return once; FE should send via email and not store server-side
        expiresAt,
      },
    };
  }

  private generateInviteToken(): { token: string; hash: string; expiresAt: Date } {
    const token = randomUUID() + '.' + randomUUID();
    const hash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    return { token, hash, expiresAt };
  }
}


