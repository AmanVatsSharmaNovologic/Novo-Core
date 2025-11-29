/**
 * @file org-structure.resolver.ts
 * @module modules/auth/management
 * @description GraphQL resolvers for portfolios, projects, teams, and team members (construction SaaS org model).
 * @author BharatERP
 * @created 2025-11-29
 */

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from '../entities/portfolio.entity';
import { Project } from '../entities/project.entity';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { PortfolioGql, ProjectGql, TeamGql, TeamMemberGql } from './dtos/graphql-types';
import { CreatePortfolioInput } from './dtos/create-portfolio.input';
import { CreateProjectInput } from './dtos/create-project.input';
import { CreateTeamInput } from './dtos/create-team.input';
import { AddTeamMemberInput } from './dtos/add-team-member.input';
import { GraphqlAuthGuard } from '../rbac/graphql-auth.guard';
import { RequestContext } from '../../../shared/request-context';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { LoggerService } from '../../../shared/logger';

@Resolver()
@UseGuards(GraphqlAuthGuard)
export class OrgStructureResolverGql {
  constructor(
    @InjectRepository(Portfolio) private readonly portfolios: Repository<Portfolio>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(TeamMember) private readonly teamMembers: Repository<TeamMember>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly logger: LoggerService,
  ) {}

  // ========= Queries =========

  @Query(() => [PortfolioGql])
  async portfoliosByTenant(@Args('tenantId', { type: () => String }) tenantId: string): Promise<PortfolioGql[]> {
    this.ensureTenantScope(tenantId);
    const rows = await this.portfolios.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
    return rows.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      type: p.type,
      status: p.status,
    }));
  }

  @Query(() => [ProjectGql])
  async projectsByPortfolio(
    @Args('tenantId', { type: () => String }) tenantId: string,
    @Args('portfolioId', { type: () => String }) portfolioId: string,
  ): Promise<ProjectGql[]> {
    this.ensureTenantScope(tenantId);
    const rows = await this.projects.find({
      where: { tenantId, portfolioId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      portfolioId: p.portfolioId,
      name: p.name,
      code: p.code,
      location: p.location ?? undefined,
      status: p.status,
      startDate: p.startDate ?? undefined,
      endDate: p.endDate ?? undefined,
    }));
  }

  @Query(() => [TeamGql])
  async teamsByProject(
    @Args('tenantId', { type: () => String }) tenantId: string,
    @Args('projectId', { type: () => String }) projectId: string,
  ): Promise<TeamGql[]> {
    this.ensureTenantScope(tenantId);
    const rows = await this.teams.find({
      where: { tenantId, projectId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      projectId: t.projectId,
      name: t.name,
      kind: t.kind ?? undefined,
      description: t.description ?? undefined,
    }));
  }

  @Query(() => [TeamMemberGql])
  async teamMembersByTeam(
    @Args('tenantId', { type: () => String }) tenantId: string,
    @Args('teamId', { type: () => String }) teamId: string,
  ): Promise<TeamMemberGql[]> {
    this.ensureTenantScope(tenantId);
    const rows = await this.teamMembers.find({
      where: { tenantId, teamId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      teamId: m.teamId,
      userId: m.userId,
      roleName: m.roleName ?? undefined,
      status: m.status,
    }));
  }

  // ========= Mutations =========

  @Mutation(() => PortfolioGql)
  async createPortfolio(@Args('input') input: CreatePortfolioInput): Promise<PortfolioGql> {
    this.ensureTenantScope(input.tenantId);
    await this.ensureAdminOrOwner(input.tenantId);

    const entity = this.portfolios.create({
      tenantId: input.tenantId,
      name: input.name,
      type: input.type as any,
      status: 'active',
      description: input.description,
    });
    const saved = await this.portfolios.save(entity);

    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: 'portfolio.created',
      resource: saved.id,
      metadata: { name: saved.name, type: saved.type },
    });
    this.logger.info(
      { tenantId: input.tenantId, portfolioId: saved.id, type: saved.type },
      'Portfolio created via GraphQL',
    );

    return {
      id: saved.id,
      tenantId: saved.tenantId,
      name: saved.name,
      type: saved.type,
      status: saved.status,
    };
  }

  @Mutation(() => ProjectGql)
  async createProject(@Args('input') input: CreateProjectInput): Promise<ProjectGql> {
    this.ensureTenantScope(input.tenantId);
    await this.ensureAdminOrOwner(input.tenantId);

    const existingWithCode = await this.projects.findOne({
      where: { tenantId: input.tenantId, code: input.code },
    });
    if (existingWithCode) {
      throw new HttpException(
        { code: 'PROJECT_CODE_TAKEN', message: 'Project code already exists in tenant' },
        HttpStatus.CONFLICT,
      );
    }

    const entity = this.projects.create({
      tenantId: input.tenantId,
      portfolioId: input.portfolioId,
      name: input.name,
      code: input.code,
      location: input.location,
      status: 'active',
      startDate: input.startDate,
      endDate: input.endDate,
    });
    const saved = await this.projects.save(entity);

    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: 'project.created',
      resource: saved.id,
      metadata: { code: saved.code, name: saved.name, portfolioId: saved.portfolioId },
    });
    this.logger.info(
      { tenantId: input.tenantId, projectId: saved.id, code: saved.code },
      'Project created via GraphQL',
    );

    return {
      id: saved.id,
      tenantId: saved.tenantId,
      portfolioId: saved.portfolioId,
      name: saved.name,
      code: saved.code,
      location: saved.location ?? undefined,
      status: saved.status,
      startDate: saved.startDate ?? undefined,
      endDate: saved.endDate ?? undefined,
    };
  }

  @Mutation(() => TeamGql)
  async createTeam(@Args('input') input: CreateTeamInput): Promise<TeamGql> {
    this.ensureTenantScope(input.tenantId);
    await this.ensureProjectManagerOrAbove(input.tenantId);

    const entity = this.teams.create({
      tenantId: input.tenantId,
      projectId: input.projectId,
      name: input.name,
      kind: input.kind,
      description: input.description,
    });
    const saved = await this.teams.save(entity);

    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: 'team.created',
      resource: saved.id,
      metadata: { projectId: saved.projectId, name: saved.name, kind: saved.kind },
    });
    this.logger.info(
      { tenantId: input.tenantId, projectId: saved.projectId, teamId: saved.id },
      'Team created via GraphQL',
    );

    return {
      id: saved.id,
      tenantId: saved.tenantId,
      projectId: saved.projectId,
      name: saved.name,
      kind: saved.kind ?? undefined,
      description: saved.description ?? undefined,
    };
  }

  @Mutation(() => TeamMemberGql)
  async addTeamMember(@Args('input') input: AddTeamMemberInput): Promise<TeamMemberGql> {
    this.ensureTenantScope(input.tenantId);
    await this.ensureProjectManagerOrAbove(input.tenantId);

    const user = await this.users.findOne({ where: { id: input.userId, tenantId: input.tenantId } });
    if (!user) {
      throw new HttpException({ code: 'USER_NOT_FOUND', message: 'User not found in tenant' }, HttpStatus.NOT_FOUND);
    }

    const existing = await this.teamMembers.findOne({
      where: { tenantId: input.tenantId, teamId: input.teamId, userId: input.userId },
    });
    if (existing) {
      if (existing.status === 'removed') {
        existing.status = 'active';
        existing.roleName = input.roleName ?? existing.roleName;
        const restored = await this.teamMembers.save(existing);
        return {
          id: restored.id,
          tenantId: restored.tenantId,
          teamId: restored.teamId,
          userId: restored.userId,
          roleName: restored.roleName ?? undefined,
          status: restored.status,
        };
      }
      return {
        id: existing.id,
        tenantId: existing.tenantId,
        teamId: existing.teamId,
        userId: existing.userId,
        roleName: existing.roleName ?? undefined,
        status: existing.status,
      };
    }

    const entity = this.teamMembers.create({
      tenantId: input.tenantId,
      teamId: input.teamId,
      userId: input.userId,
      roleName: input.roleName,
      status: 'active',
    });
    const saved = await this.teamMembers.save(entity);

    const actorId = RequestContext.get()?.userId;
    await this.audit.logEvent({
      tenantId: input.tenantId,
      actorId,
      type: 'team.member.added',
      resource: saved.id,
      metadata: { teamId: saved.teamId, userId: saved.userId, roleName: saved.roleName },
    });
    this.logger.info(
      { tenantId: input.tenantId, teamId: saved.teamId, userId: saved.userId },
      'Team member added via GraphQL',
    );

    return {
      id: saved.id,
      tenantId: saved.tenantId,
      teamId: saved.teamId,
      userId: saved.userId,
      roleName: saved.roleName ?? undefined,
      status: saved.status,
    };
  }

  // ========= Helpers =========

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

  private async ensureProjectManagerOrAbove(tenantId: string): Promise<void> {
    const ctx = RequestContext.get();
    const userId = ctx?.userId;
    if (!userId) {
      throw new HttpException({ code: 'UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }
    const roles = await this.rbac.getUserRoleNames(tenantId, userId);
    if (!roles.includes('owner') && !roles.includes('admin') && !roles.includes('project-manager')) {
      throw new HttpException({ code: 'FORBIDDEN', message: 'Insufficient role' }, HttpStatus.FORBIDDEN);
    }
  }
}



