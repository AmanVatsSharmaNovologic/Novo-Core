/**
 * @file org.resolver.ts
 * @module modules/auth/management
 * @description GraphQL resolvers for organisations and team membership.
 * @author BharatERP
 * @created 2025-11-24
 */

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OrgGql, OrgMemberGql, InvitationResultGql } from './dtos/graphql-types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Invitation } from '../entities/invitation.entity';
import { Role } from '../entities/role.entity';
import { UpdateMemberRolesInput } from './dtos/update-member-roles.input';
import { InviteMemberInput } from './dtos/invite-member.input';
import { CreateOrgInput } from './dtos/create-org.input';
import { UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { GraphqlAuthGuard } from '../rbac/graphql-auth.guard';
import { RequestContext } from '../../../shared/request-context';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { LoggerService } from '../../../shared/logger';
import { randomUUID, createHash } from 'crypto';

@Resolver(() => OrgGql)
@UseGuards(GraphqlAuthGuard)
export class OrgResolverGql {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Invitation) private readonly invites: Repository<Invitation>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Return the current organisation context for the caller.
   * For now this is limited to the active tenant in RequestContext.
   */
  @Query(() => [OrgGql])
  async meOrgs(): Promise<OrgGql[]> {
    const tenantId = RequestContext.get()?.tenantId;
    if (!tenantId) {
      return [];
    }
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    if (!tenant) return [];
    return [
      {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
      },
    ];
  }

  /**
   * List members of an organisation with their roles.
   */
  @Query(() => [OrgMemberGql])
  async orgMembers(@Args('tenantId', { type: () => String }) tenantId: string): Promise<OrgMemberGql[]> {
    this.ensureTenantScope(tenantId);
    const users = await this.users.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    const results: OrgMemberGql[] = [];
    for (const u of users) {
      const roles = await this.rbac.getUserRoleNames(tenantId, u.id);
      results.push({
        userId: u.id,
        tenantId,
        email: u.email,
        status: u.status,
        roles,
      });
    }
    return results;
  }

  /**
   * Create a new organisation (tenant).
   * - Seeds basic tenant data.
   * - Does not automatically invite an owner; use inviteMember for that.
   */
  @Mutation(() => OrgGql)
  async createOrg(@Args('input') input: CreateOrgInput): Promise<OrgGql> {
    const existing = await this.tenants.findOne({ where: { slug: input.slug } });
    if (existing) {
      throw new HttpException(
        { code: 'ORG_SLUG_TAKEN', message: 'Organisation slug already exists' },
        HttpStatus.CONFLICT,
      );
    }
    const tenant = this.tenants.create({
      slug: input.slug,
      name: input.name,
      status: 'active',
    });
    const saved = await this.tenants.save(tenant);

    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: saved.id,
      actorId,
      type: 'org.created',
      resource: saved.id,
      metadata: { slug: saved.slug, name: saved.name },
    });
    this.logger.info({ tenantId: saved.id, slug: saved.slug }, 'Organisation created via GraphQL');

    return {
      id: saved.id,
      slug: saved.slug,
      name: saved.name,
      status: saved.status,
    };
  }

  /**
   * Invite a member to an organisation, returning a one-time invite token.
   * Frontends should send the token via email rather than persisting it.
   */
  @Mutation(() => InvitationResultGql)
  async inviteMember(@Args('input') input: InviteMemberInput): Promise<InvitationResultGql> {
    this.ensureTenantScope(input.tenantId);
    await this.ensureAdminOrOwner(input.tenantId);

    const roleName = (input.roleName || 'member').toLowerCase();
    const { token, hash, expiresAt } = this.generateInviteToken();
    const inv = this.invites.create({
      tenantId: input.tenantId,
      email: input.email.toLowerCase(),
      tokenHash: hash,
      roleName,
      expiresAt,
    });
    const saved = await this.invites.save(inv);

    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: 'org.invitation.created',
      resource: saved.id,
      metadata: { email: saved.email, roleName },
    });
    this.logger.info(
      { tenantId: input.tenantId, invitationId: saved.id, email: saved.email, roleName },
      'Organisation invitation created via GraphQL',
    );

    return {
      id: saved.id,
      tenantId: saved.tenantId,
      email: saved.email,
      roleName: saved.roleName,
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Update roles for a member within an organisation.
   */
  @Mutation(() => OrgMemberGql)
  async updateMemberRoles(@Args('input') input: UpdateMemberRolesInput): Promise<OrgMemberGql> {
    this.ensureTenantScope(input.tenantId);
    await this.ensureAdminOrOwner(input.tenantId);

    const user = await this.users.findOne({ where: { id: input.userId, tenantId: input.tenantId } });
    if (!user) {
      throw new HttpException({ code: 'USER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const roleNames = Array.from(new Set(input.roleNames.map((n) => n.toLowerCase())));
    // Ensure roles exist; if not, create them as simple named roles.
    const existingRoles = await this.roles.find({
      where: { tenantId: input.tenantId, name: roleNames[0] ? undefined : undefined },
    });
    const byName = new Map(existingRoles.map((r) => [r.name, r]));
    const toCreate: Role[] = [];
    for (const name of roleNames) {
      if (!byName.has(name)) {
        toCreate.push(
          this.roles.create({
            tenantId: input.tenantId,
            name,
            description: `${name} (auto-created)`,
          }),
        );
      }
    }
    if (toCreate.length > 0) {
      const created = await this.roles.save(toCreate);
      for (const r of created) {
        byName.set(r.name, r);
      }
    }

    // Delegate actual role assignment to RBAC service via user-role repository.
    // For now, we rely on RbacService consumer flows; role assignment at DB
    // level is handled by REST endpoints. A dedicated membership/role service
    // can be introduced later.

    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: 'org.member.roles_updated',
      resource: input.userId,
      metadata: { roles: roleNames },
    });

    const roles = await this.rbac.getUserRoleNames(input.tenantId, input.userId);
    return {
      userId: user.id,
      tenantId: input.tenantId,
      email: user.email,
      status: user.status,
      roles,
    };
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

  private generateInviteToken(): { token: string; hash: string; expiresAt: Date } {
    const token = randomUUID() + '.' + randomUUID();
    const hash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    return { token, hash, expiresAt };
  }
}


