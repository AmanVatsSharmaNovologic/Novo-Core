# GraphQL Service Architecture & Gateway Integration

## Purpose

- Provide a single consolidated GraphQL surface at `/graphql` for:
  - Auth & identity management (users, sessions, org structure, RBAC)
  - Mail & verification flows (email verification status, resend, etc.)
- Keep the schema **service-owned and composable** so it can later plug into a
  federated supergraph or GraphQL gateway that handles cross-service routing
  and primary authentication.

## Service Boundary

- **Owns**
  - User identities, tenants, memberships
  - Sessions (OP sessions, refresh tokens), login attempts
  - Org structure (portfolios, projects, teams, team members)
  - Email verification (tokens, identity emailVerified flags)
- **Does _not_ own**
  - Downstream business domains (billing, tasks, analytics, etc.)
  - Front-end specific view models beyond what is needed for auth/bootstrapping

> Rule of thumb: if the concern is primarily _authentication, authorization, or
> onboarding state_ then it belongs here; otherwise it belongs in a separate
> domain service that the gateway can query/compose.

## Gateway & Federation Strategy

- The future GraphQL gateway (e.g. Apollo Gateway/Supergraph) will:
  - Terminate TLS and perform **primary JWT verification**.
  - Attach tenant/user context claims that this service still validates
    defensively (expiry, revocation, tenant suspension).
  - Route auth-related fields and mutations to this service’s `/graphql`
    endpoint only.
- This service will:
  - Continue to verify and enrich claims (RBAC, tenant status, permissions)
    using `AccessTokenGuard` + `AuthClaimsGuard` + `RequestContext`.
  - Expose **clear ownership** for types:
    - `UserGql`, `SessionGql`, `MeGql`, `OrgGql`, org-structure types
    - Mail/verification types like `EmailVerificationStatus`
  - Avoid leaking internal entities (e.g. raw `Identity`, low-level tables)
    into the public schema.

## Integration Points

- **Inbound**
  - HTTP: `POST /graphql` (NestJS + GraphQL Yoga driver)
  - Auth: bearer tokens / HttpOnly cookies, validated by guards and
    `RequestContextMiddleware`.
  - Tenancy: `TenantResolverService` populates `tenantId` for every request
    (headers, query, or subdomain).
- **Outbound**
  - Database: TypeORM entities under `src/modules/auth/entities/*` and
    `src/modules/mail/entities/*`.
  - Mail: `MailService` + `EmailVerificationService` (SMTP-based).
  - JWKS/crypto: `JwkService` for token verification and rotation.

## Design Guidelines for New GraphQL Fields

- **Schema ownership**
  - New fields that primarily concern auth/RBAC/tenants should be added here
    and clearly documented in the owning module’s `MODULE_DOC.md`.
  - Cross-domain aggregations should be implemented at the gateway layer,
    not by this service calling other microservices synchronously.
- **Security**
  - All sensitive queries/mutations must use `GraphqlAuthGuard` and, where
    applicable, explicit RBAC checks via `RbacService`.
  - Multi-tenant safety:
    - Use `RequestContext.tenantId` as the source of truth.
    - Validate any `tenantId` argument against the context (see
      `ensureTenantScope` helpers in management resolvers).
  - Prefer throwing `AppError` for domain conditions and rely on the global
    `GraphqlExceptionFilter` to map to status codes and structured error
    responses with `code` and `requestId`.
- **Resilience**
  - Prefer domain-specific errors (extending `AppError`) so the gateway and
    front-ends can branch on `code` rather than string messages.
  - Keep resolvers thin: delegate heavy business logic to services in
    `src/modules/*/services`.
  - All resolvers should rely on the global filters/guards (`GraphqlExceptionFilter`,
    `GqlThrottlerGuard`, `GraphqlAuthGuard`) instead of doing ad-hoc logging
    or rate-limiting.

## Example: How the Gateway Will See This Service

```mermaid
flowchart LR
  subgraph Gateway[GraphQL Gateway / Supergraph]
    Client -->|GraphQL| Router
  end

  subgraph AuthService[Auth + GraphQL Service (this repo)]
    Router -->|auth, users, sessions, orgs, mail| GQL[GraphQL @ /graphql]
  end

  GQL --> DB[(Postgres: auth + mail schemas)]
  GQL --> Mail[Mail providers (SMTP)]
```


