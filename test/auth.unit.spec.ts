/**
* File: test/auth.unit.spec.ts
* Purpose: Unit tests for core auth services (passwords, auth code, sessions)
*/

import { AuthorizationCodeService } from '../src/modules/auth/oidc/services/authorization-code.service';
import { Repository } from 'typeorm';
import { AuthorizationCode } from '../src/modules/auth/entities/authorization-code.entity';
import { PasswordService } from '../src/modules/auth/passwords/services/password.service';
import { SessionService } from '../src/modules/auth/sessions/services/session.service';
import { Session } from '../src/modules/auth/entities/session.entity';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';

function repoMock<T extends object>() {
  const store: any[] = [];
  return {
    create: (obj: any) => obj,
    save: async (obj: any | any[]) => {
      if (Array.isArray(obj)) {
        obj.forEach(o => store.push(o));
        return obj;
      }
      store.push(obj);
      return obj;
    },
    findOne: async (opts: any) => {
      const where = opts?.where ?? {};
      return store.find(r => Object.keys(where).every(k => (r as any)[k] === (where as any)[k]));
    },
    find: async () => store,
    createQueryBuilder: () => ({
      update: () => ({
        set: () => ({
          where: () => ({
            execute: async () => undefined,
          }),
        }),
      }),
    }),
  } as unknown as Repository<T>;
}

describe('PasswordService', () => {
  it('hashes and verifies password', async () => {
    const svc = new PasswordService();
    const hash = await svc.hashPassword('password123');
    expect(hash).toBeTruthy();
    const ok = await svc.verifyPassword(hash, 'password123');
    expect(ok).toBe(true);
    const bad = await svc.verifyPassword(hash, 'wrong');
    expect(bad).toBe(false);
  });
});

describe('AuthorizationCodeService', () => {
  it('issues and consumes code (S256)', async () => {
    const repo = repoMock<AuthorizationCode>();
    const svc = new AuthorizationCodeService(repo as any);
    const code = await svc.issue({
      tenantId: 't-1',
      userId: 'u-1',
      clientId: 'c-1',
      redirectUri: 'https://app.example/callback',
      scope: 'openid profile',
      codeChallenge: 'P8u6tQ1n0QkW-0',
      codeChallengeMethod: 'plain',
    });
    expect(code).toBeTruthy();
    const consumed = await svc.consume('t-1', 'c-1', code, 'https://app.example/callback', 'P8u6tQ1n0QkW-0');
    expect(consumed.userId).toBe('u-1');
  });
});

describe('SessionService', () => {
  it('issues session and rotates refresh token', async () => {
    const sRepo = repoMock<Session>();
    const rRepo = repoMock<RefreshToken>();
    const svc = new SessionService(sRepo as any, rRepo as any, { warn: () => {}, info: () => {} } as any);
    const { session, refreshToken } = await svc.issueSession({ tenantId: 't1', userId: 'u1' });
    expect(session.id).toBeDefined();
    expect(refreshToken).toBeDefined();
    const rotated = await svc.rotateRefreshToken('t1', refreshToken);
    expect(rotated.refreshToken).toBeDefined();
  });
});


