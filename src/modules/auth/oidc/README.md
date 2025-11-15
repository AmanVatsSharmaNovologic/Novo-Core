# OIDC Submodule

Purpose: OAuth2/OIDC endpoints and OP login/consent UIs.

Endpoints
- Discovery `/.well-known/openid-configuration`, JWKS `/jwks.json`
- Authorize `/authorize` (code + PKCE), Consent `/consent`
- Token `/token` (authorization_code, refresh_token, client_credentials)
- UserInfo `/userinfo`, Introspect `/introspect`, Revoke `/revoke`
- OP Session: `/login` issues `op_session` for UI flows

Subfolders
- [controllers](./controllers/README.md)
- [services](./services/README.md)
- [views](./views/README.md)
- [ui](./ui/README.md)

Changelog
- 2025‑11‑15: Initial README.


