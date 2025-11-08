import { UserResolverGql } from './user.resolver';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordService } from '../passwords/services/password.service';

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
    const resolver = new UserResolverGql(repo, new PasswordService());
    const out = await resolver.registerUser({
      tenantId: 't-1',
      email: 'alice@example.com',
      password: 'Password123',
    });
    expect(out.id).toBeDefined();
    expect(out.email).toBe('alice@example.com');
  });
});


