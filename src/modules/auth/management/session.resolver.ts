/**
 * @file session.resolver.ts
 * @module modules/auth/management
 * @description GraphQL resolvers for session management (self-service + admin).
 * @author Aman Sharma / Novologic
 * @created 2025-11-25
 */

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { SessionGql } from './dtos/graphql-types';
import { ListUserSessionsInput } from './dtos/list-user-sessions.input';
import { RevokeSessionInput } from './dtos/revoke-session.input';
import { GraphqlAuthGuard } from '../rbac/graphql-auth.guard';
import { RequestContext } from '../../../shared/request-context';
import { SessionService } from '../sessions/services/session.service';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { LoggerService } from '../../../shared/logger';

@Resolver(() => SessionGql)
@UseGuards(GraphqlAuthGuard)
export class SessionResolverGql {
  constructor(
    private readonly sessions: SessionService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * List sessions for the current user in the active tenant.
   * Backed by the sessions table and refresh tokens; shows recent devices
   * and IPs so users can self-manage \"logged in devices\".
   */
  @Query(() => [SessionGql])
  async meSessions(): Promise<SessionGql[]> {
    const ctx = RequestContext.get();
    const tenantId = ctx?.tenantId;
    const userId = ctx?.userId;
    if (!tenantId || !userId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }
    const rows = await this.sessions.listSessionsForUser(tenantId, userId);
    const result = rows.map((s) => this.mapSessionToGql(s));
    await this.audit.logEvent({
      tenantId,
      actorId: userId,
      type: 'session.list.self',
      resource: undefined,
      metadata: { count: result.length },
    });
    this.logger.info({ tenantId, userId, count: result.length }, 'Listed sessions for current user via GraphQL');
    return result;
  }

  /**
   * Admin-only: list sessions for a specific user within a tenant.
   */
  @Query(() => [SessionGql])
  async userSessions(@Args('input') input: ListUserSessionsInput): Promise<SessionGql[]> {
    this.ensureTenantScope(input.tenantId);
    await this.ensureAdminOrOwner(input.tenantId);
    const rows = await this.sessions.listSessionsForUser(input.tenantId, input.userId);
    const result = rows.map((s) => this.mapSessionToGql(s));
    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: 'session.list',
      resource: input.userId,
      metadata: { count: result.length },
    });
    this.logger.info(
      { tenantId: input.tenantId, targetUserId: input.userId, count: result.length },
      'Listed sessions for user via GraphQL',
    );
    return result;
  }

  /**
   * Revoke a single session within a tenant.
   * - Self-service: a user can revoke their own sessions.
   * - Admin: owner/admins can revoke any user's session in the tenant.
   */
  @Mutation(() => Boolean)
  async revokeSession(@Args('input') input: RevokeSessionInput): Promise<boolean> {
    this.ensureTenantScope(input.tenantId);
    const ctx = RequestContext.get();
    const actorId = ctx?.userId;
    if (!actorId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }

    const session = await this.sessions.findSessionInTenant(input.tenantId, input.sessionId);
    if (!session) {
      throw new HttpException({ code: 'SESSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const isSelf = session.userId === actorId;
    if (!isSelf) {
      await this.ensureAdminOrOwner(input.tenantId);
    }

    await this.sessions.revokeSession(session.id);
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: isSelf ? 'session.revoke.self' : 'session.revoke.admin',
      resource: session.id,
      metadata: { targetUserId: session.userId },
    });
    this.logger.info(
      { tenantId: input.tenantId, actorId, sessionId: session.id, targetUserId: session.userId, isSelf },
      'Session revoked via GraphQL',
    );
    return true;
  }

  private mapSessionToGql(session: { id: string; tenantId: string; userId: string; device?: string | null; ip?: string | null; lastSeenAt?: Date | null; createdAt: Date }): SessionGql {
    return {
      id: session.id,
      tenantId: session.tenantId,
      userId: session.userId,
      device: session.device ?? undefined,
      ip: session.ip ?? undefined,
      lastSeenAt: session.lastSeenAt ? session.lastSeenAt.toISOString() : undefined,
      createdAt: session.createdAt.toISOString(),
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
}


