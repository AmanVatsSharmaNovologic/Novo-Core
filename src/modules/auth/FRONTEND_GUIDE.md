## Auth for Front‑End (TL;DR)

Base URLs
- Auth host: `https://auth.novologic.co`
- First‑party apps: `https://app.novologic.co`, `https://invoice.novologic.co`
- Tenancy: use `x-tenant-id: <tenant-uuid>` on API/token calls, or use tenant subdomain `https://{tenant}.novologic.co` so the server can infer the tenant.

### Invite‑only onboarding (recommended)
- Create organisation (admin tool or product UI):
  - `POST https://api.novologic.co/management/orgs` with body `{ slug, name, ownerEmail }`
  - Response includes an owner invite `token` (one-time). Send via email link:
    - `https://api.novologic.co/accept-invite?token=<token>`
- Invite team members:
  - `POST https://api.novologic.co/management/orgs/{tenantId}/invitations` with `{ email, roleName? }` (Bearer access token required)
  - Response includes `token` (send via email).
- Accept invitation:
  - `POST https://api.novologic.co/management/invitations/accept` with `{ token, password }` (creates user in that org and assigns role).

### Endpoints to call (REST)
| Method | Path | Use |
|---|---|---|
| GET | `/.well-known/openid-configuration` | discover endpoints/issuer |
| GET | `/authorize` | start login (OAuth2 code + PKCE) |
| GET | `/login` | interactive login form (if not already signed in) |
| GET | `/consent` | user approves scopes |
| POST | `/token` | exchange `code→{access, id, refresh}` or `refresh` |
| GET | `/userinfo` | read profile with `Authorization: Bearer <access_token>` |
| POST | `/revoke` | revoke a refresh token |

Supported scopes: `openid`, `profile`, `email`, `offline_access`  
Tokens: Access token is a JWT (RS256, `aud=novologic-api`). JWKS: `/jwks.json`.
Claims include `org_id` (active organisation), `sid` (session id), and `roles` within the org.

### Typical SPA (PKCE) flow
1) Create PKCE pair:
```ts
const enc = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const bytes = crypto.getRandomValues(new Uint8Array(32));
const verifier = enc(bytes);
const challenge = enc(await crypto.subtle.digest('SHA-256', bytes));
sessionStorage.setItem('pkce_verifier', verifier);
location.assign(`https://auth.novologic.co/authorize?` + new URLSearchParams({
  client_id: 'app-spa',
  redirect_uri: 'https://app.novologic.co/callback',
  response_type: 'code',
  scope: 'openid profile email offline_access',
  state: crypto.randomUUID(),
  code_challenge: challenge,
  code_challenge_method: 'S256'
}));
```
2) On `/callback?code=...&state=...`:
```ts
const params = new URLSearchParams(location.search);
const body = new URLSearchParams({
  grant_type: 'authorization_code',
  client_id: 'app-spa',
  code: params.get('code')!,
  code_verifier: sessionStorage.getItem('pkce_verifier')!,
  redirect_uri: 'https://app.novologic.co/callback'
});
const r = await fetch('https://auth.novologic.co/token', {
  method: 'POST',
  headers: {'Content-Type':'application/x-www-form-urlencoded','x-tenant-id':'<tenant-uuid>'},
  body
});
const tokens = await r.json(); // access_token, refresh_token, expires_in
sessionStorage.setItem('access_token', tokens.access_token);
```
3) Call APIs:
```ts
await fetch('https://api.novologic.co/v1/resource', {
  headers: { Authorization: `Bearer ${sessionStorage.getItem('access_token')}` }
});
```
4) Refresh:
```ts
const body = new URLSearchParams({ grant_type:'refresh_token', refresh_token: tokens.refresh_token });
const r2 = await fetch('https://auth.novologic.co/token', {
  method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','x-tenant-id':'<tenant-uuid>'}, body
});
const next = await r2.json();
```
First‑party cookies: if your `client.firstParty=true`, `/token` also sets `rt` HttpOnly cookie (`Domain=.novologic.co`, `SameSite=Lax`), so you can refresh without storing the refresh token in JS.

### Error codes (selected)
| Code | Meaning | Where |
|---|---|---|
| `invalid_request` | Missing/invalid parameter | `/authorize`, `/token` |
| `unsupported_grant_type` | Grant not supported | `/token` |
| `INVALID_TOKEN` | Access token invalid/expired | `/userinfo` |

### Notes
- Tenant detection on redirects: If you use `auth.novologic.co` (no tenant subdomain), the server cannot infer tenant from host. Ensure your front‑end adds `x-tenant-id` on API and `/token` calls, or route the user through a tenant subdomain. (We can add `?tenant_id=` to `/authorize` if needed.)
- When refreshing, always include `x-tenant-id` to ensure the new access token carries the correct `org_id`.
- Invite acceptance sets the user password and assigns the invited role. After accepting, perform a standard login (PKCE) and proceed as usual.
- CORS: `*.novologic.co` allowed; send credentials if you rely on `rt` cookie (`credentials: 'include'`).
- Security: keep `access_token` short‑lived; prefer HttpOnly refresh cookie for first‑party apps.

### Useful discovery
```
GET https://auth.novologic.co/.well-known/openid-configuration
GET https://auth.novologic.co/jwks.json
```



