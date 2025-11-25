/**
* File: src/modules/auth/management/tenant.resolver.ts
* Module: modules/auth/management
* Purpose: GraphQL resolver for tenants
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Minimal queries for now
*/

import { Resolver, Query } from '@nestjs/graphql';
import { TenantGql } from './dtos/graphql-types';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Repository } from 'typeorm';

@Resolver(() => TenantGql)
export class TenantResolver {
  constructor(@InjectRepository(Tenant) private readonly repo: Repository<Tenant>) {}

  @Query(() => [TenantGql])
  async tenants(): Promise<TenantGql[]> {
    const rows = await this.repo.find({ take: 50, order: { createdAt: 'DESC' } });
    return rows.map((t) => ({ id: t.id, slug: t.slug, name: t.name, status: t.status }));
  }
}


