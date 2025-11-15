# Auth Module Overview

This module implements NovoLogic’s hybrid authentication and authorization stack.

- Protocols: OAuth2/OIDC (code+PKCE, refresh, client_credentials), JWKS
- AuthN: short‑lived JWT access tokens (5m), refresh rotation with reuse detection
- AuthZ: Tenant‑scoped RBAC (roles → permissions), policy/scopes guards
- Admin: GraphQL and REST management surfaces

For details, read the subfolder READMEs below.

## Submodules
- [audit](./audit/README.md): Audit trail persistence and service
- [clients](./clients/README.md): OAuth/OIDC client registry and utilities
- [entities](./entities/README.md): TypeORM entities (tenants, users, roles, permissions, sessions, etc.)
- [management](./management/README.md): Admin APIs (REST + GraphQL) for tenants, users, RBAC
- [mfa](./mfa/README.md): TOTP MFA primitives
- [oidc](./oidc/README.md): OIDC/OAuth endpoints (authorize, token, userinfo, introspect, revoke, login/consent)
- [oidc-provider](./oidc-provider/README.md): Optional embedded oidc-provider adapter
- [passwords](./passwords/README.md): Argon2 password hashing utilities
- [rbac](./rbac/README.md): Guards, decorators, and RBAC/permission resolution
- [sessions](./sessions/README.md): Session and refresh token rotation
- [tokens](./tokens/README.md): JWT signing with JWK rotation

## Quick Links
- Module docs: [MODULE_DOC.md](./MODULE_DOC.md)
- Frontend guide: [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)

## Changelog (docs)
- 2025‑11‑15: Added per‑folder README coverage and enhanced summaries.


