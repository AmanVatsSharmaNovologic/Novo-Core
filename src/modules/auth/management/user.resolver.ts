/**
* File: src/modules/auth/management/user.resolver.ts
* Module: modules/auth/management
* Purpose: GraphQL resolver for users
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Minimal queries for now
*/

import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UserGql } from './dtos/graphql-types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RegisterUserInput } from './dtos/register-user.input';
import { PasswordService } from '../passwords/services/password.service';

@Resolver(() => UserGql)
export class UserResolverGql {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly passwords: PasswordService,
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
      throw new Error('User already exists');
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
}


