# Auth Module (NovoLogic)

- OIDC Provider at `https://auth.novologic.co`
- REST: `/.well-known/openid-configuration`, `/jwks.json`, `/authorize`, `/token`, `/userinfo`, `/introspect`, `/revoke`
- GraphQL management at `/graphql` for tenants and users
- Sessions + refresh rotation, MFA (TOTP), RBAC, audit logging

See also (module docs for front‑end):
- `src/modules/auth/FRONTEND_GUIDE.md`
- `src/modules/auth/MODULE_DOC.md`

Module map
- Root `AuthModule` aggregates: `OidcModule`, `SessionsModule`, `ClientsModule`, `PasswordsModule`, `MfaModule`, `RbacModule`, `TokensModule`, `ManagementModule`, `AuditModule`
- Import once in `AppModule` for all auth capabilities

Mermaid (Session Rotation)
```mermaid
flowchart LR
  Client -->|refresh_token| Token[POST /token]
  Token -->|verify+rotate| DB[(refresh_tokens)]
  Token -->|issue| Access[access_token]
```


