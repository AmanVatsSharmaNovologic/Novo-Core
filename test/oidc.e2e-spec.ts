/**
* File: test/oidc.e2e-spec.ts
* Module: tests/e2e
* Purpose: E2E tests for OIDC endpoints (JWKS, Discovery)
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Lightweight smoke tests
*/

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('OIDC REST (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/jwks.json (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/jwks.json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('keys');
    expect(Array.isArray(res.body.keys)).toBe(true);
  });

  it('/.well-known/openid-configuration (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/.well-known/openid-configuration');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('issuer');
    expect(res.body).toHaveProperty('jwks_uri');
  });
});


