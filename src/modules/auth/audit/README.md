# Audit Submodule

Purpose: Persist structured audit events for authentication and management actions.

- Service: `AuditService` (logEvent)
- Entity: `AuditEvent` (tenantId, actorId, type, resource, metadata, createdAt)
- Typical events: login.success, login.failure, token.exchange, token.refresh, token.revoke, consent.approved/denied

See also:
- [entities](../entities/README.md)

Changelog
- 2025‑11‑15: Initial README.


