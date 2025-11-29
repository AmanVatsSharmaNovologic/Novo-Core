/**
* File: src/modules/auth/management/user.resolver.ts
* Module: modules/auth/management
* Purpose: GraphQL resolver for users and viewer context
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-25
* Notes:
* - Provides basic user admin queries plus authenticated \"me\" and settings resolvers.
*/

import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UserGql, UserSettingsGql, MeGql, OrgGql } from './dtos/graphql-types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { RegisterUserInput } from './dtos/register-user.input';
import { PasswordService } from '../passwords/services/password.service';
import { AppError } from '../../../common/errors';
import { UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { GraphqlAuthGuard } from '../rbac/graphql-auth.guard';
import { RequestContext } from '../../../shared/request-context';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { LoggerService } from '../../../shared/logger';
import { SessionService } from '../sessions/services/session.service';
import { UpdateMeSettingsInput } from './dtos/update-me-settings.input';

@Resolver(() => UserGql)
export class UserResolverGql {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly passwords: PasswordService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly logger: LoggerService,
    private readonly sessions: SessionService,
  ) {}

  @Query(() => [UserGql])
  async users(@Args('tenantId', { type: () => String, nullable: true }) tenantId?: string): Promise<UserGql[]> {
    const rows = await this.repo.find({
      where: tenantId ? { tenantId } : {},
      take: 50,
      order: { createdAt: 'DESC' },
    });
    return rows.map((u) => ({
      id: u.id,
      tenantId: u.tenantId,
      email: u.email,
      status: u.status,
    }));
  }

  @Mutation(() => UserGql)
  async registerUser(@Args('input') input: RegisterUserInput): Promise<UserGql> {
    const exists = await this.repo.findOne({ where: { tenantId: input.tenantId, email: input.email } });
    if (exists) {
      throw new AppError('CONFLICT', 'User already exists');
    }
    const hash = await this.passwords.hashPassword(input.password);
    const u = this.repo.create({
      tenantId: input.tenantId,
      email: input.email,
      passwordHash: hash,
      status: 'active',
    });
    const saved = await this.repo.save(u);
    return { id: saved.id, tenantId: saved.tenantId, email: saved.email, status: saved.status };
  }

  /**
   * Return the current authenticated user in the active tenant.
   */
  @Query(() => UserGql)
  @UseGuards(GraphqlAuthGuard)
  async meUser(): Promise<UserGql> {
    const ctx = RequestContext.get();
    const tenantId = ctx?.tenantId;
    const userId = ctx?.userId;
    if (!tenantId || !userId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }
    const user = await this.repo.findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new HttpException({ code: 'USER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    this.logger.debug({ tenantId, userId }, 'Resolved meUser via GraphQL');
    return { id: user.id, tenantId: user.tenantId, email: user.email, status: user.status };
  }

  /**
   * Read current user's settings from User.profile.
   */
  @Query(() => UserSettingsGql)
  @UseGuards(GraphqlAuthGuard)
  async meSettings(): Promise<UserSettingsGql> {
    const ctx = RequestContext.get();
    const tenantId = ctx?.tenantId;
    const userId = ctx?.userId;
    if (!tenantId || !userId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }
    const user = await this.repo.findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new HttpException({ code: 'USER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    const settings = this.mapProfileToSettings(user.profile ?? undefined);
    await this.audit.logEvent({
      tenantId,
      actorId: userId,
      type: 'user.settings.read',
      resource: user.id,
    });
    this.logger.info({ tenantId, userId }, 'Read user settings via GraphQL');
    return settings;
  }

  /**
   * Update current user's settings/preferences in User.profile.
   */
  @Mutation(() => UserSettingsGql)
  @UseGuards(GraphqlAuthGuard)
  async updateMeSettings(@Args('input') input: UpdateMeSettingsInput): Promise<UserSettingsGql> {
    const ctx = RequestContext.get();
    const tenantId = ctx?.tenantId;
    const userId = ctx?.userId;
    if (!tenantId || !userId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }
    const user = await this.repo.findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new HttpException({ code: 'USER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const before = this.mapProfileToSettings(user.profile ?? undefined);
    const nextProfile = this.applySettingsToProfile(user.profile ?? {}, input);
    user.profile = nextProfile;
    const saved = await this.repo.save(user);
    const after = this.mapProfileToSettings(saved.profile ?? undefined);

    await this.audit.logEvent({
      tenantId,
      actorId: userId,
      type: 'user.settings.updated',
      resource: user.id,
      metadata: { before, after },
    });
    this.logger.info({ tenantId, userId }, 'Updated user settings via GraphQL');

    return after;
  }

  /**
   * Mark the current user's onboarding as completed.
   * Frontends should call this after org/portfolio/project/team setup is done.
   */
  @Mutation(() => Boolean)
  @UseGuards(GraphqlAuthGuard)
  async completeOnboarding(): Promise<boolean> {
    const ctx = RequestContext.get();
    const tenantId = ctx?.tenantId;
    const userId = ctx?.userId;
    if (!tenantId || !userId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }
    const user = await this.repo.findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new HttpException({ code: 'USER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    (user as any).onboardingStep = 'DONE';
    (user as any).onboardedAt = new Date();
    await this.repo.save(user);

    await this.audit.logEvent({
      tenantId,
      actorId: userId,
      type: 'user.onboarding.completed',
      resource: user.id,
    });
    this.logger.info({ tenantId, userId }, 'User onboarding marked as DONE via GraphQL');

    return true;
  }

  /**
   * Aggregate viewer context for dashboard hydration: user, org, roles, settings, recent sessions.
   */
  @Query(() => MeGql)
  @UseGuards(GraphqlAuthGuard)
  async meDashboard(): Promise<MeGql> {
    const ctx = RequestContext.get();
    const tenantId = ctx?.tenantId;
    const userId = ctx?.userId;
    if (!tenantId || !userId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.repo.findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new HttpException({ code: 'USER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    const roles = await this.rbac.getUserRoleNames(tenantId, userId);
    const settings = this.mapProfileToSettings(user.profile ?? undefined);
    const onboardingStep = (user as any).onboardingStep ?? 'NONE';
    const sessions = await this.sessions.listSessionsForUser(tenantId, userId);
    const recentSessions = sessions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        userId: s.userId,
        device: (s as any).device ?? undefined,
        ip: (s as any).ip ?? undefined,
        lastSeenAt: (s as any).lastSeenAt ? (s as any).lastSeenAt.toISOString() : undefined,
        createdAt: s.createdAt.toISOString(),
      }));

    const org: OrgGql | undefined =
      tenant != null
        ? {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            status: tenant.status,
          }
        : undefined;

    await this.audit.logEvent({
      tenantId,
      actorId: userId,
      type: 'user.me.dashboard',
      resource: user.id,
      metadata: { roles, sessions: recentSessions.length, onboardingStep },
    });
    this.logger.info({ tenantId, userId, rolesCount: roles.length }, 'Resolved meDashboard via GraphQL');

    return {
      user: { id: user.id, tenantId: user.tenantId, email: user.email, status: user.status },
      org,
      roles,
      settings,
      recentSessions,
      onboardingStep,
      hasOrganisations: true,
    };
  }

  private mapProfileToSettings(profile?: Record<string, unknown>): UserSettingsGql {
    const p = (profile ?? {}) as any;
    return {
      timezone: typeof p.timezone === 'string' ? p.timezone : undefined,
      locale: typeof p.locale === 'string' ? p.locale : undefined,
      theme: typeof p.theme === 'string' ? p.theme : undefined,
      avatarUrl: typeof p.avatarUrl === 'string' ? p.avatarUrl : undefined,
    };
  }

  private applySettingsToProfile(
    profile: Record<string, unknown>,
    input: UpdateMeSettingsInput,
  ): Record<string, unknown> {
    const next: Record<string, unknown> = { ...profile };
    if (input.timezone !== undefined) {
      next.timezone = input.timezone;
    }
    if (input.locale !== undefined) {
      next.locale = input.locale;
    }
    if (input.theme !== undefined) {
      next.theme = input.theme;
    }
    if (input.avatarUrl !== undefined) {
      next.avatarUrl = input.avatarUrl;
    }
    return next;
  }
}


