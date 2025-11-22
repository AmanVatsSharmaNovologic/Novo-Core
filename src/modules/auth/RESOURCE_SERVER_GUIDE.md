## Resource Server Guide (Node/NestJS)

This guide explains how **Node/NestJS microservices** can validate access tokens
issued by the Auth module and consume their claims (`sub`, `org_id`, `roles`,
`permissions`, etc.) without calling back into the Auth service.

---

## 1. Discovery & configuration

- **Issuer / base URL**: `https://api.novologic.co`
- **JWKS endpoint**: `https://api.novologic.co/jwks.json`
- **Expected audience**: `novologic-api`

Every resource service should be configured with:

- `AUTH_ISSUER_URL=https://api.novologic.co`
- `AUTH_JWKS_URL=https://api.novologic.co/jwks.json`
- `AUTH_EXPECTED_AUD=novologic-api`

---

## 2. Access token claim shape (summary)

User access tokens (browser or API clients on behalf of a user) contain:

- `sub: string` – user ID
- `org_id?: string` – active tenant/organisation ID
- `sid?: string` – session ID
- `roles?: string[]` – role names within the tenant
- `permissions?: string[]` – effective permission keys (DB-derived snapshot)
- `scope?: string` – OAuth2 scopes (space-separated)
- `iss: string` – issuer (`https://api.novologic.co`)
- `aud: string | string[]` – must include `novologic-api`
- `exp`, `iat`, `nbf` – standard JWT timestamps

Client-credentials tokens (machine-to-machine) contain:

- `sub: string` – `client:<clientId>`
- `org_id?: string` – tenant ID
- `scope?: string` – granted scopes
- `grant: 'client_credentials'`
- `azp: string` – authorized party (`clientId`)
- Standard `iss`, `aud`, `exp`, `iat`

Permissions in the JWT are **cached** for the lifetime of the access token
(≈5 minutes). The Auth service’s RBAC database remains the source of truth.

---

## 3. Verifying tokens in a NestJS microservice

You can either:

- Reuse the existing `JwkService` and `AccessTokenGuard` pattern; or
- Implement a small local guard using `jose` and the JWKS URL.

### 3.1 Minimal NestJS guard using jose

Install `jose` in your microservice and create a guard:

```ts
// auth/access-token.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JWKS, jwtVerify } from 'jose';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private jwks = JWKS.asKeyStore({ keys: [] as any[] });
  private jwksUrl = process.env.AUTH_JWKS_URL!;
  private issuer = process.env.AUTH_ISSUER_URL!;
  private audience = process.env.AUTH_EXPECTED_AUD || 'novologic-api';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = auth.slice('Bearer '.length);

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      req.user = payload;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
```

Then apply it globally or per-controller using Nest’s `APP_GUARD` or
`@UseGuards(AccessTokenGuard)` decorators.

---

## 4. Consuming claims (roles & permissions)

Within your controllers/services, you can read the JWT payload from
`req.user` (or from GraphQL context) and apply authorization logic:

```ts
// example controller snippet
@Get('/projects')
@UseGuards(AccessTokenGuard)
async listProjects(@Req() req: any) {
  const user = req.user as {
    sub: string;
    org_id?: string;
    roles?: string[];
    permissions?: string[];
  };

  const tenantId = user.org_id;
  if (!tenantId) {
    throw new ForbiddenException('Missing tenant context');
  }

  // Example: simple permission check
  if (!user.permissions?.includes('project:read')) {
    throw new ForbiddenException('Missing project:read permission');
  }

  // ...load and return tenant-scoped projects...
}
```

For machine tokens (`client_credentials`), check `sub` (starts with
`client:`), `scope`, and `grant === 'client_credentials'` instead of
`permissions`.

---

## 5. Using /introspect as a fallback

If a given microservice cannot manage JWKS locally (for example, a very
lightweight worker), it can POST tokens to `/introspect`:

```text
POST https://api.novologic.co/introspect
Content-Type: application/json

{ "token": "<access-token>" }
```

The response includes:

- `active: boolean`
- `sub`, `exp`, `iat`, `iss`, `aud`, `scope`
- `org_id`, `roles`, `permissions` (when present)

This pattern is **less efficient** than local JWT verification and should be
reserved for edge cases or non-Node environments.

---

## 6. Path to a centralized AuthZ service

Today, permissions are:

- Computed inside the Auth module using the RBAC tables; and
- Embedded as `permissions[]` into access tokens for quick checks in
  microservices.

In future, the same RBAC logic can be exposed via a dedicated AuthZ
microservice (HTTP/gRPC). Resource services would then:

- Continue verifying JWTs locally for identity and tenant; and
- Call the AuthZ service when they need live, strongly consistent
  authorization decisions that go beyond the cached `permissions[]`
  in the token.


