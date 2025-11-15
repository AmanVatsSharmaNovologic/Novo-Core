/**
 * @file invitations.controller.ts
 * @module modules/auth/management
 * @description REST endpoints to manage invitations: create and accept.
 * @author BharatERP
 * @created 2025-11-08
 */

import { Body, Controller, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation } from '../../entities/invitation.entity';
import { CreateInvitationDto } from '../dtos/create-invitation.dto';
import { AcceptInvitationDto } from '../dtos/accept-invitation.dto';
import { AccessTokenGuard } from '../../rbac/access-token.guard';
import { createHash, randomUUID } from 'crypto';
import { RequestContext } from '../../../../shared/request-context';
import { User } from '../../entities/user.entity';
import { PasswordService } from '../../passwords/services/password.service';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';
import { LoggerService } from '../../../../shared/logger';
import { TenantGuard } from '../../../../shared/tenancy/tenant.guard';

@Controller('/management')
export class InvitationsController {
  constructor(
    @InjectRepository(Invitation) private readonly invites: Repository<Invitation>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(UserRole) private readonly userRoles: Repository<UserRole>,
    private readonly passwords: PasswordService,
    private readonly logger: LoggerService,
  ) {}

  @Post('/orgs/:tenantId/invitations')
  @UseGuards(AccessTokenGuard, TenantGuard)
  async createInvitation(@Param('tenantId') tenantId: string, @Body() body: CreateInvitationDto) {
    const tenantHeader = RequestContext.get()?.tenantId;
    if (tenantHeader && tenantHeader !== tenantId) {
      throw new HttpException({ code: 'TENANT_MISMATCH' }, HttpStatus.BAD_REQUEST);
    }
    const roleName = (body.roleName || 'member').toLowerCase();
    const { token, hash, expiresAt } = this.generateInviteToken();
    const inv = this.invites.create({
      tenantId,
      email: body.email.toLowerCase(),
      tokenHash: hash,
      roleName,
      expiresAt,
    });
    await this.invites.save(inv);
    return {
      id: inv.id,
      token, // return once
      expiresAt,
    };
  }

  @Post('/invitations/accept')
  async acceptInvitation(@Body() body: AcceptInvitationDto) {
    const hash = createHash('sha256').update(body.token).digest('hex');
    const inv = await this.invites.findOne({ where: { tokenHash: hash } });
    if (!inv) throw new HttpException({ code: 'INVITE_INVALID' }, HttpStatus.BAD_REQUEST);
    if (inv.acceptedAt) throw new HttpException({ code: 'INVITE_USED' }, HttpStatus.BAD_REQUEST);
    if (inv.expiresAt.getTime() < Date.now()) throw new HttpException({ code: 'INVITE_EXPIRED' }, HttpStatus.BAD_REQUEST);
    // Create user in target tenant
    const existing = await this.users.findOne({ where: { tenantId: inv.tenantId, email: inv.email } });
    if (existing) throw new HttpException({ code: 'USER_EXISTS' }, HttpStatus.CONFLICT);
    const passwordHash = await this.passwords.hashPassword(body.password);
    const user = this.users.create({
      tenantId: inv.tenantId,
      email: inv.email,
      passwordHash,
      status: 'active',
    });
    const savedUser = await this.users.save(user);
    // Ensure role exists; then assign
    let role = await this.roles.findOne({ where: { tenantId: inv.tenantId, name: inv.roleName } });
    if (!role) {
      role = this.roles.create({ tenantId: inv.tenantId, name: inv.roleName, description: `${inv.roleName} (auto)` });
      await this.roles.save(role);
    }
    const ur = this.userRoles.create({ tenantId: inv.tenantId, userId: savedUser.id, roleId: role.id });
    await this.userRoles.save(ur);
    inv.acceptedAt = new Date();
    await this.invites.save(inv);
    this.logger.info({ tenantId: inv.tenantId, userId: savedUser.id, role: inv.roleName }, 'Invitation accepted');
    return { ok: true, tenantId: inv.tenantId, userId: savedUser.id, role: inv.roleName };
  }

  private generateInviteToken(): { token: string; hash: string; expiresAt: Date } {
    const token = randomUUID() + '.' + randomUUID();
    const hash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    return { token, hash, expiresAt };
  }
}


