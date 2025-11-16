/**
 * @file auth.e2e-flow.spec.ts
 * @module tests/e2e
 * @description End-to-end tests: OIDC code flow, refresh rotation (cookie), client_credentials, introspect/revoke, userinfo
 * @author BharatERP
 * @created 2025-11-16
 */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { SuperAgentTest } from 'supertest';
import { AppModule } from '../src/app.module';
import { seedAuth } from './helpers/auth.seed';

function getCookieValue(setCookies: string[] | undefined, name: string): string | undefined {
  if (!setCookies) return undefined;
  for (const c of setCookies) {
    const [pair] = c.split(';');
    const [k, v] = pair.split('=');
    if (k.trim() === name) return v;
  }
  return undefined;
}

describe('Auth Flows (e2e)', () => {
  let app: INestApplication;
  let agent: SuperAgentTest;
  let tenantId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    agent = request.agent(app.getHttpServer());
    const seeded = await seedAuth(app);
    tenantId = seeded.tenant.id;
  });

  it('GraphQL: registerUser mutation creates a user', async () => {
    const email = `new-${Date.now()}@acme.test`;
    const mutation = `
      mutation Register($input: RegisterUserInput!) {
        registerUser(input: $input) { id email status tenantId }
      }
    `;
    const res = await agent
      .post('/graphql')
      .send({
        query: mutation,
        variables: {
          input: {
            tenantId,
            email,
            password: 'Password123!',
          },
        },
      })
      .expect(200);
    expect(res.body.errors).toBeFalsy();
    expect(res.body.data.registerUser.email).toBe(email);
    expect(res.body.data.registerUser.tenantId).toBe(tenantId);
  });

  it('Client Credentials grant issues access token', async () => {
    const basic = Buffer.from('svc-api:supersecret').toString('base64');
    const res = await agent
      .post('/token')
      .set('x-tenant-id', tenantId)
      .set('authorization', `Basic ${basic}`)
      .type('form')
      .send({ grant_type: 'client_credentials', scope: 'read:all' })
      .expect(201);
    expect(res.body.access_token).toBeTruthy();
    expect(res.body.expires_in).toBe(300);
  });

  it('Introspect active token and revoke refresh token chain', async () => {
    // Get a fresh access + refresh by using cookie fallback refresh
    const refresh = await agent
      .post('/token')
      .set('x-tenant-id', tenantId)
      .type('form')
      .send({ grant_type: 'refresh_token' })
      .expect(201);
    const access = refresh.body.access_token as string;
    const refreshToken = refresh.body.refresh_token as string;
    expect(access).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    // Introspect should be active
    const introspect = await agent
      .post('/introspect')
      .set('x-tenant-id', tenantId)
      .send({ token: access, token_type_hint: 'access_token' })
      .expect(200);
    expect(introspect.body.active).toBe(true);

    // Revoke the refresh token chain
    await agent
      .post('/revoke')
      .set('x-tenant-id', tenantId)
      .send({ token: refreshToken, token_type_hint: 'refresh_token' })
      .expect(200);

    // Subsequent refresh should fail
    await agent
      .post('/token')
      .set('x-tenant-id', tenantId)
      .type('form')
      .send({ grant_type: 'refresh_token' })
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });

  it('OIDC authorization code flow with CSRF and cookies', async () => {
    const authorize = await agent
      .get(
        '/authorize?client_id=app-spa&redirect_uri=' +
          encodeURIComponent('https://app.example/callback') +
          '&response_type=code' +
          '&scope=' +
          encodeURIComponent('openid profile email') +
          '&state=xyz' +
          '&code_challenge=plain-chal' +
          '&code_challenge_method=plain',
      )
      .set('x-tenant-id', tenantId)
      .expect(302);
    // Redirect to /login and set CSRF cookie
    const cookies1 = authorize.headers['set-cookie'] as string[] | undefined;
    // Follow to /login GET to ensure csrf cookie present
    const loginGet = await agent
      .get(authorize.headers.location)
      .set('x-tenant-id', tenantId)
      .expect(200);
    const csrfCookie = getCookieValue(loginGet.headers['set-cookie'] as string[] | undefined, 'csrf');
    expect(csrfCookie).toBeTruthy();

    // Submit login (CsrfGuard: pass token via header)
    const loginPost = await agent
      .post('/login')
      .set('x-tenant-id', tenantId)
      .set('x-csrf-token', csrfCookie as string)
      .type('form')
      .send({
        email: 'user@acme.test',
        password: 'Password123!',
        client_id: 'app-spa',
        redirect_uri: 'https://app.example/callback',
        response_type: 'code',
        scope: 'openid profile email',
        state: 'xyz',
        code_challenge: 'plain-chal',
        code_challenge_method: 'plain',
      })
      .expect(302);
    // Should redirect to /consent
    expect(loginPost.headers.location).toContain('/consent');

    // GET consent to fetch csrf
    const consentGet = await agent.get(loginPost.headers.location).set('x-tenant-id', tenantId).expect(200);
    const csrf2 = getCookieValue(consentGet.headers['set-cookie'] as string[] | undefined, 'csrf');
    expect(csrf2).toBeTruthy();

    // Approve consent
    const consentPost = await agent
      .post('/consent')
      .set('x-tenant-id', tenantId)
      .set('x-csrf-token', csrf2 as string)
      .type('form')
      .send({
        decision: 'approve',
        client_id: 'app-spa',
        redirect_uri: 'https://app.example/callback',
        scope: 'openid profile email',
        state: 'xyz',
        code_challenge: 'plain-chal',
        code_challenge_method: 'plain',
      })
      .expect(302);
    const redirectUrl = new URL(consentPost.headers.location);
    expect(redirectUrl.searchParams.get('code')).toBeTruthy();
    const code = redirectUrl.searchParams.get('code') as string;

    // Exchange code for tokens
    const tokenRes = await agent
      .post('/token')
      .set('x-tenant-id', tenantId)
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: 'app-spa',
        code,
        redirect_uri: 'https://app.example/callback',
        code_verifier: 'plain-chal',
      })
      .expect(201);
    expect(tokenRes.body.access_token).toBeTruthy();
    expect(tokenRes.body.refresh_token).toBeTruthy();
    // For first-party client, rt cookie is set
    const rtCookie = getCookieValue(tokenRes.headers['set-cookie'] as string[] | undefined, 'rt');
    expect(rtCookie).toBeTruthy();
  });

  it('Refresh token rotation using rt cookie fallback and reuse detection', async () => {
    // First, ensure we have an rt cookie from prior test by calling /authorize quickly to set flow state if needed
    // Use the existing cookie jar on agent
    // Capture current rt value
    const resBefore = await agent.get('/jwks.json').set('x-tenant-id', tenantId).expect(200);
    const currentRt = getCookieValue(resBefore.headers['set-cookie'] as string[] | undefined, 'rt');
    // Perform refresh with cookie fallback (no refresh_token in body)
    const refresh1 = await agent
      .post('/token')
      .set('x-tenant-id', tenantId)
      .type('form')
      .send({ grant_type: 'refresh_token' })
      .expect(201);
    expect(refresh1.body.access_token).toBeTruthy();
    const newRt = getCookieValue(refresh1.headers['set-cookie'] as string[] | undefined, 'rt');
    expect(newRt).toBeTruthy();
    expect(newRt).not.toEqual(currentRt);

    // Reuse old refresh token must fail
    const reuse = await agent
      .post('/token')
      .set('x-tenant-id', tenantId)
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: currentRt })
      .expect(400);
    expect(reuse.body.code || '').toBeTruthy();
  });
});


