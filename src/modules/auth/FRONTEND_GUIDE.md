## Auth for Front‑End (Next.js, sandbox2)

### Base URLs

- **Auth/API host**: `https://api.novologic.co`  
  - OIDC endpoints, GraphQL, and product APIs are all served from this host.
- **Current dashboard (Next.js)**: `https://sandbox2.novologic.co`
- **Cookies**:
  - Domain: `.novologic.co`
  - `rt`: HttpOnly refresh token cookie (30 days)
  - `at`: HttpOnly access token cookie (≈5 minutes)
- **Tenancy**:
  - For the main dashboard SPA (`client_id=app-spa` on `sandbox2.novologic.co` / `app.novologic.co`), `/authorize` does **not** require `x-tenant-id`; the auth server resolves the global realm client by `client_id` only.
  - For product APIs and service-to-service calls, use `x-tenant-id: <tenant-uuid>` on `/token` (non-dashboard grants), `/introspect`, `/revoke`, and API calls when not using tenant subdomains.

---

## Endpoints (REST, from Next.js)

- **OIDC / session**
  - `GET https://api.novologic.co/.well-known/openid-configuration`
  - `GET https://api.novologic.co/jwks.json`
  - `GET https://api.novologic.co/authorize`
  - `GET https://api.novologic.co/login`
  - `GET https://api.novologic.co/consent`
  - `POST https://api.novologic.co/token`
  - `GET https://api.novologic.co/userinfo`
  - `POST https://api.novologic.co/introspect`
  - `POST https://api.novologic.co/revoke`

- **Management / onboarding (simplified)**
  - `POST https://api.novologic.co/management/orgs`
  - `POST https://api.novologic.co/management/orgs/{tenantId}/invitations`
  - `POST https://api.novologic.co/management/invitations/accept`

- **Public registration (v1)**
  - `POST https://api.novologic.co/public/register`

**Scopes**: `openid`, `profile`, `email`, `offline_access`  
**Tokens**: Access token is JWT RS256, `aud=novologic-api`, with claims `org_id`, `sid`, `roles`, and a cached `permissions[]` array derived from RBAC.

---

## Next.js env config (sandbox2)

Add (at least) these env vars:

- **Frontend (public)**
  - `NEXT_PUBLIC_AUTH_BASE_URL=https://api.novologic.co`
- `NEXT_PUBLIC_API_BASE_URL=https://api.novologic.co`
- `NEXT_PUBLIC_TENANT_ID=<tenant-uuid>`        # value = Tenant.id from DB (UUID)
- `NEXT_PUBLIC_AUTH_CLIENT_ID=app-spa`
- `NEXT_PUBLIC_AUTH_REDIRECT_URI=https://sandbox2.novologic.co/auth/callback`
- **Backend-only (optional service calls)**
  - `AUTH_CLIENT_ID=app-spa`
  - `AUTH_CLIENT_REDIRECT_URI=https://sandbox2.novologic.co/auth/callback`

---

## PKCE login flow (browser, using cookies)

### 1) Start login from a Next.js page or client component

```ts
// utils/auth/startLogin.ts
export async function startLogin() {
  const authBase = process.env.NEXT_PUBLIC_AUTH_BASE_URL!;

  const enc = (b: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(b)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = enc(bytes);
  const challenge = enc(await crypto.subtle.digest('SHA-256', bytes));

  sessionStorage.setItem('pkce_verifier', verifier);

  const url = new URL('/authorize', authBase);
  url.search = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_AUTH_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    state: crypto.randomUUID(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();

  window.location.assign(url.toString());
}
```

Typical usage in a Next.js page:

```ts
// app/login/page.tsx
'use client';
import { startLogin } from '@/utils/auth/startLogin';

export default function LoginPage() {
  return (
    <button onClick={() => void startLogin()}>
      Sign in
    </button>
  );
}
```

---

## Registration (v1)

For the initial version, registration is a **simple public JSON endpoint** that creates a
global identity and a platform-tenant user for the main dashboard SPA.

- **Endpoint**: `POST https://api.novologic.co/public/register`
- **Auth**: Public (no cookies, no `x-tenant-id` required)
- **Body (JSON)**:

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

- **Validation**:
  - `email` must be a valid email.
  - `password` must be at least 8 characters (backend may tighten policy later).

- **Responses**:
  - `201 Created`:
    - Body: `{ "identityId": "<uuid>", "email": "user@example.com" }`
  - `409 Conflict`:
    - Body (shape): `{ "code": "IDENTITY_EXISTS", "message": "Identity already exists", ... }`
    - Means this email is already registered (via this flow or admin/invitations).

### Example: Next.js sign-up + redirect into login

```ts
// utils/auth/registerAndLogin.ts
export async function registerAndLogin(email: string, password: string) {
  const base = process.env.NEXT_PUBLIC_AUTH_BASE_URL!;

  const res = await fetch(`${base}/public/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (res.status === 409) {
    // Email already registered – surface a friendly message and let user sign in
    return { ok: false, reason: 'exists' as const };
  }

  if (!res.ok) {
    // TODO[SonuRamTODO]: surface server error to user
    return { ok: false, reason: 'error' as const };
  }

  // Registration succeeded – identity is auto-verified/active in this v1.
  // Immediately enter the normal PKCE login flow.
  const { startLogin } = await import('./startLogin');
  void startLogin();

  return { ok: true as const, reason: 'created' as const };
}
```

Usage in a basic sign-up form:

```tsx
// app/signup/page.tsx
'use client';
import * as React from 'react';
import { registerAndLogin } from '@/utils/auth/registerAndLogin';

export default function SignUpPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await registerAndLogin(email, password);
    if (!result.ok) {
      if (result.reason === 'exists') {
        setError('An account with this email already exists. Please sign in.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Create account</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

> Note: A future version will introduce **real email verification** (magic link /
> OTP). For now, the backend auto-verifies the email and marks the identity as
> active immediately after successful registration.

### 2) Handle `/auth/callback` in Next.js

On callback, exchange the `code` for tokens. The server will:

- Return `{ access_token, refresh_token, expires_in }` in JSON.
- Set **HttpOnly cookies**:
  - `rt` (refresh) – 30 days.
  - `at` (access) – 5 minutes.

```ts
// app/auth/callback/page.tsx
'use client';

export default function AuthCallback() {
  React.useEffect(() => {
    async function handle() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      if (!code || !state) return;

      const verifier = sessionStorage.getItem('pkce_verifier');
      if (!verifier) return;

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'app-spa',
        code,
        code_verifier: verifier,
        redirect_uri: 'https://sandbox2.novologic.co/auth/callback',
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID!,
        },
        body,
        credentials: 'include', // important for rt/at cookies
      });

      if (!res.ok) {
        // TODO[SonuRamTODO]: surface error to user
        return;
      }
      const data = await res.json();

      // Optional: keep access token in memory for this tab only (do NOT persist in localStorage)
      window.sessionStorage.setItem('access_token', data.access_token);

      window.location.replace('/'); // or redirect to originally requested page
    }

    void handle();
  }, []);

  return <p>Signing you in…</p>;
}
```

**Important integration notes (pass these to frontend devs):**

- Ensure the redirect URI configured for `client_id=app-spa` in the auth database is **exactly** the same as
  `NEXT_PUBLIC_AUTH_REDIRECT_URI` (including path and protocol). Mismatches will cause the callback to load
  **without** a `code` parameter.
- The `/auth/callback` route **must not** immediately redirect to another page before running `handle()`. If
  your router/layout performs automatic redirects, ensure the code exchange runs **first**.
- Do **not** call `/token` with `grant_type=refresh_token` until **after** this authorization_code exchange has
  succeeded at least once and the backend has set the `rt` cookie. If you see `\"Missing refresh_token\"` from
  `/token`, it means the initial login/callback step has not completed.

---

## Calling APIs from Next.js

### Browser-side (preferred: cookie-based)

- **Pattern**: rely on HttpOnly `at` cookie; always send `credentials: 'include'` and `x-tenant-id`.
- **No need** to manually attach `Authorization` for browser calls.

```ts
// utils/api/fetchJson.ts
export async function fetchJson(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID!,
    },
    credentials: 'include',
  });

  if (res.status === 401 || res.status === 403) {
    // Optionally trigger refresh (see below) then retry
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json();
}
```

### Server-side / API routes (Bearer tokens)

For backend or integration clients, use `client_credentials` or explicit `Authorization: Bearer`:

```ts
// Example: backend job or Next.js Route Handler
const basic = Buffer.from('svc-api:supersecret').toString('base64');
const tokenRes = await fetch('https://api.novologic.co/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    authorization: `Basic ${basic}`,
    'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID!,
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'read:all',
  }),
});
const { access_token } = await tokenRes.json();

const apiRes = await fetch('https://api.novologic.co/v1/resource', {
  headers: { Authorization: `Bearer ${access_token}` },
});
```

---

## Refresh flow (silent, via cookies)

The browser does not need to store the refresh token:

- `/token` with `grant_type=refresh_token`:
  - Reads `refresh_token` from body **or** from `rt` cookie.
  - Rotates refresh token (`rt` cookie updated).
  - Issues new `access_token` and sets new `at` cookie.

```ts
// utils/auth/refresh.ts
export async function refreshIfNeeded() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID!,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token' }),
    credentials: 'include',
  });

  if (!res.ok) {
    // Refresh token invalid / reused – treat as logout
    window.location.assign('/login');
    return null;
  }

  const data = await res.json();
  window.sessionStorage.setItem('access_token', data.access_token);
  return data;
}
```

---

## Logout flow

To log a user out:

- Call `/revoke` with the **refresh token value** (optional for browsers – you can rely on the cookie plus body `token`) and `x-tenant-id`.
- Clear any in-memory access tokens and app state.
- Redirect to a public page.

```ts
// utils/auth/logout.ts
export async function logout() {
  const accessToken = window.sessionStorage.getItem('access_token');
  window.sessionStorage.removeItem('access_token');

  // If you have the refresh token, you can POST it explicitly; otherwise rely on cookie.
  await fetch(`${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID!,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      token_type_hint: 'refresh_token',
      // token: '<optional-refresh-token-value>',
    }),
    credentials: 'include',
  });

  window.location.assign('/login');
}
```

---

## Error codes (selected)

| Code | Meaning | Where |
|---|---|---|
| `invalid_request` | Missing/invalid parameter | `/authorize`, `/token` |
| `unsupported_grant_type` | Grant not supported | `/token` |
| `INVALID_TOKEN` | Access token invalid/expired | `/userinfo` |

---

## Tenant & CORS notes

- **Tenant detection**:
  - For `api.novologic.co` without subdomains, you **must** send `x-tenant-id`.
  - Later, tenant subdomains like `https://acme.novologic.co` can be supported; in that case the backend infers tenant from host.
- **CORS**:
  - Server allows `*.novologic.co`.
  - When relying on `rt`/`at` cookies, always set `credentials: 'include'` on `fetch`.

---

## Discovery helpers

```text
GET https://api.novologic.co/.well-known/openid-configuration
GET https://api.novologic.co/jwks.json
```

> Note: Frontends typically do **not** inspect `permissions[]` directly.
> Instead, they rely on backend APIs to enforce authorization using the
> token’s claims. The permissions array is primarily for backend
> microservices and debugging.

---

## Frontend readiness checklist (for sandbox2)

Before wiring a Next.js app to this auth backend, ensure:

- **Backend**
  - Migrations in `src/migrations` are applied to the target database.
  - At least one active tenant exists and you know its `id` (used as `NEXT_PUBLIC_TENANT_ID`).
  - A first‑party SPA client exists: `clientId=app-spa`, `firstParty=true`, `redirectUris=["https://sandbox2.novologic.co/auth/callback"]`.
  - Environment matches production topology:
    - `PUBLIC_BASE_URL=https://api.novologic.co`
    - `ISSUER_URL=https://api.novologic.co`
    - `COOKIE_DOMAIN=.novologic.co`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=lax` (or `none` if needed)
    - `CORS_ORIGINS` contains `https://sandbox2.novologic.co`.
  - Health and discovery endpoints are reachable from the Next.js environment:
    - `/health`
    - `/.well-known/openid-configuration`
    - `/jwks.json`
- **Frontend**
  - `NEXT_PUBLIC_*` env vars configured as above.
  - Login, callback, refresh, and logout flows implemented using this guide.
  - All `fetch` calls to `api.novologic.co` set `credentials: 'include'` and `x-tenant-id`.

