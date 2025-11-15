# OIDC Controllers

HTTP controllers that implement OAuth2/OIDC and OP UI endpoints.

Files
- `discovery.controller.ts`, `jwks.controller.ts`
- `authorize.controller.ts`, `consent.controller.ts`, `login.controller.ts`
- `token.controller.ts`, `userinfo.controller.ts`, `introspect.controller.ts`, `revoke.controller.ts`

Notes
- Enforce PKCE (S256), client secret for confidential clients, scope filtering.
- CSRF protection enabled for form posts (login/consent).

Changelog
- 2025‑11‑15: Initial README.


