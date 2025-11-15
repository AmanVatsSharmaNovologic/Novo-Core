# Entities

Purpose: Database models for the auth and RBAC domain (TypeORM).

Highlights
- Multi-tenant aware: most entities contain `tenantId` and proper relations with explicit cascades.
- UUID v4 IDs, composite unique constraints for tenant-scoped uniqueness.

Inventory
- `tenant.entity.ts`: Organisations (status, branding)
- `user.entity.ts`: Tenant-scoped users (email unique per tenant)
- `identity.entity.ts`: Global identity model
- `membership.entity.ts`: Links identity to tenant (and optional legacy user)
- `role.entity.ts`, `permission.entity.ts`, `user-role.entity.ts`, `role-permission.entity.ts`
- `client.entity.ts`: OAuth/OIDC client
- `session.entity.ts`, `refresh-token.entity.ts`: Sessions and refresh rotation
- `authorization-code.entity.ts`: OAuth2 code with PKCE
- `key.entity.ts`: JWK metadata (public, privateRef, rotation windows)
- `audit-event.entity.ts`: Audit trail
- `login-attempt.entity.ts`: Failed login counters and lockout windows

Changelog
- 2025‑11‑15: Initial README.


