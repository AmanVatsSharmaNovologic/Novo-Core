---
title: Auth Module
description: NovoLogic Auth Service — OIDC Provider + GraphQL Management
updated: 2025-11-08 IST
---

Purpose
- OIDC REST endpoints for all novologic.co subdomains via `https://auth.novologic.co`
- GraphQL management API for tenants, users, roles, clients, policies
- Sessions, refresh rotation, MFA, RBAC, audit logging

Key Endpoints
- REST: /.well-known/openid-configuration, /jwks.json, /authorize, /token, /userinfo, /introspect, /revoke
- GraphQL: /graphql (tenants, users; extend as needed)

Security
- Argon2id passwords; short-lived JWT (RS256); RT rotation with reuse detection
- Rate limiting, CORS for *.novologic.co, CSRF prevention for GraphQL

Data Model
- Tenant, User, Role, Permission, UserRole, RolePermission
- Client, Session, RefreshToken, Key, AuditEvent

Flows
```mermaid
flowchart LR
  A[Login] --> B[Authorize (code+PKCE)]
  B --> C[Token exchange]
  C -->|access_token| D[Frontend/API]
  C -->|refresh_token| E[Session]
  E --> F[Rotate RT on refresh]
  F -->|reuse detection| G[Revoke chain + alert]
```

Changelog
- 2025-11-08: Initial module skeleton, OIDC endpoints (JWKS, Discovery), refresh rotation baseline, management GraphQL, audit logging.


