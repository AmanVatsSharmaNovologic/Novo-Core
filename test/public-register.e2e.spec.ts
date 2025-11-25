/**
 * @file public-register.e2e.spec.ts
 * @module tests/e2e
 * @description HTTP-level tests for POST /public/register (happy path + conflict).
 *              Uses the real Nest app with TypeORM but isolates behavior with unique emails.
 * @author BharatERP
 * @created 2025-11-25
 */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { Identity } from '../src/modules/auth/entities/identity.entity';
import { seedAuth } from './helpers/auth.seed';

describe('Public registration (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let identities: Repository<Identity>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    identities = ds.getRepository(Identity);
    // Ensure base auth state (tenant + app-spa client) exists
    await seedAuth(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a new identity and returns normalized email on first registration', async () => {
    const rawEmail = `NewUser+test@Example.COM`;
    const normalizedEmail = 'newuser+test@example.com';

    const res = await request(app.getHttpServer())
      .post('/public/register')
      .send({ email: rawEmail, password: 'Password123!' })
      .expect(201);

    expect(res.body.identityId).toBeTruthy();
    expect(res.body.email).toBe(normalizedEmail);

    const identity = await identities.findOne({ where: { email: normalizedEmail } });
    expect(identity).toBeTruthy();
    expect(identity?.status).toBe('active');
  });

  it('returns 409 with code=IDENTITY_EXISTS when registering the same email again', async () => {
    const email = `dup-${Date.now()}@example.com`;

    // First registration should succeed
    await request(app.getHttpServer())
      .post('/public/register')
      .send({ email, password: 'Password123!' })
      .expect(201);

    // Second registration with same email (any casing/whitespace) should conflict
    const conflict = await request(app.getHttpServer())
      .post('/public/register')
      .send({ email: ` ${email.toUpperCase()} `, password: 'Password123!' })
      .expect(409);

    expect(conflict.body).toHaveProperty('code', 'IDENTITY_EXISTS');
    expect(typeof conflict.body.message === 'string').toBe(true);
  });
}


