/**
 * @file public-registration.service.spec.ts
 * @module modules/auth/oidc
 * @description Unit tests for PublicRegistrationService using in-memory repo mocks (no real Postgres).
 * @author BharatERP
 * @created 2025-11-25
 */

import { HttpException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PublicRegistrationService } from './public-registration.service';
import { Identity } from '../../entities/identity.entity';
import { User } from '../../entities/user.entity';
import { Membership } from '../../entities/membership.entity';
import { PasswordService } from '../../passwords/services/password.service';
import { ClientService } from '../../clients/services/client.service';

type RepoWithData<T> = Repository<T> & { __data: T[] };

function createInMemoryRepo<T extends { id?: string }>(): RepoWithData<T> {
  const store: T[] = [];
  const repo: Partial<RepoWithData<T>> = {
    __data: store,
    async findOne(opts: any): Promise<T | null> {
      const where = opts?.where ?? {};
      return (
        store.find((row) =>
          Object.keys(where).every((key) => (row as any)[key] === (where as any)[key]),
        ) ?? null
      );
    },
    create(partial: Partial<T>): T {
      return {
        id: partial.id ?? (`id-${store.length + 1}` as any),
        ...(partial as any),
      } as T;
    },
    async save(entity: T): Promise<T> {
      store.push(entity);
      return entity;
    },
  };
  return repo as RepoWithData<T>;
}

describe('PublicRegistrationService (unit, mocked DB)', () => {
  let identityRepo: RepoWithData<Identity>;
  let userRepo: RepoWithData<User>;
  let membershipRepo: RepoWithData<Membership>;
  let svc: PublicRegistrationService;

  beforeEach(() => {
    identityRepo = createInMemoryRepo<Identity>();
    userRepo = createInMemoryRepo<User>();
    membershipRepo = createInMemoryRepo<Membership>();

    const queryRunner: any = {
      manager: {
        getRepository: (entity: any) => {
          if (entity === Identity) return identityRepo;
          if (entity === User) return userRepo;
          if (entity === Membership) return membershipRepo;
          throw new Error(`Unexpected repository request for entity: ${entity?.name ?? entity}`);
        },
      },
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };

    const dataSource: Partial<DataSource> = {
      createQueryRunner: () => queryRunner as any,
    };

    const passwords: Partial<PasswordService> = {
      hashPassword: jest.fn(async () => 'hashed-password'),
    };

    const clients: Partial<ClientService> = {
      // Simulate app-spa global realm client resolving to a platform tenant
      findGlobalByClientId: jest.fn(async (clientId: string) =>
        clientId === 'app-spa'
          ? ({
              id: 'client-1',
              tenantId: 'tenant-platform-1',
              clientId: 'app-spa',
            } as any)
          : null,
      ),
    };

    const logger: any = {
      child: jest.fn(() => logger),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    svc = new PublicRegistrationService(
      dataSource as DataSource,
      passwords as PasswordService,
      clients as ClientService,
      logger,
    );
  });

  it('registers a new identity, user, and membership with normalized email', async () => {
    const result = await svc.register(' NewUser+TEST@Example.COM ', 'Password123!');

    expect(result.identityId).toBeTruthy();
    expect(result.email).toBe('newuser+test@example.com');

    const identities = identityRepo.__data;
    expect(identities).toHaveLength(1);
    expect(identities[0].email).toBe('newuser+test@example.com');
    expect(identities[0].status).toBe('active');

    const users = userRepo.__data;
    expect(users).toHaveLength(1);
    expect(users[0].tenantId).toBe('tenant-platform-1');
    expect(users[0].email).toBe('newuser+test@example.com');

    const memberships = membershipRepo.__data;
    expect(memberships).toHaveLength(1);
    expect(memberships[0].tenantId).toBe('tenant-platform-1');
    expect(memberships[0].identityId).toBe(result.identityId);
  });

  it('throws 409 IDENTITY_EXISTS when identity with email already exists', async () => {
    const email = 'existing@example.com';
    // Seed an existing identity in the in-memory repo
    identityRepo.__data.push({
      id: 'identity-1',
      email,
      status: 'active',
    } as Identity);

    await expect(svc.register(email, 'Password123!')).rejects.toBeInstanceOf(HttpException);

    try {
      await svc.register(email, 'Password123!');
    } catch (err) {
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(409);
      const body = httpErr.getResponse() as any;
      expect(body.code).toBe('IDENTITY_EXISTS');
      expect(typeof body.message).toBe('string');
    }
  });
}


