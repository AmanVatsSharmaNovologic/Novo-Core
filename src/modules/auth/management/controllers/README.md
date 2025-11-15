# Management Controllers

REST endpoints for managing organisations and RBAC within a tenant scope.

Files
- `orgs.controller.ts`: Create organisations and seed owner invitation.
- `invitations.controller.ts`: Create/accept invitations.
- `roles.controller.ts`: Create roles; assign permissions to roles.
- `permissions.controller.ts`: Create permissions.

Guards
- AccessTokenGuard (JWT verification)
- TenantGuard (tenant scope enforcement)

Changelog
- 2025‑11‑15: Initial README.


