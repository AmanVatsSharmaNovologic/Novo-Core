# Clients Submodule

Purpose: Manage OAuth/OIDC clients per tenant.

- Service: `ClientService` (lookup, redirect checks)
- Entity: `Client` (clientId, clientSecretHash?, redirectUris[], postLogoutRedirectUris[], grantTypes[], scopes[], firstParty)
- Used by: `/authorize`, `/token`, `/consent` flows

Subfolders
- [services](./services/README.md)

Changelog
- 2025‑11‑15: Initial README.


