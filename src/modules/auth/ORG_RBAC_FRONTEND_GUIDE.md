## Org, RBAC & Session Management GraphQL Guide (for Next.js / SPA)

This guide describes how front‑end teams (Next.js, SPA) should use the **GraphQL
management API** at `/graphql` for:

- Organisation (tenant) creation.
- Listing organisations for the current user (limited to active tenant for now).
- Managing team members (list, invite).
- Managing roles and permissions.
- Managing user sessions (\"My sessions\" and org-wide security views).

> Login / registration and token flows are covered in `FRONTEND_GUIDE.md`. This
> document focuses only on **orgs + RBAC admin** using GraphQL.

---

## 1. GraphQL endpoint & auth

- **Endpoint**: `POST https://api.novologic.co/graphql`
- **Auth**:
  - Use the same browser session as the OIDC flows:
    - `rt` / `at` HttpOnly cookies set by `/token` (see main frontend guide).
  - All GraphQL calls must send `credentials: 'include'`.
- **Tenant header**:
  - For now, all GraphQL management calls must send:
    - `x-tenant-id: <active-tenant-id>` (usually `NEXT_PUBLIC_TENANT_ID` or the org
      the user has selected via an org switcher).

Recommended client setup (Apollo example):

```ts
// lib/graphql/client.ts
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: `${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/graphql`,
  credentials: 'include',
  headers: () => ({
    'x-tenant-id': window.localStorage.getItem('active_tenant_id')
      ?? process.env.NEXT_PUBLIC_TENANT_ID!,
  }),
});

export const authGqlClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
```

---

## 2. Organisations (Org)

### 2.1 Query: `meOrgs`

Returns the organisations visible in the current context. Today this is limited
to **the active tenant** (driven by `x-tenant-id`), but the shape is future‑proof
for multi‑org users.

```graphql
query MeOrgs {
  meOrgs {
    id
    slug
    name
    status
  }
}
```

Usage pattern:

- Call `MeOrgs` on app boot to resolve the current org’s name/slug for display.
- Later, when multi‑org is enabled, the same query will return multiple orgs.

### 2.2 Mutation: `createOrg`

Creates a new organisation (tenant). This is typically used from:

- An **internal admin console**, or
- A privileged “Create organisation” flow in the main dashboard.

```graphql
mutation CreateOrg($input: CreateOrgInput!) {
  createOrg(input: $input) {
    id
    slug
    name
    status
  }
}
```

Variables:

```json
{
  "input": {
    "slug": "acme",
    "name": "Acme Corporation"
  }
}
```

Notes:

- Requires an authenticated user.
- The caller should have sufficient privileges (usually a platform‑level admin).
- After creating an org, use `inviteMember` (below) to invite an owner/admin.

---

## 3. Team management (members & invitations)

### 3.1 Query: `orgMembers`

Lists members of an organisation with their roles. Scoped by tenant.

```graphql
query OrgMembers($tenantId: ID!) {
  orgMembers(tenantId: $tenantId) {
    userId
    tenantId
    email
    status
    roles
  }
}
```

Typical usage:

- Drive a “Team” page that shows:
  - Member email.
  - Status (active/disabled).
  - Assigned roles within the org.

### 3.2 Mutation: `inviteMember`

Invites a new member to an organisation and returns a **one‑time invite token**.
The frontend (or a backend worker) is responsible for sending the email.

```graphql
mutation InviteMember($input: InviteMemberInput!) {
  inviteMember(input: $input) {
    id
    tenantId
    email
    roleName
    token
    expiresAt
  }
}
```

Variables:

```json
{
  "input": {
    "tenantId": "tenant-uuid",
    "email": "new.user@example.com",
    "roleName": "member"
  }
}
```

Recommendations:

- Treat `token` as **sensitive**:
  - Do not log it to analytics.
  - Use it only to construct a one‑time invite URL, for example:
    - `https://sandbox2.novologic.co/onboarding/accept?token=<token>`
- The invite acceptance flow is already handled by the REST endpoint
  `POST /management/invitations/accept` (see backend docs).

### 3.3 Mutation: `updateMemberRoles`

Assign roles to a member within an organisation.

```graphql
mutation UpdateMemberRoles($input: UpdateMemberRolesInput!) {
  updateMemberRoles(input: $input) {
    userId
    tenantId
    email
    status
    roles
  }
}
```

Variables:

```json
{
  "input": {
    "tenantId": "tenant-uuid",
    "userId": "user-uuid",
    "roleNames": ["admin", "viewer"]
  }
}
```

Notes:

- Caller must have `owner` or `admin` role in the target tenant.
- Use this mutation to implement role‑editing UIs on the “Team” page.

---

## 4. Roles & Permissions (RBAC admin)

### 4.1 Query: `roles`

```graphql
query Roles($tenantId: ID!) {
  roles(tenantId: $tenantId) {
    id
    tenantId
    name
    description
  }
}
```

Use this for a roles listing page or to populate dropdowns in the UI.

### 4.2 Query: `permissions`

```graphql
query Permissions($tenantId: ID!) {
  permissions(tenantId: $tenantId) {
    id
    tenantId
    key
    description
  }
}
```

Typically used by internal admin tooling to understand which permissions exist.
Frontends normally gate features using permissions embedded in JWTs or from
backend APIs, not by reading this list directly.

### 4.3 Mutation: `createRole`

```graphql
mutation CreateRole($input: CreateRoleInput!) {
  createRole(input: $input) {
    id
    tenantId
    name
    description
  }
}
```

Variables:

```json
{
  "input": {
    "tenantId": "tenant-uuid",
    "name": "billing-admin",
    "description": "Can manage billing and invoices"
  }
}
```

### 4.4 Mutation: `updateRolePermissions`

Attach permissions to a role in a tenant. Permission keys must already exist.

```graphql
mutation UpdateRolePermissions($input: UpdateRolePermissionsInput!) {
  updateRolePermissions(input: $input)
}
```

Variables:

```json
{
  "input": {
    "tenantId": "tenant-uuid",
    "roleId": "role-uuid",
    "permissionKeys": ["org:read", "org:write", "billing:manage"]
  }
}
```

If any of the `permissionKeys` are unknown in that tenant, the mutation fails
with an error code `PERMISSIONS_NOT_FOUND`.

---

## 5. Session management (sessions & \"logged in devices\")

### 5.1 Query: `meSessions` (current user)

Use this query to show the current user a list of their active sessions
within the **active tenant** (as determined by `x-tenant-id`). Each session
represents a logical login for a device/browser and includes basic metadata.

```graphql
query MeSessions {
  meSessions {
    id
    tenantId
    userId
    device
    ip
    lastSeenAt
    createdAt
  }
}
```

Typical usage:

- Render a \"My devices\" / \"Active sessions\" table in the account settings
  area of your app.
- Use `lastSeenAt` and `device` / `ip` to show the user where and when each
  session was last active.

### 5.2 Mutation: `revokeSession` (self-service logout from other devices)

To allow a user to sign out a specific session (e.g. \"Log out of this
device\"), call the `revokeSession` mutation with the session id and the
current tenant id. The backend will revoke all refresh tokens for that
session; any further API calls from that device will fail with `INVALID_TOKEN`
and should trigger a local sign-out.

```graphql
mutation RevokeMySession($tenantId: ID!, $sessionId: ID!) {
  revokeSession(
    input: { tenantId: $tenantId, sessionId: $sessionId }
  )
}
```

Notes:

- The current user can only revoke their own sessions. Attempting to revoke a
  session that belongs to another user will return a `FORBIDDEN` error.
- The active browser session will also be revoked if its `sessionId` is
  passed; the frontend should handle the resulting 401/403 by clearing local
  state and redirecting to `/login`.

### 5.3 Admin session management: `userSessions` and `revokeSession`

Org owners/admins can list and revoke sessions for any member in their
tenant. This is useful for security operations (e.g. \"Log out all sessions
for this user\" or \"Terminate suspicious session from IP X\").

```graphql
query UserSessions($input: ListUserSessionsInput!) {
  userSessions(input: $input) {
    id
    tenantId
    userId
    device
    ip
    lastSeenAt
    createdAt
  }
}
```

Where `ListUserSessionsInput` is:

```graphql
input ListUserSessionsInput {
  tenantId: ID!
  userId: ID!
}
```

To revoke a specific session as an admin:

```graphql
mutation RevokeSession($input: RevokeSessionInput!) {
  revokeSession(input: $input)
}
```

Where `RevokeSessionInput` is:

```graphql
input RevokeSessionInput {
  tenantId: ID!
  sessionId: ID!
}
```

Notes:

- The caller must have `owner` or `admin` role in the target tenant; otherwise
  the resolver returns `FORBIDDEN`.
- The `tenantId` in the input must match the `x-tenant-id` header (tenant
  scope is enforced server-side). This prevents cross-tenant access.

---

## 6. Suggested frontend patterns (AI‑friendly)

- **GraphQL client**:
  - Single Apollo client (or similar) configured with:
    - `uri = AUTH_BASE_URL + '/graphql'`
    - `credentials = 'include'`
    - `x-tenant-id` header based on the org switcher.
- **Org switcher**:
  - For now, you can derive the active org from `NEXT_PUBLIC_TENANT_ID` and/or
    the `MeOrgs` query.
  - When multi‑org support expands, `MeOrgs` will return multiple orgs and the
    switcher can be fully dynamic.
- **Feature gating**:
  - Continue to rely primarily on:
    - JWT claims: `roles[]`, `permissions[]`, `scope`.
    - Backend APIs enforcing permissions server‑side.
  - Use GraphQL RBAC queries for **admin tooling** and visualisation of roles,
    not as the primary enforcement layer in the browser.

> For most SPA teams, you can treat this guide as the contract for all
> organisation, RBAC, and session management UIs. Login, registration,
> tokens, and normal API calls remain as defined in `FRONTEND_GUIDE.md`.



