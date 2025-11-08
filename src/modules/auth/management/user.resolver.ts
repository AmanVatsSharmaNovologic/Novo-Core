/**
* File: src/modules/auth/management/user.resolver.ts
* Module: modules/auth/management
* Purpose: GraphQL resolver for users
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Minimal queries for now
*/

import { Resolver, Query, Args } from '@nestjs/graphql';
import { UserGql } from './dtos/graphql-types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Resolver(() => UserGql)
export class UserResolverGql {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

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
}


