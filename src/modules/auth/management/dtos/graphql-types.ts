/**
* File: src/modules/auth/management/dtos/graphql-types.ts
* Module: modules/auth/management
* Purpose: GraphQL types for management API
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
*/

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TenantGql {
  @Field(() => ID)
  id!: string;

  @Field()
  slug!: string;

  @Field()
  name!: string;

  @Field()
  status!: string;
}

@ObjectType()
export class UserGql {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  email!: string;

  @Field()
  status!: string;
}

/**
 * GraphQL view of an organisation (tenant) for front-end admin UX.
 */
@ObjectType()
export class OrgGql {
  @Field(() => ID)
  id!: string;

  @Field()
  slug!: string;

  @Field()
  name!: string;

  @Field()
  status!: string;
}

@ObjectType()
export class RoleGql {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

@ObjectType()
export class PermissionGql {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  key!: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

/**
 * Combined view of a member within an organisation, suitable for team
 * management UIs (email + roles within a tenant).
 */
@ObjectType()
export class OrgMemberGql {
  @Field(() => ID)
  userId!: string;

  @Field()
  tenantId!: string;

  @Field()
  email!: string;

  @Field()
  status!: string;

  @Field(() => [String])
  roles!: string[];
}

@ObjectType()
export class InvitationResultGql {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  email!: string;

  @Field()
  roleName!: string;

  @Field()
  token!: string;

  @Field()
  expiresAt!: string;
}

/**
 * GraphQL view of a user session for session management UIs.
 */
@ObjectType()
export class SessionGql {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  userId!: string;

  @Field(() => String, { nullable: true })
  device?: string;

  @Field(() => String, { nullable: true })
  ip?: string;

  @Field(() => String, { nullable: true })
  lastSeenAt?: string;

  @Field(() => String)
  createdAt!: string;
}

/**
 * Per-user settings/preferences exposed to front-end via GraphQL.
 * Backed by the User.profile JSON column.
 */
@ObjectType()
export class UserSettingsGql {
  @Field(() => String, { nullable: true })
  timezone?: string;

  @Field(() => String, { nullable: true })
  locale?: string;

  @Field(() => String, { nullable: true })
  theme?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;
}

/**
 * Aggregate \"viewer\" type for dashboard hydration after login.
 */
@ObjectType()
export class MeGql {
  @Field(() => UserGql)
  user!: UserGql;

  @Field(() => OrgGql, { nullable: true })
  org?: OrgGql;

  @Field(() => [String])
  roles!: string[];

  @Field(() => UserSettingsGql, { nullable: true })
  settings?: UserSettingsGql;

  @Field(() => [SessionGql], { nullable: true })
  recentSessions?: SessionGql[];
}



