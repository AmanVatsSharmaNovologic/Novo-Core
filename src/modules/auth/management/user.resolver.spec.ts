/**
 * @file user.resolver.spec.ts
 * @module modules/auth/management
 * @description Unit tests for UserResolverGql covering user registration path.
 *              Mocks repository to verify basic persistence contract and DTO flow.
 * @author BharatERP
 * @created 2025-11-15
 */
import { UserResolverGql } from './user.resolver';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordService } from '../passwords/services/password.service';
import { Tenant } from '../entities/tenant.entity';

function repoMock() {
  const store: any[] = [];
  return {
    find: async (opts?: any) => {
      const where = opts?.where;
      if (!where) return store;
      return store.filter(u => Object.keys(where).every(k => (u as any)[k] === (where as any)[k]));
    },
    findOne: async (opts: any) => {
      const where = opts?.where ?? {};
      return store.find(r => Object.keys(where).every(k => (r as any)[k] === (where as any)[k]));
    },
    create: (u: any) => ({ id: `u-${store.length + 1}`, ...u }),
    save: async (u: any) => {
      store.push(u);
      return u;
    },
  } as unknown as Repository<User>;
}

describe('UserResolverGql', () => {
  it('registers a new user', async () => {
    const repo = repoMock();
    const tenantRepo = {} as Repository<Tenant>;
    const passwords: Partial<PasswordService> = {
      hashPassword: jest.fn(async () => 'hashed'),
    };
    const rbac: any = {
      getUserRoleNames: jest.fn(),
    };
    const audit: any = {
      logEvent: jest.fn(),
    };
    const logger: any = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const sessions: any = {
      listSessionsForUser: jest.fn(),
      findSessionInTenant: jest.fn(),
      revokeSession: jest.fn(),
    };

    const resolver = new UserResolverGql(
      repo,
      tenantRepo,
      passwords as PasswordService,
      rbac,
      audit,
      logger,
      sessions,
    );
    const out = await resolver.registerUser({
      tenantId: 't-1',
      email: 'alice@example.com',
      password: 'Password123',
    });
    expect(out.id).toBeDefined();
    expect(out.email).toBe('alice@example.com');
  });
});


